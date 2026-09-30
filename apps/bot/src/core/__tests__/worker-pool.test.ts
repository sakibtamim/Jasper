import { Client } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadEvents } from '../../utils/event-loader.js';
import logger from '../logger.js';
import workerPool from '../worker-pool.js';

// Mocks
vi.mock('../logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../utils/event-loader.js', () => ({
    loadEvents: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('discord.js', () => {
    const MockClient = vi.fn();
    MockClient.prototype.login = vi.fn().mockResolvedValue('token');
    MockClient.prototype.user = {
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

// Mock configuration
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

describe('WorkerPool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        workerPool.resetBots();
        workerPool.releaseAllWorkers();
    });

    it('should create bots based on config', () => {
        const workers = workerPool.createBots();
        expect(workers).toHaveLength(3);
        expect(workers.find((w) => w.name === 'Jasper')?.role).toBe('controller');
        expect(workers.find((w) => w.name === 'Misty')?.role).toBe('worker');
    });

    it('should never expose token on WorkerState objects', () => {
        const workers = workerPool.createBots();
        for (const worker of workers) {
            // @ts-expect-error - token should not exist on WorkerState
            expect(worker.token).toBeUndefined();
            expect('token' in worker).toBe(false);
            expect(Object.prototype.hasOwnProperty.call(worker, 'token')).toBe(false);
        }
    });

    it('should get the controller', () => {
        workerPool.createBots();
        const controller = workerPool.getController();
        expect(controller).toBeDefined();
        expect(controller?.name).toBe('Jasper');
    });

    it('should allocate a worker', () => {
        workerPool.createBots();
        const worker = workerPool.allocateWorker('guild-1', 'voice-1');
        expect(worker).toBeDefined();
        expect(worker?.busy).toBe(true);
        expect(worker?.guildId).toBe('guild-1');
        expect(worker?.voiceChannelId).toBe('voice-1');
    });

    it('should reuse existing worker in the same channel', () => {
        workerPool.createBots();
        const worker1 = workerPool.allocateWorker('guild-1', 'voice-1');
        const worker2 = workerPool.allocateWorker('guild-1', 'voice-1');
        expect(worker1).toBe(worker2);
    });

    it('should release a worker', () => {
        workerPool.createBots();
        workerPool.allocateWorker('guild-1', 'voice-1');
        workerPool.releaseWorker('voice-1');

        const workers = workerPool.getWorkers();
        const worker = workers.find((w) => w.voiceChannelId === 'voice-1');
        expect(worker).toBeUndefined(); // Should not find any worker with that voice channel

        // Check if any worker is busy
        const busyWorker = workers.find((w) => w.busy);
        expect(busyWorker).toBeUndefined();
    });

    it('should login all bots', async () => {
        workerPool.createBots();
        await workerPool.loginBots();
        // Check if login was called on clients (need access to client mocks, but difficult here without exposing them)
        // We can check logger instead
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Logged in as'));
    });

    describe('getIntentsForRole', () => {
        it('should return only Guilds and GuildVoiceStates for worker in any profile', () => {
            const selfHostedIntents = workerPool.getIntentsForRole('worker', 'self-hosted');
            expect(selfHostedIntents).toEqual([1, 2]); // Guilds (1), GuildVoiceStates (2)

            const hostedIntents = workerPool.getIntentsForRole('worker', 'hosted');
            expect(hostedIntents).toEqual([1, 2]);
        });

        it('should return Guilds, GuildVoiceStates, GuildMessages, and MessageContent for controller in self-hosted profile', () => {
            const intents = workerPool.getIntentsForRole('controller', 'self-hosted');
            expect(intents).toEqual([1, 2, 4, 8]); // Guilds (1), GuildVoiceStates (2), GuildMessages (4), MessageContent (8)
        });

        it('should NOT request MessageContent for controller in hosted profile', () => {
            const intents = workerPool.getIntentsForRole('controller', 'hosted');
            expect(intents).toEqual([1, 2, 4]); // Guilds (1), GuildVoiceStates (2), GuildMessages (4)
            expect(intents).not.toContain(8); // No MessageContent
        });
    });

    describe('createBots with profiles', () => {
        it('should configure controller client without MessageContent in hosted profile', () => {
            workerPool.createBots(undefined, 'hosted');
            // Check that Client constructor was called with the right intents
            const ClientMock = vi.mocked(Client);
            const controllerCall = ClientMock.mock.calls.find((call) => {
                const options = call[0] as { intents: number[] };
                return options.intents.includes(4); // GuildMessages
            });
            expect(controllerCall).toBeDefined();
            const controllerOptions = controllerCall![0] as { intents: number[] };
            expect(controllerOptions.intents).toEqual([1, 2, 4]); // Guilds, GuildVoiceStates, GuildMessages
            expect(controllerOptions.intents).not.toContain(8); // MessageContent omitted

            // Worker calls should only have Guilds and GuildVoiceStates
            const workerCalls = ClientMock.mock.calls.filter((call) => {
                const options = call[0] as { intents: number[] };
                return !options.intents.includes(4);
            });
            expect(workerCalls).toHaveLength(2);
            for (const call of workerCalls) {
                const options = call[0] as { intents: number[] };
                expect(options.intents).toEqual([1, 2]);
            }
        });

        it('should pass worker role to loadEvents during login', async () => {
            workerPool.createBots();
            await workerPool.loginBots();

            const loadEventsMock = vi.mocked(loadEvents);
            expect(loadEventsMock).toHaveBeenCalledWith(expect.anything(), 'Jasper', 'controller');
            expect(loadEventsMock).toHaveBeenCalledWith(expect.anything(), 'Misty', 'worker');
            expect(loadEventsMock).toHaveBeenCalledWith(expect.anything(), 'Tuki', 'worker');
        });
    });
});
