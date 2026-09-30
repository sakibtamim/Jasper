import { RuntimeIdentity } from '@jasper/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { metricsRegistry } from '../../telemetry/metrics.js';
import { clearStructuredLogs, getRecentStructuredLogs } from '../../telemetry/structured-logger.js';
import { ActiveWorkRegistry } from '../active-work-registry.js';
import { ShardLeaseCoordinator } from '../lease-coordinator.js';
import { MemoryShardLeaseStore } from '../memory-lease-store.js';

describe('ShardLeaseCoordinator & CAS Lease Contract (HJ-OSS-11)', () => {
    let store: MemoryShardLeaseStore;
    let activeWorkRegistry: ActiveWorkRegistry;

    const baseIdentity: RuntimeIdentity = {
        profile: 'hosted',
        environment: 'prod-us-east',
        release: 'v1.2.3',
        bootId: 'boot-alpha-111',
        cellId: 'cell-a',
        shardId: 0,
        shardCount: 4,
        applicationCatalogRevision: 42,
        fenceEpoch: 1,
    };

    beforeEach(() => {
        store = new MemoryShardLeaseStore();
        activeWorkRegistry = new ActiveWorkRegistry();
        clearStructuredLogs();
        metricsRegistry.reset();
    });

    it('successfully acquires CAS lease atomically for (environment, shardId)', async () => {
        const coordinator = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: baseIdentity,
            activeWorkRegistry,
            renewalIntervalMs: 10_000,
            leaseTtlMs: 30_000,
        });

        const started = await coordinator.start();
        expect(started).toBe(true);
        expect(coordinator.getState()).toBe('held');
        expect(coordinator.isFenceValid()).toBe(true);

        const lease = coordinator.getLease();
        expect(lease).toBeDefined();
        expect(lease?.environment).toBe('prod-us-east');
        expect(lease?.shardId).toBe(0);
        expect(lease?.shardCount).toBe(4);
        expect(lease?.catalogRevision).toBe(42);
        expect(lease?.fenceEpoch).toBe(1);
        expect(lease?.bootId).toBe('boot-alpha-111');
        expect(lease?.cellId).toBe('cell-a');
        expect(lease?.version).toBe(1);

        const logs = getRecentStructuredLogs();
        expect(logs.some((l) => l.event === 'shard_lease_acquired')).toBe(true);

        await coordinator.stop();
        expect(coordinator.getState()).toBe('stopped');
    });

    it('rejects partial start if another active instance holds the lease', async () => {
        const coordinator1 = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: baseIdentity,
            activeWorkRegistry,
        });
        await coordinator1.start();

        // Second coordinator trying to claim the same (environment, shardId) with different bootId
        const coordinator2 = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: {
                ...baseIdentity,
                bootId: 'boot-beta-222',
            },
            activeWorkRegistry,
        });

        const started2 = await coordinator2.start();
        expect(started2).toBe(false);
        expect(coordinator2.getState()).toBe('unacquired');
        expect(coordinator2.isFenceValid()).toBe(false);

        await coordinator1.stop();
    });

    it('renews lease periodically and increments CAS version', async () => {
        const coordinator = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: baseIdentity,
            activeWorkRegistry,
            renewalIntervalMs: 10_000,
            leaseTtlMs: 30_000,
        });
        await coordinator.start();

        const v1 = coordinator.getLease()?.version;
        expect(v1).toBe(1);

        // Immediate renewal trigger
        const renewed = await coordinator.renew();
        expect(renewed).toBe(true);

        const v2 = coordinator.getLease()?.version;
        expect(v2).toBe(2);

        const logs = getRecentStructuredLogs();
        expect(logs.some((l) => l.event === 'shard_lease_renewed')).toBe(true);

        await coordinator.stop();
    });

    it('detects TTL expiration and interrupts active work markers with fence_loss', async () => {
        const coordinator = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: baseIdentity,
            activeWorkRegistry,
            renewalIntervalMs: 10_000,
            leaseTtlMs: 30_000,
        });
        await coordinator.start();

        // Register active work in the registry
        activeWorkRegistry.registerWork({
            installationId: 'inst-1',
            queueId: 'queue-1',
            guildId: 'guild-1',
            bootId: baseIdentity.bootId,
            fenceEpoch: 1,
            startedAt: new Date(),
        });
        expect(activeWorkRegistry.getCount()).toBe(1);

        // Simulate TTL expiration
        coordinator.expireForTesting();

        // Checking fence validity detects expiry
        const valid = coordinator.isFenceValid();
        expect(valid).toBe(false);
        expect(coordinator.getState()).toBe('expired');

        // Ephemeral queue boundary: active work was interrupted and cleared without claiming resume
        expect(activeWorkRegistry.getCount()).toBe(0);

        const logs = getRecentStructuredLogs();
        expect(logs.some((l) => l.event === 'shard_lease_lost')).toBe(true);
        expect(logs.some((l) => l.event === 'active_work_interrupted')).toBe(true);

        await coordinator.stop();
    });

    it('handles network partition and enables cutover takeover with incremented fence epoch', async () => {
        const coordinator1 = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: baseIdentity,
            activeWorkRegistry,
        });
        await coordinator1.start();
        expect(coordinator1.getFenceEpoch()).toBe(1);

        // Simulate network partition on store
        store.simulatePartition(true);

        const renewSuccess = await coordinator1.renew();
        expect(renewSuccess).toBe(false);
        expect(coordinator1.getState()).toBe('lost');
        expect(coordinator1.isFenceValid()).toBe(false);

        // Partition ends and time advances past TTL
        store.simulatePartition(false);
        store.forceExpire(baseIdentity.environment, baseIdentity.shardId);

        // New node / replacement coordinator takes over
        const coordinator2 = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: {
                ...baseIdentity,
                bootId: 'boot-replacement-333',
            },
            activeWorkRegistry,
        });

        const takeoverSuccess = await coordinator2.start();
        expect(takeoverSuccess).toBe(true);
        expect(coordinator2.getState()).toBe('held');
        // Epoch monotonically increases to protect against zombie split-brain writes
        expect(coordinator2.getFenceEpoch()).toBe(2);

        await coordinator2.stop();
    });

    it('validates observations and rejects stale fence, cell mismatch, and duplicate sequences', async () => {
        const coordinator = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: baseIdentity,
            activeWorkRegistry,
        });
        await coordinator.start();

        // 1. Valid observation
        const obs1 = coordinator.validateObservation({
            cellId: 'cell-a',
            fenceEpoch: 1,
            bootId: 'producer-1',
            sequence: 1,
            type: 'music_track_started',
            receivedAt: new Date(),
        });
        expect(obs1.valid).toBe(true);

        // 2. Stale sequence (sequence <= last seen)
        const obsDuplicateSeq = coordinator.validateObservation({
            cellId: 'cell-a',
            fenceEpoch: 1,
            bootId: 'producer-1',
            sequence: 1,
            type: 'music_track_started',
            receivedAt: new Date(),
        });
        expect(obsDuplicateSeq.valid).toBe(false);
        expect(obsDuplicateSeq.reason).toContain('Stale or duplicate sequence');

        // 3. Ascending sequence for same bootId is valid
        const obs2 = coordinator.validateObservation({
            cellId: 'cell-a',
            fenceEpoch: 1,
            bootId: 'producer-1',
            sequence: 2,
            type: 'music_track_finished',
            receivedAt: new Date(),
        });
        expect(obs2.valid).toBe(true);

        // 4. Stale fence epoch rejected
        const obsStaleFence = coordinator.validateObservation({
            cellId: 'cell-a',
            fenceEpoch: 0,
            bootId: 'producer-2',
            sequence: 1,
            type: 'music_track_started',
            receivedAt: new Date(),
        });
        expect(obsStaleFence.valid).toBe(false);
        expect(obsStaleFence.reason).toContain('Stale fence epoch');

        // 5. Cell mismatch rejected
        const obsCellMismatch = coordinator.validateObservation({
            cellId: 'cell-wrong',
            fenceEpoch: 1,
            bootId: 'producer-2',
            sequence: 1,
            type: 'music_track_started',
            receivedAt: new Date(),
        });
        expect(obsCellMismatch.valid).toBe(false);
        expect(obsCellMismatch.reason).toContain('Cell mismatch');

        // 6. Idempotency key deduplication
        const obsIdempotent1 = coordinator.validateObservation({
            cellId: 'cell-a',
            fenceEpoch: 1,
            bootId: 'producer-3',
            sequence: 1,
            type: 'command_interaction',
            idempotencyKey: 'idem-key-abc',
            receivedAt: new Date(),
        });
        expect(obsIdempotent1.valid).toBe(true);

        const obsIdempotent2 = coordinator.validateObservation({
            cellId: 'cell-a',
            fenceEpoch: 1,
            bootId: 'producer-3',
            sequence: 2,
            type: 'command_interaction',
            idempotencyKey: 'idem-key-abc',
            receivedAt: new Date(),
        });
        expect(obsIdempotent2.valid).toBe(false);
        expect(obsIdempotent2.reason).toContain('Duplicate idempotency key');

        await coordinator.stop();
    });

    it('bounds seenIdempotencyKeys and evicts oldest entries at capacity', async () => {
        const coordinator = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: baseIdentity,
            activeWorkRegistry,
            maxSeenIdempotencyKeys: 3, // Capacity of 3
        });
        await coordinator.start();

        // Add 3 keys
        coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-1',
            sequence: 1,
            type: 'cmd',
            idempotencyKey: 'key-1',
            receivedAt: new Date(),
        });
        coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-1',
            sequence: 2,
            type: 'cmd',
            idempotencyKey: 'key-2',
            receivedAt: new Date(),
        });
        coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-1',
            sequence: 3,
            type: 'cmd',
            idempotencyKey: 'key-3',
            receivedAt: new Date(),
        });

        expect(coordinator.getSeenIdempotencyKeysSize()).toBe(3);

        // Add 4th key -> key-1 is evicted
        coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-1',
            sequence: 4,
            type: 'cmd',
            idempotencyKey: 'key-4',
            receivedAt: new Date(),
        });

        expect(coordinator.getSeenIdempotencyKeysSize()).toBe(3);

        // key-2 and key-3 are still present and rejected
        const dupKey2 = coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-1',
            sequence: 5,
            type: 'cmd',
            idempotencyKey: 'key-2',
            receivedAt: new Date(),
        });
        expect(dupKey2.valid).toBe(false);

        // key-1 was evicted, so it can be accepted again
        const reKey1 = coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-1',
            sequence: 6,
            type: 'cmd',
            idempotencyKey: 'key-1',
            receivedAt: new Date(),
        });
        expect(reKey1.valid).toBe(true);

        await coordinator.stop();
    });

    it('prunes lastSeenSequences entries for obsolete fenceEpochs lower than current', async () => {
        const coordinator = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: {
                ...baseIdentity,
                fenceEpoch: 1,
            },
            activeWorkRegistry,
        });
        await coordinator.start();

        // Record sequences under epoch 1
        coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-x',
            sequence: 10,
            type: 'event',
            receivedAt: new Date(),
        });
        coordinator.validateObservation({
            fenceEpoch: 1,
            bootId: 'boot-y',
            sequence: 20,
            type: 'event',
            receivedAt: new Date(),
        });

        expect(coordinator.getSeenSequencesSize()).toBe(2);

        // Simulate epoch advancement (e.g. topology cutover / renewal at epoch 2)
        store.overrideEpoch(baseIdentity.environment, baseIdentity.shardId, 2);
        await coordinator.renew();
        expect(coordinator.getFenceEpoch()).toBe(2);

        // Validate observation on new epoch 2
        const obsEpoch2 = coordinator.validateObservation({
            fenceEpoch: 2,
            bootId: 'boot-z',
            sequence: 1,
            type: 'event',
            receivedAt: new Date(),
        });
        expect(obsEpoch2.valid).toBe(true);

        // Obsolete sequences from epoch 1 were pruned!
        // Only entries for epoch 2 remain
        expect(coordinator.getSeenSequencesSize()).toBe(1);

        await coordinator.stop();
    });
});
