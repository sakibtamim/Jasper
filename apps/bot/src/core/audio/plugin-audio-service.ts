import {
    AudioSeekResult,
    EnqueueAudioOptions,
    EnqueueAudioTrack,
    PluginAudioEnqueueService,
    Queue,
    Song,
} from '@jasper/types';
import { ChatInputCommandInteraction } from 'discord.js';

import { checkGuildAccess } from '../access-policy.js';
import logger from '../logger.js';
import MusicPlayer from '../music-player.js';
import { getQueue } from './queue-manager.js';

/**
 * Public installation-scoped audio enqueue service for plugins (HJ-OSS-13).
 * Provides stable enqueue, seek, and queue access without relative imports into core/music-player.
 */
export class PluginAudioService implements PluginAudioEnqueueService {
    constructor(private readonly pluginId: string = 'core') {}

    /**
     * Enqueue one or more audio tracks into active or new voice queue.
     * Respects guild access policy, validates requester & permissions, and applies options.
     */
    async enqueue(
        interaction: ChatInputCommandInteraction,
        tracks: EnqueueAudioTrack[],
        sourceName: string = 'Custom Playlist',
        options?: EnqueueAudioOptions,
    ): Promise<void> {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                content: '❌ Audio commands can only be used within a server.',
                ephemeral: true,
            });
            return;
        }

        // Installation access policy guard
        const access = await checkGuildAccess(guildId);
        if (!access) {
            logger.warn(
                `[plugin-audio:${this.pluginId}] Guild ${guildId} denied audio enqueue by access policy`,
            );
            await interaction.reply({
                content: '❌ Server access policy does not permit starting audio playback.',
                ephemeral: true,
            });
            return;
        }

        if (!tracks || tracks.length === 0) {
            await interaction.reply({
                content: '❌ No audio tracks provided to enqueue.',
                ephemeral: true,
            });
            return;
        }

        // Map EnqueueAudioTrack to Song shape expected by MusicPlayer
        const songs: Omit<Song, 'requestedBy' | 'requesterId'>[] = tracks.map((track) => ({
            title: track.title || 'Unknown Title',
            url: track.url,
            durationInSec: track.durationInSec ?? 0,
            thumbnail: track.thumbnail,
            sourceType: track.sourceType ?? 'attachment',
            gain: track.gain ?? options?.gain,
            initialSeek: track.initialSeek,
        }));

        logger.info(
            `[plugin-audio:${this.pluginId}] Enqueueing ${songs.length} tracks from "${sourceName}" for guild ${guildId}`,
        );

        // Delegate to MusicPlayer with options
        await MusicPlayer.enqueueSongs(interaction, songs, sourceName, {
            loopTrack: options?.loopTrack,
            loopQueue: options?.loopQueue,
            shuffle: options?.shuffle,
        });

        // If overall gain is specified in options, ensure active queue gain is also updated
        if (options?.gain !== undefined && interaction.channelId) {
            const queue = this.getQueue(interaction.channelId);
            if (queue) {
                queue.gain = options.gain;
            }
        }
    }

    /**
     * Alias for enqueue to support legacy / convenience usage.
     */
    async enqueueSongs(
        interaction: ChatInputCommandInteraction,
        tracks: EnqueueAudioTrack[],
        sourceName?: string,
        options?: EnqueueAudioOptions,
    ): Promise<void> {
        return this.enqueue(interaction, tracks, sourceName, options);
    }

    /**
     * Seek the current playback position.
     * When given an interaction, validates voice channel and replies to user.
     * When given voiceChannelId and position, performs programmatic seek.
     */
    async seek(interaction: ChatInputCommandInteraction): Promise<void>;
    async seek(voiceChannelId: string, position: number | string): Promise<AudioSeekResult>;
    async seek(
        target: ChatInputCommandInteraction | string,
        position?: number | string,
    ): Promise<AudioSeekResult | void> {
        if (typeof target === 'string') {
            if (position === undefined) {
                throw new Error('Position must be provided when seeking by voiceChannelId.');
            }
            logger.debug(
                `[plugin-audio:${this.pluginId}] Programmatic seek for channel ${target} to position ${position}`,
            );
            return await MusicPlayer.seekQueue(target, position);
        }

        logger.debug(
            `[plugin-audio:${this.pluginId}] Interaction seek requested in guild ${target.guildId}`,
        );
        return await MusicPlayer.seek(target);
    }

    /**
     * Get active queue for voice channel.
     */
    getQueue(voiceChannelId: string): Queue | undefined {
        return getQueue(voiceChannelId);
    }
}

export default PluginAudioService;
