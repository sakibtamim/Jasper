import { DrainState, DrainStatus, WorkInterruptionEvent } from '@jasper/types';

import { metrics } from '../telemetry/metrics.js';
import { emitStructuredLog } from '../telemetry/structured-logger.js';
import { ActiveWorkRegistry } from './active-work-registry.js';
import { DEFAULT_DRAIN_TIMEOUT_MS } from './types.js';

export interface DrainCoordinatorOptions {
    activeWorkRegistry: ActiveWorkRegistry;
    defaultTimeoutMs?: number;
    onForcedDrain?: (interruptedEvents: WorkInterruptionEvent[]) => void;
}

export class DrainCoordinator {
    private activeWorkRegistry: ActiveWorkRegistry;
    private defaultTimeoutMs: number;
    private onForcedDrain?: (interruptedEvents: WorkInterruptionEvent[]) => void;

    private state: DrainState = 'idle';
    private startedAt?: Date;
    private completedAt?: Date;
    private currentTimeoutMs: number = DEFAULT_DRAIN_TIMEOUT_MS;
    private interruptedQueuesCount: number = 0;
    private drainPromise: Promise<DrainStatus> | null = null;
    private timeoutTimer: NodeJS.Timeout | null = null;
    private unsubscribeEmptyListener: (() => void) | null = null;

    constructor(options: DrainCoordinatorOptions) {
        this.activeWorkRegistry = options.activeWorkRegistry;
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;
        this.currentTimeoutMs = this.defaultTimeoutMs;
        this.onForcedDrain = options.onForcedDrain;
    }

    public getStatus(): DrainStatus {
        return {
            state: this.state,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            timeoutMs: this.currentTimeoutMs,
            activeQueuesRemaining: this.activeWorkRegistry.getCount(),
            interruptedQueuesCount: this.interruptedQueuesCount,
        };
    }

    public isDraining(): boolean {
        return this.state !== 'idle';
    }

    public async startDrain(timeoutMs?: number): Promise<DrainStatus> {
        if (this.drainPromise) {
            return this.drainPromise;
        }

        const effectiveTimeout = timeoutMs ?? this.defaultTimeoutMs;
        this.currentTimeoutMs = effectiveTimeout;
        this.state = 'draining';
        this.startedAt = new Date();
        this.completedAt = undefined;
        this.interruptedQueuesCount = 0;

        emitStructuredLog('shard_drain_started', {
            timeoutMs: effectiveTimeout,
            activeQueuesRemaining: this.activeWorkRegistry.getCount(),
            startedAt: this.startedAt.toISOString(),
        });

        this.drainPromise = new Promise<DrainStatus>((resolve) => {
            const startEpoch = Date.now();

            const finishDrain = (forced: boolean) => {
                if (this.timeoutTimer) {
                    clearTimeout(this.timeoutTimer);
                    this.timeoutTimer = null;
                }
                if (this.unsubscribeEmptyListener) {
                    this.unsubscribeEmptyListener();
                    this.unsubscribeEmptyListener = null;
                }

                this.completedAt = new Date();
                const elapsedSeconds = (Date.now() - startEpoch) / 1000;

                if (forced) {
                    this.state = 'forced';
                    const remaining = this.activeWorkRegistry.getCount();
                    const interrupted = this.activeWorkRegistry.interruptAll('drain_timeout');
                    this.interruptedQueuesCount = interrupted.length;

                    emitStructuredLog(
                        'shard_drain_forced',
                        {
                            activeQueuesRemaining: remaining,
                            interruptedCount: this.interruptedQueuesCount,
                            timeoutMs: effectiveTimeout,
                            elapsedSeconds,
                        },
                        'warn',
                    );

                    metrics.drainDuration(elapsedSeconds, 'forced');

                    if (this.onForcedDrain) {
                        this.onForcedDrain(interrupted);
                    }
                } else {
                    this.state = 'drained';

                    emitStructuredLog('shard_drain_completed', {
                        activeQueuesRemaining: 0,
                        elapsedSeconds,
                    });

                    metrics.drainDuration(elapsedSeconds, 'completed');
                }

                resolve(this.getStatus());
            };

            // If already empty, complete immediately
            if (this.activeWorkRegistry.getCount() === 0) {
                finishDrain(false);
                return;
            }

            // Set up bounded timeout timer
            this.timeoutTimer = setTimeout(() => {
                finishDrain(true);
            }, effectiveTimeout);

            // Listen for queue completion
            this.unsubscribeEmptyListener = this.activeWorkRegistry.onWorkEmpty(() => {
                finishDrain(false);
            });
        });

        return this.drainPromise;
    }

    public reset(): void {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }
        if (this.unsubscribeEmptyListener) {
            this.unsubscribeEmptyListener();
            this.unsubscribeEmptyListener = null;
        }
        this.state = 'idle';
        this.startedAt = undefined;
        this.completedAt = undefined;
        this.interruptedQueuesCount = 0;
        this.drainPromise = null;
    }
}
