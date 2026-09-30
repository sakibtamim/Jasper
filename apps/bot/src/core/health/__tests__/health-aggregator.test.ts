import { RuntimeIdentity, WorkerState } from '@jasper/types';
import { Client } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';

import { ActiveWorkRegistry } from '../../sharding/active-work-registry.js';
import { DrainCoordinator } from '../../sharding/drain-coordinator.js';
import { ShardLeaseCoordinator } from '../../sharding/lease-coordinator.js';
import { MemoryShardLeaseStore } from '../../sharding/memory-lease-store.js';
import { HealthAggregator } from '../health-aggregator.js';

describe('HealthAggregator (HJ-OSS-11)', () => {
    let mockController: WorkerState;
    let mockWorkers: WorkerState[];
    let store: MemoryShardLeaseStore;
    let leaseCoordinator: ShardLeaseCoordinator;
    let drainCoordinator: DrainCoordinator;

    const testIdentity: RuntimeIdentity = {
        profile: 'hosted',
        environment: 'prod-cell-1',
        release: 'v1.0.0',
        bootId: 'boot-health-test',
        cellId: 'cell-1',
        shardId: 0,
        shardCount: 2,
        applicationCatalogRevision: 10,
        fenceEpoch: 1,
    };

    beforeEach(async () => {
        store = new MemoryShardLeaseStore();
        const registry = new ActiveWorkRegistry();
        leaseCoordinator = new ShardLeaseCoordinator({
            store,
            runtimeIdentity: testIdentity,
            activeWorkRegistry: registry,
        });
        await leaseCoordinator.start();

        drainCoordinator = new DrainCoordinator({
            activeWorkRegistry: registry,
        });

        mockController = {
            name: 'Jasper',
            role: 'controller',
            busy: false,
            guildId: null,
            voiceChannelId: null,
            client: {
                isReady: () => true,
                user: { tag: 'Jasper#0001' },
            } as unknown as Client,
        };

        mockWorkers = [
            mockController,
            {
                name: 'Worker 1',
                role: 'worker',
                busy: false,
                guildId: null,
                voiceChannelId: null,
                client: {
                    isReady: () => true,
                    user: { tag: 'Worker1#0002' },
                } as unknown as Client,
            },
            {
                name: 'Worker 2',
                role: 'worker',
                busy: false,
                guildId: null,
                voiceChannelId: null,
                client: {
                    isReady: () => true,
                    user: { tag: 'Worker2#0003' },
                } as unknown as Client,
            },
        ];
    });

    it('reports healthy when controller, workers, and fence are all valid and active', async () => {
        const aggregator = new HealthAggregator({
            runtimeIdentity: testIdentity,
            leaseCoordinator,
            drainCoordinator,
            getWorkers: () => mockWorkers,
            getController: () => mockController,
        });

        const report = await aggregator.getInternalHealth();
        expect(report.status).toBe('healthy');
        expect(report.ready).toBe(true);
        expect(report.degraded).toBe(false);
        expect(report.components.controller.status).toBe('healthy');
        expect(report.components.workers.status).toBe('healthy');
        expect(report.components.fence.status).toBe('healthy');
        expect(report.components.drain.status).toBe('healthy');

        const publicReady = await aggregator.getPublicReady();
        expect(publicReady.ready).toBe(true);
        expect(publicReady.statusCode).toBe(200);
        expect(publicReady.payload).toEqual({ status: 'ready' });
    });

    it('reports unready (503) if controller bot is disconnected or missing', async () => {
        mockController.client.isReady = () => false;

        const aggregator = new HealthAggregator({
            runtimeIdentity: testIdentity,
            leaseCoordinator,
            drainCoordinator,
            getWorkers: () => mockWorkers,
            getController: () => mockController,
        });

        const report = await aggregator.getInternalHealth();
        expect(report.status).toBe('unhealthy');
        expect(report.ready).toBe(false);
        expect(report.components.controller.status).toBe('unhealthy');

        const publicReady = await aggregator.getPublicReady();
        expect(publicReady.ready).toBe(false);
        expect(publicReady.statusCode).toBe(503);
        expect(publicReady.payload).toEqual({ status: 'unready' });
    });

    it('reports degraded (200) when controller is ready but partial workers are lost', async () => {
        // One worker offline, one online
        mockWorkers[1].client.isReady = () => true;
        mockWorkers[2].client.isReady = () => false;

        const aggregator = new HealthAggregator({
            runtimeIdentity: testIdentity,
            leaseCoordinator,
            drainCoordinator,
            getWorkers: () => mockWorkers,
            getController: () => mockController,
        });

        const report = await aggregator.getInternalHealth();
        expect(report.status).toBe('degraded');
        expect(report.ready).toBe(true);
        expect(report.degraded).toBe(true);
        expect(report.components.workers.status).toBe('degraded');

        // Degraded is still ready for public traffic
        const publicReady = await aggregator.getPublicReady();
        expect(publicReady.ready).toBe(true);
        expect(publicReady.statusCode).toBe(200);
        expect(publicReady.payload).toEqual({ status: 'ready' });
    });

    it('reports unready (503) if all client logins fail', async () => {
        mockController.client.isReady = () => false;
        mockWorkers[1].client.isReady = () => false;
        mockWorkers[2].client.isReady = () => false;

        const aggregator = new HealthAggregator({
            runtimeIdentity: testIdentity,
            leaseCoordinator,
            drainCoordinator,
            getWorkers: () => mockWorkers,
            getController: () => mockController,
        });

        const report = await aggregator.getInternalHealth();
        expect(report.ready).toBe(false);
        expect(report.status).toBe('unhealthy');

        const publicReady = await aggregator.getPublicReady();
        expect(publicReady.ready).toBe(false);
        expect(publicReady.statusCode).toBe(503);
    });

    it('reports unready (503) when shard fence is stale or expired', async () => {
        leaseCoordinator.expireForTesting();

        const aggregator = new HealthAggregator({
            runtimeIdentity: testIdentity,
            leaseCoordinator,
            drainCoordinator,
            getWorkers: () => mockWorkers,
            getController: () => mockController,
        });

        const report = await aggregator.getInternalHealth();
        expect(report.fenceValid).toBe(false);
        expect(report.ready).toBe(false);
        expect(report.status).toBe('unhealthy');

        const publicReady = await aggregator.getPublicReady();
        expect(publicReady.ready).toBe(false);
        expect(publicReady.statusCode).toBe(503);
        expect(publicReady.payload).toEqual({ status: 'unready' });
    });

    it('reports unready (503) when shard is draining to stop admission', async () => {
        // Start drain on drain coordinator
        drainCoordinator.startDrain(10_000);

        const aggregator = new HealthAggregator({
            runtimeIdentity: testIdentity,
            leaseCoordinator,
            drainCoordinator,
            getWorkers: () => mockWorkers,
            getController: () => mockController,
        });

        const report = await aggregator.getInternalHealth();
        expect(report.draining).toBe(true);
        expect(report.ready).toBe(false);
        expect(report.status).toBe('unhealthy');

        const publicReady = await aggregator.getPublicReady();
        expect(publicReady.ready).toBe(false);
        expect(publicReady.statusCode).toBe(503);
    });

    it('public endpoints leak NO sensitive topology or worker counts', async () => {
        const aggregator = new HealthAggregator({
            runtimeIdentity: testIdentity,
            leaseCoordinator,
            drainCoordinator,
            getWorkers: () => mockWorkers,
            getController: () => mockController,
        });

        const live = aggregator.getPublicLive();
        expect(live).toEqual({ status: 'live' });
        expect(Object.keys(live)).toEqual(['status']);

        const ready = await aggregator.getPublicReady();
        expect(ready.payload).toEqual({ status: 'ready' });
        expect(Object.keys(ready.payload)).toEqual(['status']);
    });
});
