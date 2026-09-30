import { beforeEach, describe, expect, it } from 'vitest';

import { metricsRegistry } from '../../telemetry/metrics.js';
import { clearStructuredLogs, getRecentStructuredLogs } from '../../telemetry/structured-logger.js';
import { ActiveWorkRegistry } from '../active-work-registry.js';
import { DrainCoordinator } from '../drain-coordinator.js';

describe('DrainCoordinator & Bounded Drain Contract (HJ-OSS-11)', () => {
    let registry: ActiveWorkRegistry;

    beforeEach(() => {
        registry = new ActiveWorkRegistry();
        clearStructuredLogs();
        metricsRegistry.reset();
    });

    it('immediately completes drain if active work queue is already empty', async () => {
        const drainCoordinator = new DrainCoordinator({
            activeWorkRegistry: registry,
            defaultTimeoutMs: 5000,
        });

        expect(drainCoordinator.getStatus().state).toBe('idle');

        const status = await drainCoordinator.startDrain();
        expect(status.state).toBe('drained');
        expect(status.activeQueuesRemaining).toBe(0);
        expect(status.interruptedQueuesCount).toBe(0);

        const logs = getRecentStructuredLogs();
        expect(logs.some((l) => l.event === 'shard_drain_started')).toBe(true);
        expect(logs.some((l) => l.event === 'shard_drain_completed')).toBe(true);
    });

    it('drains finite active queues gracefully as they finish within timeout', async () => {
        const drainCoordinator = new DrainCoordinator({
            activeWorkRegistry: registry,
            defaultTimeoutMs: 5000,
        });

        // Register 2 active items
        registry.registerWork({
            installationId: 'inst-1',
            queueId: 'q-1',
            guildId: 'g-1',
            bootId: 'boot-1',
            fenceEpoch: 1,
            startedAt: new Date(),
        });
        registry.registerWork({
            installationId: 'inst-2',
            queueId: 'q-2',
            guildId: 'g-2',
            bootId: 'boot-1',
            fenceEpoch: 1,
            startedAt: new Date(),
        });

        expect(registry.getCount()).toBe(2);

        // Start drain in background
        const drainPromise = drainCoordinator.startDrain(2000);
        expect(drainCoordinator.isDraining()).toBe(true);
        expect(drainCoordinator.getStatus().state).toBe('draining');

        // Finish first item
        registry.finishWork('inst-1', 'q-1');
        expect(drainCoordinator.getStatus().state).toBe('draining');

        // Finish second item
        registry.finishWork('inst-2', 'q-2');

        const status = await drainPromise;
        expect(status.state).toBe('drained');
        expect(status.activeQueuesRemaining).toBe(0);
        expect(status.interruptedQueuesCount).toBe(0);

        const logs = getRecentStructuredLogs();
        expect(logs.some((l) => l.event === 'shard_drain_completed')).toBe(true);
        expect(logs.some((l) => l.event === 'shard_drain_forced')).toBe(false);
    });

    it('forces stop and emits scoped interruptions when drain times out', async () => {
        const drainCoordinator = new DrainCoordinator({
            activeWorkRegistry: registry,
            defaultTimeoutMs: 100, // Short timeout for test
        });

        registry.registerWork({
            installationId: 'inst-slow',
            queueId: 'q-slow',
            guildId: 'g-slow',
            bootId: 'boot-1',
            fenceEpoch: 1,
            startedAt: new Date(),
        });

        const status = await drainCoordinator.startDrain(100);

        expect(status.state).toBe('forced');
        expect(status.interruptedQueuesCount).toBe(1);
        expect(status.activeQueuesRemaining).toBe(0); // Markers cleared

        // Active registry is cleared: ephemeral non-resumable boundary
        expect(registry.getCount()).toBe(0);

        const logs = getRecentStructuredLogs();
        expect(logs.some((l) => l.event === 'shard_drain_forced')).toBe(true);
        const interruptedLog = logs.find((l) => l.event === 'active_work_interrupted');
        expect(interruptedLog).toBeDefined();
        expect(interruptedLog?.data.reason).toBe('drain_timeout');
        expect(interruptedLog?.data.installationId).toBe('inst-slow');
    });
});
