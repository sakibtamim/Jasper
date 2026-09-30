import {
    EnqueueAudioOptions,
    EnqueueAudioTrack,
    GuildInstallationContext,
    PluginAudioEnqueueService,
    Queue,
} from '@jasper/types';
import { ChatInputCommandInteraction } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as accessPolicyModule from '../../access-policy.js';
import MusicPlayer from '../../music-player.js';
import { PluginAudioService } from '../plugin-audio-service.js';
import { deleteQueue, getQueue, setQueue } from '../queue-manager.js';

vi.mock('../../logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../music-player.js', () => ({
    default: {
        enqueueSongs: vi.fn(async () => {}),
        seek: vi.fn(async () => {}),
        seekQueue: vi.fn(async () => ({ success: true, position: 42, track: null })),
    },
}));

describe('PluginAudioService (HJ-OSS-13 Contract Tests)', () => {
    let audioService: PluginAudioEnqueueService;
    const mockGuildId = 'guild-audio-123';
    const mockChannelId = 'voice-audio-456';

    const validAccessContext: GuildInstallationContext = {
        guildId: mockGuildId,
        installationId: `local:${mockGuildId}`,
        state: 'active',
        admissionRevision: 1,
        configRevision: 1,
        enabledWorkerIds: new Set(['cat-1']),
        enabledPluginIds: new Set(['garage-band']),
        jasperWeight: 100,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        deleteQueue(mockChannelId);
        audioService = new PluginAudioService('test-plugin');
        vi.spyOn(accessPolicyModule, 'checkGuildAccess').mockResolvedValue(validAccessContext);
    });

    afterEach(() => {
        deleteQueue(mockChannelId);
    });

    const createMockInteraction = (overrides?: Partial<ChatInputCommandInteraction>) => {
        return {
            guildId: mockGuildId,
            channelId: mockChannelId,
            user: {
                id: 'user-789',
                tag: 'BandLeader#0001',
            },
            reply: vi.fn().mockResolvedValue(undefined),
            ...overrides,
        } as unknown as ChatInputCommandInteraction;
    };

    describe('Interface Conformance', () => {
        it('should implement PluginAudioEnqueueService contract methods', () => {
            expect(typeof audioService.enqueue).toBe('function');
            expect(typeof audioService.enqueueSongs).toBe('function');
            expect(typeof audioService.seek).toBe('function');
            expect(typeof audioService.getQueue).toBe('function');
        });
    });

    describe('Requester and Track Mapping Contract', () => {
        it('should map EnqueueAudioTrack fields and attribute interaction requester', async () => {
            const tracks: EnqueueAudioTrack[] = [
                {
                    title: 'Stairway to Heaven',
                    url: 'storage://garage-band/stairway.mp3',
                    durationInSec: 482,
                    thumbnail: 'https://example.com/thumb1.jpg',
                    sourceType: 'attachment',
                    initialSeek: 30,
                    gain: 0.8,
                },
                {
                    title: 'Free Bird',
                    url: 'storage://garage-band/freebird.mp3',
                    durationInSec: 548,
                },
            ];

            const interaction = createMockInteraction();
            await audioService.enqueue(interaction, tracks, 'Classic Rock');

            expect(MusicPlayer.enqueueSongs).toHaveBeenCalledWith(
                interaction,
                [
                    {
                        title: 'Stairway to Heaven',
                        url: 'storage://garage-band/stairway.mp3',
                        durationInSec: 482,
                        thumbnail: 'https://example.com/thumb1.jpg',
                        sourceType: 'attachment',
                        initialSeek: 30,
                        gain: 0.8,
                    },
                    {
                        title: 'Free Bird',
                        url: 'storage://garage-band/freebird.mp3',
                        durationInSec: 548,
                        thumbnail: undefined,
                        sourceType: 'attachment',
                        initialSeek: undefined,
                        gain: undefined,
                    },
                ],
                'Classic Rock',
                expect.any(Object),
            );
        });

        it('should support enqueueSongs alias with identical behavior', async () => {
            const tracks: EnqueueAudioTrack[] = [
                { title: 'Track 1', url: 'https://example.com/1.mp3' },
            ];
            const interaction = createMockInteraction();

            await audioService.enqueueSongs(interaction, tracks, 'My Playlist');
            expect(MusicPlayer.enqueueSongs).toHaveBeenCalledWith(
                interaction,
                expect.arrayContaining([expect.objectContaining({ title: 'Track 1' })]),
                'My Playlist',
                expect.any(Object),
            );
        });
    });

    describe('Ordering and Options Contract', () => {
        it('should preserve FIFO track ordering and pass loop and shuffle options', async () => {
            const tracks: EnqueueAudioTrack[] = [
                { title: 'Track A', url: 'storage://garage-band/a.mp3' },
                { title: 'Track B', url: 'storage://garage-band/b.mp3' },
                { title: 'Track C', url: 'storage://garage-band/c.mp3' },
            ];

            const options: EnqueueAudioOptions = {
                loopTrack: false,
                loopQueue: true,
                shuffle: true,
            };

            const interaction = createMockInteraction();
            await audioService.enqueue(interaction, tracks, 'Ordered Set', options);

            expect(MusicPlayer.enqueueSongs).toHaveBeenCalledWith(
                interaction,
                [
                    expect.objectContaining({ title: 'Track A' }),
                    expect.objectContaining({ title: 'Track B' }),
                    expect.objectContaining({ title: 'Track C' }),
                ],
                'Ordered Set',
                {
                    loopTrack: false,
                    loopQueue: true,
                    shuffle: true,
                },
            );
        });
    });

    describe('Gain Needs Contract', () => {
        it('should fall back to options.gain when track gain is omitted', async () => {
            const tracks: EnqueueAudioTrack[] = [
                { title: 'Track With Explicit Gain', url: 'storage://a.mp3', gain: 1.5 },
                { title: 'Track With Fallback Gain', url: 'storage://b.mp3' },
            ];

            const options: EnqueueAudioOptions = { gain: 0.75 };
            const interaction = createMockInteraction();

            await audioService.enqueue(interaction, tracks, 'Gain Test', options);

            expect(MusicPlayer.enqueueSongs).toHaveBeenCalledWith(
                interaction,
                [
                    expect.objectContaining({ title: 'Track With Explicit Gain', gain: 1.5 }),
                    expect.objectContaining({ title: 'Track With Fallback Gain', gain: 0.75 }),
                ],
                'Gain Test',
                expect.any(Object),
            );
        });

        it('should update active queue gain when options.gain is provided', async () => {
            const mockQueue = {
                voiceChannelId: mockChannelId,
                gain: 1.0,
            } as unknown as Queue;
            setQueue(mockChannelId, mockQueue);

            const tracks: EnqueueAudioTrack[] = [{ title: 'Song', url: 'storage://test.mp3' }];
            const interaction = createMockInteraction();

            await audioService.enqueue(interaction, tracks, 'Gain Update', { gain: 1.25 });

            expect(getQueue(mockChannelId)?.gain).toBe(1.25);
        });
    });

    describe('Error Handling and Safety Guardrails', () => {
        it('should reject execution outside a guild (e.g. DM)', async () => {
            const interaction = createMockInteraction({ guildId: null as unknown as string });
            await audioService.enqueue(interaction, [{ title: 'Song', url: 'storage://test.mp3' }]);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('only be used within a server'),
                    ephemeral: true,
                }),
            );
            expect(MusicPlayer.enqueueSongs).not.toHaveBeenCalled();
        });

        it('should fail closed when guild access policy rejects the guild', async () => {
            vi.spyOn(accessPolicyModule, 'checkGuildAccess').mockResolvedValue(null);

            const interaction = createMockInteraction();
            await audioService.enqueue(interaction, [{ title: 'Song', url: 'storage://test.mp3' }]);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Server access policy does not permit'),
                    ephemeral: true,
                }),
            );
            expect(MusicPlayer.enqueueSongs).not.toHaveBeenCalled();
        });

        it('should reject empty tracks array', async () => {
            const interaction = createMockInteraction();
            await audioService.enqueue(interaction, []);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('No audio tracks provided'),
                    ephemeral: true,
                }),
            );
            expect(MusicPlayer.enqueueSongs).not.toHaveBeenCalled();
        });
    });

    describe('Seek Operations', () => {
        it('should delegate interaction seek to MusicPlayer.seek', async () => {
            const interaction = createMockInteraction();
            await audioService.seek(interaction);

            expect(MusicPlayer.seek).toHaveBeenCalledWith(interaction);
        });

        it('should delegate programmatic seek to MusicPlayer.seekQueue', async () => {
            const result = await audioService.seek(mockChannelId, '1:30');

            expect(MusicPlayer.seekQueue).toHaveBeenCalledWith(mockChannelId, '1:30');
            expect(result).toEqual({ success: true, position: 42, track: null });
        });

        it('should throw error when seeking by voiceChannelId without position', async () => {
            await expect(audioService.seek(mockChannelId)).rejects.toThrow(
                /Position must be provided/,
            );
        });
    });

    describe('Queue Retrieval', () => {
        it('should retrieve active queue from queue manager', () => {
            expect(audioService.getQueue(mockChannelId)).toBeUndefined();

            const mockQueue = { voiceChannelId: mockChannelId } as unknown as Queue;
            setQueue(mockChannelId, mockQueue);

            expect(audioService.getQueue(mockChannelId)).toBe(mockQueue);
        });
    });
});
