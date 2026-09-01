import { Queue } from '@jasper/types';
import { ChatInputCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import musicPlayer from '../../music-player.js';
import * as voiceUtils from '../../utils/voice-utils.js';
import * as playbackEngine from '../playback-engine.js';
import { getQueue, setQueue } from '../queue-manager.js';

vi.mock('../../logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../utils/voice-utils.js', () => ({
    validateInteraction: vi.fn(),
    formatDuration: vi.fn((sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }),
    setVoiceStatus: vi.fn(),
}));

vi.mock('../playback-engine.js', () => ({
    playSong: vi.fn(),
    handleRadio: vi.fn(),
    handleAutoplay: vi.fn(),
}));

describe('musicPlayer.seek', () => {
    const mockVoiceChannelId = 'voice-seek-123';
    const mockGuildId = 'guild-seek-123';
    const mockVoiceChannel = {
        id: mockVoiceChannelId,
        guild: { id: mockGuildId },
    } as unknown as VoiceBasedChannel;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should reject seek if validateInteraction returns null', async () => {
        vi.mocked(voiceUtils.validateInteraction).mockResolvedValue(null);

        const mockInteraction = {
            reply: vi.fn(),
        } as unknown as ChatInputCommandInteraction;

        await musicPlayer.seek(mockInteraction);

        expect(playbackEngine.playSong).not.toHaveBeenCalled();
    });

    it('should reject seek if nothing is currently playing', async () => {
        vi.mocked(voiceUtils.validateInteraction).mockResolvedValue(mockVoiceChannel);

        const mockInteraction = {
            reply: vi.fn(),
        } as unknown as ChatInputCommandInteraction;

        setQueue(mockVoiceChannelId, {
            voiceChannelId: mockVoiceChannelId,
            guildId: mockGuildId,
            nowPlaying: null,
            songs: [],
            player: { stop: vi.fn() },
        } as unknown as Queue);

        await musicPlayer.seek(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: 'There is nothing currently playing to seek in.',
            ephemeral: true,
        });
    });

    it('should reject seek if position string is invalid or exceeds duration', async () => {
        vi.mocked(voiceUtils.validateInteraction).mockResolvedValue(mockVoiceChannel);

        const mockInteraction = {
            options: {
                getString: vi.fn().mockReturnValue('10:00'), // 600s exceeds 180s track
            },
            reply: vi.fn(),
        } as unknown as ChatInputCommandInteraction;

        setQueue(mockVoiceChannelId, {
            voiceChannelId: mockVoiceChannelId,
            guildId: mockGuildId,
            nowPlaying: {
                title: 'Test Song',
                url: 'https://youtube.com/watch?v=123',
                durationInSec: 180,
                requestedBy: 'Tester',
            },
            songs: [],
            player: { stop: vi.fn() },
        } as unknown as Queue);

        await musicPlayer.seek(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.stringContaining('Invalid seek position'),
                ephemeral: true,
            }),
        );
    });

    it('should seek to valid timestamp and call playSong with seekSeconds', async () => {
        vi.mocked(voiceUtils.validateInteraction).mockResolvedValue(mockVoiceChannel);

        const mockStop = vi.fn();
        const mockStreamProcess = { kill: vi.fn() };

        const queue: Queue = {
            voiceChannelId: mockVoiceChannelId,
            guildId: mockGuildId,
            nowPlaying: {
                title: 'Test Song',
                url: 'https://youtube.com/watch?v=123',
                durationInSec: 300,
                requestedBy: 'Tester',
            },
            songs: [],
            player: { stop: mockStop } as unknown as any,
            streamProcess: mockStreamProcess as unknown as any,
        } as unknown as Queue;

        setQueue(mockVoiceChannelId, queue);

        const mockInteraction = {
            options: {
                getString: vi.fn().mockReturnValue('1:30'), // 90 seconds
            },
            deferReply: vi.fn().mockResolvedValue(undefined),
            editReply: vi.fn().mockResolvedValue(undefined),
            reply: vi.fn(),
        } as unknown as ChatInputCommandInteraction;

        await musicPlayer.seek(mockInteraction);

        expect(mockInteraction.deferReply).toHaveBeenCalled();
        expect(mockStreamProcess.kill).toHaveBeenCalledWith('SIGKILL');
        expect(mockStop).toHaveBeenCalledWith(true);
        expect(playbackEngine.playSong).toHaveBeenCalledWith(queue, 90);
        expect(mockInteraction.editReply).toHaveBeenCalledWith(
            expect.stringContaining('Seeked to **1:30** (30%) in **Test Song**'),
        );
    });
});
