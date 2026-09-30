import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    allocateWorker,
    createBots,
    getLease,
    getLeases,
    getWorkers,
    isWorkerBusyInGuild,
    purgeInstallation,
    releaseWorker,
    resetBots,
    selectFelineWithAFR,
} from '../worker-pool.js';

// Mocks
vi.mock('../logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../utils/event-loader.js', () => ({
    loadEvents: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('discord.js', () => {
    const MockClient = vi.fn();
    MockClient.prototype.login = vi.fn().mockResolvedValue('token');
    MockClient.prototype.user = {
        id: 'mock-user-id',
        setPresence: vi.fn(),
    };
    MockClient.prototype.isReady = vi.fn().mockReturnValue(true);

    return {
        Client: MockClient,
        GatewayIntentBits: {
            Guilds: 1,
            GuildVoiceStates: 2,
            GuildMessages: 4,
            MessageContent: 8,
        },
        ActivityType: {
            Custom: 4,
        },
    };
});

vi.mock('../../config/bots.js', () => ({
    default: [
        { name: 'Jasper', role: 'controller', token: 'jasper-token' },
        { name: 'Misty', role: 'worker', token: 'misty-token' },
        { name: 'Tuki', role: 'worker', token: 'tuki-token' },
    ],
}));

vi.mock('../../config/afr-config.js', () => ({
    JASPER_WEIGHT: 0.5,
}));

describe('HJ-OSS-04: Per-Guild AFR Leases & Multi-Guild Concurrency', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetBots();
        createBots();
    });

    it('allows the same worker cat to serve multiple guilds concurrently', () => {
        // Allocate Misty (or any worker) to guild-1
        const worker1 = allocateWorker('guild-1', 'voice-ch-1', {
            excludeWorkerNames: ['Jasper', 'Tuki'], // force Misty
        });
        expect(worker1).toBeDefined();
        expect(worker1?.name).toBe('Misty');
        expect(worker1?.leases.size).toBe(1);
        expect(isWorkerBusyInGuild(worker1!, 'guild-1')).toBe(true);
        expect(isWorkerBusyInGuild(worker1!, 'guild-2')).toBe(false);

        // Allocate Misty to guild-2 concurrently
        const worker2 = allocateWorker('guild-2', 'voice-ch-2', {
            excludeWorkerNames: ['Jasper', 'Tuki'], // force Misty again
        });
        expect(worker2).toBeDefined();
        expect(worker2?.name).toBe('Misty');
        expect(worker2).toBe(worker1); // Same cat instance!

        // Now Misty has 2 concurrent leases
        expect(worker1?.leases.size).toBe(2);
        expect(isWorkerBusyInGuild(worker1!, 'guild-1')).toBe(true);
        expect(isWorkerBusyInGuild(worker1!, 'guild-2')).toBe(true);
        expect(isWorkerBusyInGuild(worker1!, 'guild-3')).toBe(false);

        // Channel IDs are tracked per guild
        expect(worker1?.leases.get('guild-1')?.voiceChannelId).toBe('voice-ch-1');
        expect(worker1?.leases.get('guild-2')?.voiceChannelId).toBe('voice-ch-2');
    });

    it('enforces per-guild exclusivity (never two channels in the same guild for one cat)', () => {
        // Allocate first cat in guild-1
        const cat1 = allocateWorker('guild-1', 'voice-ch-1');
        expect(cat1).toBeDefined();

        // Allocate second channel in guild-1 -> MUST NOT choose cat1 again
        const cat2 = allocateWorker('guild-1', 'voice-ch-2');
        expect(cat2).toBeDefined();
        expect(cat2?.name).not.toBe(cat1?.name);

        // Allocate third channel in guild-1 -> MUST choose the remaining cat
        const cat3 = allocateWorker('guild-1', 'voice-ch-3');
        expect(cat3).toBeDefined();
        expect(cat3?.name).not.toBe(cat1?.name);
        expect(cat3?.name).not.toBe(cat2?.name);

        // Fourth allocation in guild-1 fails because all 3 cats are busy in guild-1
        const cat4 = allocateWorker('guild-1', 'voice-ch-4');
        expect(cat4).toBeNull();
    });

    it('supports candidate retry using excludeWorkerNames when one candidate is rejected', () => {
        // Exclude Jasper and Misty
        const selected = allocateWorker('guild-1', 'voice-ch-1', {
            excludeWorkerNames: ['Jasper', 'Misty'],
        });
        expect(selected).toBeDefined();
        expect(selected?.name).toBe('Tuki');
    });

    it('filters out absent cats during partial installation check', () => {
        const workers = getWorkers();
        const jasper = workers.find((w) => w.name === 'Jasper')!;
        const misty = workers.find((w) => w.name === 'Misty')!;
        const tuki = workers.find((w) => w.name === 'Tuki')!;

        // Simulate partial installation: Jasper and Misty are in guild-X, but Tuki is not
        // @ts-expect-error - injecting mock guilds cache
        jasper.client.guilds = { cache: new Map([['guild-X', {}]]) };
        // @ts-expect-error - injecting mock guilds cache
        misty.client.guilds = { cache: new Map([['guild-X', {}]]) };
        // @ts-expect-error - injecting mock guilds cache
        tuki.client.guilds = { cache: new Map([['guild-OTHER', {}]]) };

        // Allocate in guild-X with jasper excluded: Tuki is not in guild-X, so Misty must be chosen
        const selected = allocateWorker('guild-X', 'voice-ch-1', {
            excludeWorkerNames: ['Jasper'],
        });
        expect(selected).toBeDefined();
        expect(selected?.name).toBe('Misty');

        // Now allocate a second channel in guild-X: only Jasper is remaining
        const selected2 = allocateWorker('guild-X', 'voice-ch-2');
        expect(selected2).toBeDefined();
        expect(selected2?.name).toBe('Jasper');

        // Third channel in guild-X fails because Tuki is absent from guild-X
        const selected3 = allocateWorker('guild-X', 'voice-ch-3');
        expect(selected3).toBeNull();
    });

    it('assigns immutable installationId and incrementing generation on lease creation', () => {
        const worker = allocateWorker('guild-1', 'voice-ch-1', {
            installationId: 'install-abc-123',
            queueId: 'queue-xyz',
        });
        expect(worker).toBeDefined();

        const lease = getLease('guild-1', worker?.name);
        expect(lease).toBeDefined();
        expect(lease?.installationId).toBe('install-abc-123');
        expect(lease?.guildId).toBe('guild-1');
        expect(lease?.voiceChannelId).toBe('voice-ch-1');
        expect(lease?.queueId).toBe('queue-xyz');
        expect(lease?.generation).toBe(1);
        expect(lease?.state).toBe('active');

        // Release worker
        releaseWorker('voice-ch-1', {
            installationId: 'install-abc-123',
            generation: 1,
        });

        // Reallocate to same channel: generation must increment
        const workerAgain = allocateWorker('guild-1', 'voice-ch-1', {
            installationId: 'install-abc-123',
            excludeWorkerNames: getWorkers()
                .filter((w) => w.name !== worker?.name)
                .map((w) => w.name),
        });
        const lease2 = getLease('guild-1', workerAgain?.name);
        expect(lease2?.generation).toBe(2);
    });

    it('ignores stale release callbacks with mismatched generation', () => {
        const worker = allocateWorker('guild-1', 'voice-ch-1', {
            installationId: 'install-gen-test',
        });
        const lease = getLease('guild-1', worker?.name);
        expect(lease?.generation).toBe(1);

        // Attempt stale release with generation 0
        const released = releaseWorker('voice-ch-1', {
            installationId: 'install-gen-test',
            generation: 0,
        });
        expect(released).toBe(false);

        // Verify lease was NOT removed
        expect(isWorkerBusyInGuild(worker!, 'guild-1')).toBe(true);
        expect(worker?.leases.has('guild-1')).toBe(true);

        // Release with valid generation succeeds
        const releasedValid = releaseWorker('voice-ch-1', {
            installationId: 'install-gen-test',
            generation: 1,
        });
        expect(releasedValid).toBe(true);
        expect(isWorkerBusyInGuild(worker!, 'guild-1')).toBe(false);
    });

    it('ignores stale release callbacks with mismatched installationId', () => {
        const worker = allocateWorker('guild-1', 'voice-ch-1', {
            installationId: 'real-install-id',
        });

        // Attempt release with wrong installationId
        const released = releaseWorker('voice-ch-1', {
            installationId: 'fake-install-id',
        });
        expect(released).toBe(false);

        // Verify worker is still busy in guild-1
        expect(isWorkerBusyInGuild(worker!, 'guild-1')).toBe(true);
    });

    it('purges all active leases for an installation and ignores subsequent stale releases', () => {
        // Allocate two workers under install-purge
        const w1 = allocateWorker('guild-1', 'voice-ch-1', {
            installationId: 'install-purge',
            excludeWorkerNames: ['Tuki'],
        });
        const w2 = allocateWorker('guild-1', 'voice-ch-2', {
            installationId: 'install-purge',
            excludeWorkerNames: [w1!.name],
        });

        expect(w1?.leases.size).toBeGreaterThanOrEqual(1);
        expect(w2?.leases.size).toBeGreaterThanOrEqual(1);

        // Purge installation
        purgeInstallation('install-purge');

        // Both leases must be gone
        expect(isWorkerBusyInGuild(w1!, 'guild-1')).toBe(false);
        expect(isWorkerBusyInGuild(w2!, 'guild-1')).toBe(false);
        expect(getLeases('guild-1')).toHaveLength(0);

        // Stale release callback from purged installation should be ignored
        const staleRelease = releaseWorker('voice-ch-1', {
            installationId: 'install-purge',
            generation: 1,
        });
        expect(staleRelease).toBe(false);
    });

    it('maintains worker presence correctly across multi-guild lifecycle', () => {
        const worker = getWorkers().find((w) => w.name === 'Misty')!;
        const setPresenceSpy = vi.spyOn(worker.client.user!, 'setPresence');

        // 1. Acquire first lease in guild-1 -> Presence goes online
        allocateWorker('guild-1', 'voice-ch-1', {
            excludeWorkerNames: ['Jasper', 'Tuki'],
        });
        expect(setPresenceSpy).toHaveBeenCalledWith({
            activities: [{ name: 'Playing music...', type: 4 }],
            status: 'online',
        });
        setPresenceSpy.mockClear();

        // 2. Acquire second lease in guild-2 -> Remains online
        allocateWorker('guild-2', 'voice-ch-2', {
            excludeWorkerNames: ['Jasper', 'Tuki'],
        });
        expect(worker.leases.size).toBe(2);

        // 3. Release guild-1 -> Leases remaining = 1, presence must NOT reset to idle!
        releaseWorker('voice-ch-1', { guildId: 'guild-1' });
        expect(worker.leases.size).toBe(1);
        expect(setPresenceSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ status: 'idle' }),
        );

        // 4. Release guild-2 -> Leases remaining = 0, presence resets to idle!
        releaseWorker('voice-ch-2', { guildId: 'guild-2' });
        expect(worker.leases.size).toBe(0);
        expect(setPresenceSpy).toHaveBeenCalledWith({
            activities: [{ name: 'Waiting for tasks...', type: 4 }],
            status: 'idle',
        });
    });

    describe('AFR Weight and Fallback Semantics', () => {
        it('never probabilistically selects Jasper when jasperWeight is 0 and workers are available', () => {
            const workers = getWorkers();
            for (let i = 0; i < 20; i++) {
                const selected = selectFelineWithAFR(workers, 0);
                expect(selected.role).toBe('worker');
                expect(selected.name).not.toBe('Jasper');
            }
        });

        it('falls back to Jasper when jasperWeight is 0 but no non-Jasper workers are available', () => {
            const workers = getWorkers();
            const jasperOnly = workers.filter((w) => w.role === 'controller');
            expect(jasperOnly).toHaveLength(1);

            const selected = selectFelineWithAFR(jasperOnly, 0);
            expect(selected.name).toBe('Jasper');
            expect(selected.role).toBe('controller');
        });

        it('always selects Jasper when jasperWeight is 1.0 and Jasper is eligible', () => {
            const workers = getWorkers();
            for (let i = 0; i < 20; i++) {
                const selected = selectFelineWithAFR(workers, 1.0);
                expect(selected.name).toBe('Jasper');
            }
        });

        it('converges within statistical tolerance for 0.5 weight over large sample', () => {
            const workers = getWorkers();
            const iterations = 1000;
            let jasperCount = 0;

            for (let i = 0; i < iterations; i++) {
                const selected = selectFelineWithAFR(workers, 0.5);
                if (selected.name === 'Jasper') {
                    jasperCount++;
                }
            }

            const ratio = jasperCount / iterations;
            // 0.5 weight should be between 0.40 and 0.60
            expect(ratio).toBeGreaterThan(0.4);
            expect(ratio).toBeLessThan(0.6);
        });
    });

    describe('Connection Reuse', () => {
        it('reuses existing worker connection and updates lastActivityAt', () => {
            const w1 = allocateWorker('guild-1', 'voice-ch-1');
            const lease1 = getLease('guild-1', w1?.name);
            expect(lease1?.lastActivityAt).toBeDefined();

            // Re-allocate same channel
            const w2 = allocateWorker('guild-1', 'voice-ch-1');
            expect(w2).toBe(w1);
            expect(w1?.leases.size).toBe(1); // No duplicate lease created
        });
    });
});
