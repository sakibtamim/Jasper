import { Queue, WorkerState } from '@jasper/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as voiceUtils from '../../utils/voice-utils.js';
import workerPool from '../../worker-pool.js';
import {
    cleanupWorkerOldQueues,
    clearAllQueues,
    clearGuildQueues,
    deleteQueue,
    getAllQueues,
    getQueue,
    setQueue,
} from '../queue-manager.js';

// Mocks
vi.mock('../../safety/operational-safety.js', () => ({
    getOperationalSafetyManager: vi.fn(() => ({
        releaseQueue: vi.fn(),
    })),
}));

vi.mock('../../utils/voice-utils.js', () => ({
    setVoiceStatus: vi.fn(),
}));

vi.mock('../../worker-pool.js', () => ({
    default: {
        releaseWorker: vi.fn(),
    },
}));

vi.mock('../../logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('QueueManager', () => {
    const mockVoiceChannelId = 'voice-123';
    const mockGuildId = 'guild-123';

    const mockQueue: Queue = {
        voiceChannelId: mockVoiceChannelId,
        guildId: mockGuildId,
        textChannel: null,
        connection: {
            destroy: vi.fn(),
        } as unknown as import('@discordjs/voice').VoiceConnection,
        player: {
            stop: vi.fn(),
        } as unknown as import('@discordjs/voice').AudioPlayer,
        songs: [],
        nowPlaying: null,
        autoplay: false,
        worker: {
            name: 'TestWorker',
            client: {} as unknown as import('discord.js').Client,
        } as unknown as WorkerState,
        idleTimeout: null,
        stopping: false,
    };

    beforeEach(() => {
        // Clear queues before each test
        const queues = getAllQueues();
        queues.clear();
        vi.clearAllMocks();
    });

    it('should set and get a queue', () => {
        setQueue(mockVoiceChannelId, mockQueue);
        const retrievedQueue = getQueue(mockVoiceChannelId);
        expect(retrievedQueue).toBe(mockQueue);
    });

    it('should return undefined for non-existent queue', () => {
        const retrievedQueue = getQueue('non-existent');
        expect(retrievedQueue).toBeUndefined();
    });

    it('should delete a queue', () => {
        setQueue(mockVoiceChannelId, mockQueue);
        deleteQueue(mockVoiceChannelId);
        const retrievedQueue = getQueue(mockVoiceChannelId);
        expect(retrievedQueue).toBeUndefined();
    });

    it('should get all queues', () => {
        setQueue(mockVoiceChannelId, mockQueue);
        const queues = getAllQueues();
        expect(queues.size).toBe(1);
        expect(queues.get(mockVoiceChannelId)).toBe(mockQueue);
    });

    describe('cleanupWorkerOldQueues', () => {
        it('should cleanup queues associated with a worker', () => {
            setQueue(mockVoiceChannelId, mockQueue);

            // Mock idle timeout
            const mockTimeout = setTimeout(() => {}, 1000);
            mockQueue.idleTimeout = mockTimeout;
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            cleanupWorkerOldQueues(mockQueue.worker);

            expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
            expect(mockQueue.idleTimeout).toBeNull();
            expect(mockQueue.stopping).toBe(true);
            expect(mockQueue.isRadio).toBe(false);
            expect(mockQueue.player.stop).toHaveBeenCalled();
            expect(mockQueue.songs).toEqual([]);
            expect(mockQueue.nowPlaying).toBeNull();
            expect(voiceUtils.setVoiceStatus).toHaveBeenCalledWith(
                mockQueue.worker.client,
                mockVoiceChannelId,
                '',
            );
            expect(mockQueue.connection.destroy).toHaveBeenCalled();
            expect(getQueue(mockVoiceChannelId)).toBeUndefined();
        });

        it('should not cleanup queues for other workers', () => {
            setQueue(mockVoiceChannelId, mockQueue);

            const otherWorker = {
                name: 'OtherWorker',
                client: {} as unknown as import('discord.js').Client,
            } as unknown as WorkerState;

            cleanupWorkerOldQueues(otherWorker);

            expect(getQueue(mockVoiceChannelId)).toBe(mockQueue);
            expect(mockQueue.connection.destroy).not.toHaveBeenCalled();
        });
    });

    describe('clearAllQueues', () => {
        it('should clear all queues and release workers', () => {
            setQueue(mockVoiceChannelId, mockQueue);
            setQueue('voice-456', { ...mockQueue, voiceChannelId: 'voice-456' });

            clearAllQueues();

            expect(getAllQueues().size).toBe(0);
            expect(workerPool.releaseWorker).toHaveBeenCalledTimes(2);
            expect(workerPool.releaseWorker).toHaveBeenCalledWith(mockVoiceChannelId);
            expect(workerPool.releaseWorker).toHaveBeenCalledWith('voice-456');
            expect(mockQueue.connection.destroy).toHaveBeenCalled();
        });
    });

    describe('clearGuildQueues', () => {
        it('should clear queues strictly for the given guild and enforce full teardown', () => {
            const queueInGuild: Queue = {
                ...mockQueue,
                idleTimeout: setTimeout(() => {}, 1000),
                isRadio: true,
                songs: [{ title: 'Track 1' } as unknown as import('@jasper/types').Song],
                nowPlaying: { title: 'Track 0' } as unknown as import('@jasper/types').Song,
                player: { stop: vi.fn() } as unknown as import('@discordjs/voice').AudioPlayer,
                connection: {
                    destroy: vi.fn(),
                } as unknown as import('@discordjs/voice').VoiceConnection,
            };
            const queueOtherGuild: Queue = {
                ...mockQueue,
                voiceChannelId: 'voice-456',
                guildId: 'guild-999',
            };

            setQueue(mockVoiceChannelId, queueInGuild);
            setQueue('voice-456', queueOtherGuild);

            clearGuildQueues(mockGuildId);

            expect(getQueue(mockVoiceChannelId)).toBeUndefined();
            expect(getQueue('voice-456')).toBe(queueOtherGuild);
            expect(queueInGuild.stopping).toBe(true);
            expect(queueInGuild.isRadio).toBe(false);
            expect(queueInGuild.idleTimeout).toBeNull();
            expect(queueInGuild.songs).toEqual([]);
            expect(queueInGuild.nowPlaying).toBeNull();
            expect(queueInGuild.player.stop).toHaveBeenCalled();
            expect(queueInGuild.connection.destroy).toHaveBeenCalled();
            expect(workerPool.releaseWorker).toHaveBeenCalledWith(mockVoiceChannelId, {
                guildId: mockGuildId,
            });
        });
    });
});
