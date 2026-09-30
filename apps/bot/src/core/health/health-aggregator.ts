import { ComponentHealth, HealthReport, RuntimeIdentity, WorkerState } from '@jasper/types';

import { getRuntimeIdentity } from '../../config/env.js';
import { DrainCoordinator } from '../sharding/drain-coordinator.js';
import { ShardLeaseCoordinator } from '../sharding/lease-coordinator.js';
import { metrics } from '../telemetry/metrics.js';
import workerPool from '../worker-pool.js';

export interface HealthAggregatorOptions {
    runtimeIdentity?: RuntimeIdentity;
    leaseCoordinator?: ShardLeaseCoordinator;
    drainCoordinator?: DrainCoordinator;
    getWorkers?: () => WorkerState[];
    getController?: () => WorkerState | undefined;
}

export type HealthCheckFn = () => Promise<ComponentHealth> | ComponentHealth;

export class HealthAggregator {
    private runtimeIdentity: RuntimeIdentity;
    private leaseCoordinator?: ShardLeaseCoordinator;
    private drainCoordinator?: DrainCoordinator;
    private getWorkersFn: () => WorkerState[];
    private getControllerFn: () => WorkerState | undefined;
    private customChecks = new Map<string, HealthCheckFn>();

    constructor(options: HealthAggregatorOptions = {}) {
        this.runtimeIdentity = options.runtimeIdentity ?? getRuntimeIdentity();
        this.leaseCoordinator = options.leaseCoordinator;
        this.drainCoordinator = options.drainCoordinator;
        this.getWorkersFn = options.getWorkers ?? (() => workerPool.getWorkers());
        this.getControllerFn = options.getController ?? (() => workerPool.getController());
    }

    public registerCheck(name: string, check: HealthCheckFn): void {
        this.customChecks.set(name, check);
    }

    public unregisterCheck(name: string): void {
        this.customChecks.delete(name);
    }

    public setLeaseCoordinator(leaseCoordinator: ShardLeaseCoordinator): void {
        this.leaseCoordinator = leaseCoordinator;
    }

    public setDrainCoordinator(drainCoordinator: DrainCoordinator): void {
        this.drainCoordinator = drainCoordinator;
    }

    public getPublicLive(): { status: 'live' } {
        return { status: 'live' };
    }

    public async getInternalHealth(): Promise<HealthReport> {
        const components: Record<string, ComponentHealth> = {};
        const now = new Date();

        // 1. Controller bot check
        const controller = this.getControllerFn();
        const controllerReady = Boolean(controller?.client?.isReady());
        if (!controller) {
            components.controller = {
                name: 'controller',
                status: 'unhealthy',
                message: 'Controller bot instance is not initialized',
                lastCheckedAt: now,
            };
        } else if (!controllerReady) {
            components.controller = {
                name: 'controller',
                status: 'unhealthy',
                message: 'Controller bot is disconnected or not ready',
                lastCheckedAt: now,
            };
        } else {
            components.controller = {
                name: 'controller',
                status: 'healthy',
                lastCheckedAt: now,
                details: {
                    name: controller.name,
                    tag: controller.client?.user?.tag,
                },
            };
        }

        // 2. Worker bots check
        const allWorkers = this.getWorkersFn();
        const nonControllerWorkers = allWorkers.filter((w) => w.role === 'worker');
        const totalWorkers = nonControllerWorkers.length;
        const readyWorkers = nonControllerWorkers.filter((w) =>
            Boolean(w.client?.isReady()),
        ).length;

        if (totalWorkers === 0) {
            components.workers = {
                name: 'workers',
                status: 'healthy',
                message: 'No worker bots configured; operating in single-bot mode',
                lastCheckedAt: now,
                details: { total: 0, ready: 0 },
            };
        } else if (readyWorkers === totalWorkers) {
            components.workers = {
                name: 'workers',
                status: 'healthy',
                lastCheckedAt: now,
                details: { total: totalWorkers, ready: readyWorkers },
            };
        } else if (readyWorkers > 0) {
            // Partial worker loss = degraded
            components.workers = {
                name: 'workers',
                status: 'degraded',
                message: `${totalWorkers - readyWorkers} of ${totalWorkers} worker bots offline`,
                lastCheckedAt: now,
                details: { total: totalWorkers, ready: readyWorkers },
            };
        } else {
            // All workers down
            if (controllerReady) {
                // Controller still healthy, can serve with fallback
                components.workers = {
                    name: 'workers',
                    status: 'degraded',
                    message: 'All worker bots are offline; controller fallback active',
                    lastCheckedAt: now,
                    details: { total: totalWorkers, ready: 0 },
                };
            } else {
                // All logins failed
                components.workers = {
                    name: 'workers',
                    status: 'unhealthy',
                    message: 'All worker bots and controller bot offline',
                    lastCheckedAt: now,
                    details: { total: totalWorkers, ready: 0 },
                };
            }
        }

        // 3. Shard Fence check
        let fenceValid = true;
        if (this.leaseCoordinator) {
            fenceValid = this.leaseCoordinator.isFenceValid();
            const fenceEpoch = this.leaseCoordinator.getFenceEpoch();
            if (fenceValid) {
                components.fence = {
                    name: 'fence',
                    status: 'healthy',
                    lastCheckedAt: now,
                    details: { fenceEpoch, state: this.leaseCoordinator.getState() },
                };
            } else {
                components.fence = {
                    name: 'fence',
                    status: 'unhealthy',
                    message: 'Shard lease fence is invalid, expired, or lost',
                    lastCheckedAt: now,
                    details: { fenceEpoch, state: this.leaseCoordinator.getState() },
                };
            }
        } else {
            components.fence = {
                name: 'fence',
                status: 'healthy',
                message: 'No sharding lease coordinator attached (unfenced)',
                lastCheckedAt: now,
            };
        }

        // 4. Drain status check
        let isDraining = false;
        if (this.drainCoordinator) {
            isDraining = this.drainCoordinator.isDraining();
            const drainStatus = this.drainCoordinator.getStatus();
            if (isDraining) {
                components.drain = {
                    name: 'drain',
                    status: 'unhealthy',
                    message: `Shard is in drain state: ${drainStatus.state}`,
                    lastCheckedAt: now,
                    details: { ...drainStatus },
                };
            } else {
                components.drain = {
                    name: 'drain',
                    status: 'healthy',
                    lastCheckedAt: now,
                };
            }
        }

        // 5. Custom registered checks (e.g. database, plugins)
        for (const [name, check] of this.customChecks.entries()) {
            try {
                const result = await check();
                components[name] = result;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                components[name] = {
                    name,
                    status: 'unhealthy',
                    message,
                    lastCheckedAt: now,
                };
            }
        }

        // Aggregate overall status
        const allBotLoginsFailed = !controllerReady && totalWorkers > 0 && readyWorkers === 0;
        const controllerFailed = !controllerReady;
        const anyUnhealthy = Object.values(components).some((c) => c.status === 'unhealthy');
        const anyDegraded = Object.values(components).some((c) => c.status === 'degraded');

        let ready = true;
        let degraded = false;
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        // Acceptance Criteria:
        // - All client logins failing cannot report ready (unready)
        // - Controller loss is unready
        // - Stale fence stops admission (unready)
        // - Drain stops admission (unready)
        if (allBotLoginsFailed || controllerFailed || !fenceValid || isDraining || anyUnhealthy) {
            ready = false;
            status = 'unhealthy';
            degraded = anyDegraded;
        } else if (anyDegraded) {
            ready = true;
            degraded = true;
            status = 'degraded';
        } else {
            ready = true;
            degraded = false;
            status = 'healthy';
        }

        metrics.setHealthStatus(status);

        return {
            status,
            live: true,
            ready,
            degraded,
            draining: isDraining,
            fenceValid,
            profile: this.runtimeIdentity.profile,
            environment: this.runtimeIdentity.environment,
            release: this.runtimeIdentity.release,
            bootId: this.runtimeIdentity.bootId,
            cellId: this.runtimeIdentity.cellId,
            shardId: this.runtimeIdentity.shardId,
            shardCount: this.runtimeIdentity.shardCount,
            fenceEpoch: this.leaseCoordinator?.getFenceEpoch() ?? this.runtimeIdentity.fenceEpoch,
            components,
        };
    }

    /**
     * Public readiness response.
     * Strictly avoids leaking internal topology publicly.
     */
    public async getPublicReady(): Promise<{
        ready: boolean;
        payload: { status: 'ready' | 'unready' };
        statusCode: 200 | 503;
    }> {
        const report = await this.getInternalHealth();
        if (report.ready) {
            return {
                ready: true,
                payload: { status: 'ready' },
                statusCode: 200,
            };
        } else {
            return {
                ready: false,
                payload: { status: 'unready' },
                statusCode: 503,
            };
        }
    }
}

export const defaultHealthAggregator = new HealthAggregator();
