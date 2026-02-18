import { GuildMember } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import music from '../../music-player.js';
import * as voiceUtils from '../../utils/voice-utils.js';
import * as playbackEngine from '../playback-engine.js';
import * as queueManager from '../queue-manager.js';
import * as trackResolver from '../track-resolver.js';

// Mock DB because queue-manager or other dependencies might import it
vi.mock('../../db/index.js', () => ({
    default: {
        trackPlay: vi.fn(),
        getTopSongs: vi.fn(),
        getTopUsers: vi.fn(),
        getGlobalStats: vi.fn(),
    },
    getDatabase: () => ({
        trackPlay: vi.fn(),
    }),
}));

// Mocks
vi.mock('../../utils/voice-utils.js', () => ({
    validateInteraction: vi.fn(),
    setVoiceStatus: vi.fn(),
    getChannelName: vi.fn().mockResolvedValue('test-channel'),
}));

vi.mock('../track-resolver.js', () => ({
    resolveTrack: vi.fn(),
}));

vi.mock('../playback-engine.js', () => ({
    playSong: vi.fn(),
}));

vi.mock('../../worker-pool.js', () => ({
    default: {
        allocateWorker: vi.fn().mockReturnValue({
            name: 'TestWorker',
            client: {
                channels: {
                    fetch: vi.fn().mockResolvedValue({
                        id: 'voice-123',
                        isVoiceBased: () => true,
                        guild: {
                            id: 'guild-123',
                            voiceAdapterCreator: {},
                        },
                        permissionsFor: () => ({
                            has: () => true,
                        }),
                    }),
                },
                user: { id: 'bot-id' },
            },
        }),
        setWorkerBusy: vi.fn(),
        releaseWorker: vi.fn(),
    },
}));

// Mock logger
vi.mock('../../logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn((msg) => console.error('[MOCK LOGGER ERROR]', msg)),
        warn: vi.fn(),
    },
}));

// Mock Discord.js
vi.mock('discord.js', () => {
    class MockGuildMember {
        voice = {
            channel: {
                id: 'voice-123',
                guild: {
                    id: 'guild-123',
                    voiceAdapterCreator: {},
                },
            },
        };
        id = 'user-123';
    }

    return {
        GuildMember: MockGuildMember,
        ActionRowBuilder: class {},
        ButtonBuilder: class {},
        EmbedBuilder: class {
            setColor() {
                return this;
            }
            setTitle() {
                return this;
            }
            setURL() {
                return this;
            }
            setAuthor() {
                return this;
            }
            setThumbnail() {
                return this;
            }
            setDescription() {
                return this;
            }
            addFields() {
                return this;
            }
            setTimestamp() {
                return this;
            }
            setFooter() {
                return this;
            }
        },
        ButtonStyle: {},
        ComponentType: {},
        SlashCommandBuilder: class {
            setName() {
                return this;
            }
            setDescription() {
                return this;
            }
            addStringOption() {
                return this;
            }
        },
    };
});

// Mock Discord.js stuff
const mockInteraction = {
    user: { id: 'user-123', tag: 'User#1234' },
    guild: { id: 'guild-123' },
    member: new (GuildMember as any)(),
    client: {
        user: { id: 'bot-id' },
    },
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
    channel: {
        isTextBased: () => true,
        isDMBased: () => false,
        send: vi.fn().mockResolvedValue({}),
    },
} as any;

const mockVoiceChannel = {
    id: 'voice-123',
    guild: { id: 'guild-123' },
    permissionsFor: () => ({
        has: () => true,
    }),
} as any;

describe('Queue Insertion Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear real queues
        const queues = queueManager.getAllQueues();
        queues.clear();

        (voiceUtils.validateInteraction as any).mockResolvedValue(mockVoiceChannel);
        (trackResolver.resolveTrack as any).mockResolvedValue({
            title: 'Test Song',
            url: 'http://test.com',
            thumbnail: 'http://thumb.com',
            durationInSec: 120,
        });

        // Mock @discordjs/voice
        vi.mock('@discordjs/voice', () => ({
            joinVoiceChannel: vi.fn().mockReturnValue({
                subscribe: vi.fn(),
                destroy: vi.fn(),
            }),
            createAudioPlayer: vi.fn().mockReturnValue({
                on: vi.fn(),
                play: vi.fn(),
                stop: vi.fn(),
                state: { status: 'idle' },
            }),
            AudioPlayerStatus: { Idle: 'idle' },
            NoSubscriberBehavior: { Play: 'play' },
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should add song to end of queue by default', async () => {
        await music.enqueue(mockInteraction, 'song1');

        const queue = queueManager.getQueue('voice-123');
        expect(queue).toBeDefined();
        expect(queue!.songs).toHaveLength(1);
        expect(queue!.songs[0].title).toBe('Test Song');

        // Add another song
        (trackResolver.resolveTrack as any).mockResolvedValueOnce({
            title: 'Song 2',
            url: 'http://test2.com',
        });
        await music.enqueue(mockInteraction, 'song2');

        expect(queue!.songs).toHaveLength(2);
        expect(queue!.songs[1].title).toBe('Song 2');
    });

    it('should add song to next position when position="next"', async () => {
        // Setup queue with 2 songs
        await music.enqueue(mockInteraction, 'song1'); // Index 0 (playing)

        (trackResolver.resolveTrack as any).mockResolvedValueOnce({
            title: 'Song 2',
            url: 'http://test2.com',
        });
        await music.enqueue(mockInteraction, 'song2'); // Index 1

        const queue = queueManager.getQueue('voice-123');
        expect(queue!.songs).toHaveLength(2);

        // Add Song 3 with position='next'
        (trackResolver.resolveTrack as any).mockResolvedValueOnce({
            title: 'Song 3',
            url: 'http://test3.com',
        });

        await music.enqueue(mockInteraction, 'song3', { position: 'next' });

        expect(queue!.songs).toHaveLength(3);
        expect(queue!.songs[0].title).toBe('Test Song'); // Still playing
        expect(queue!.songs[1].title).toBe('Song 3'); // Inserted next
        expect(queue!.songs[2].title).toBe('Song 2'); // Pushed back
    });

    it('should skip current song when skipCurrent=true', async () => {
        await music.enqueue(mockInteraction, 'song1');
        const queue = queueManager.getQueue('voice-123');

        // Simulate playing
        queue!.nowPlaying = queue!.songs[0];

        (trackResolver.resolveTrack as any).mockResolvedValueOnce({
            title: 'Song 2',
            url: 'http://test2.com',
        });

        await music.enqueue(mockInteraction, 'song2', {
            position: 'next',
            skipCurrent: true,
        });

        expect(queue!.player.stop).toHaveBeenCalled();
        expect(queue!.songs[1].title).toBe('Song 2');
    });
});
