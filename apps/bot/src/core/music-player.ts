import {
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    createAudioPlayer,
    joinVoiceChannel,
} from '@discordjs/voice';
import { WorkerState } from '@jasper/types';
import { Queue, Song } from '@jasper/types';
import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    VoiceBasedChannel,
} from 'discord.js';

import { getEntryMessage } from '../config/afr-config.js';
import { getDevPrefix } from '../utils/dev-mode.js';
import { songAddedEmbed } from '../utils/embed-factory.js';
import { handleAutoplay, handleRadio, playSong } from './audio/playback-engine.js';
import {
    cleanupWorkerOldQueues,
    clearAllQueues,
    deleteQueue,
    getAllQueues,
    getQueue,
    setQueue,
} from './audio/queue-manager.js';
import { fetchPlaylistData } from './audio/stream-handler.js';
import { resolveTrack } from './audio/track-resolver.js';
import logger from './logger.js';
import hookManager from './plugins/hook-manager.js';
import { getAutoplayButton } from './ui/player-controls.js';
import {
    formatDuration,
    getChannelName,
    setVoiceStatus,
    validateInteraction,
} from './utils/voice-utils.js';
import workerPool from './worker-pool.js';

// --- Helpers ---

async function assignWorker(
    interaction: ChatInputCommandInteraction,
    voiceChannel: VoiceBasedChannel,
    isNewConnection: boolean,
): Promise<WorkerState | null> {
    // Allocate a worker
    const worker = workerPool.allocateWorker(interaction.guild!.id, voiceChannel.id);
    if (!worker) {
        await interaction.editReply(
            '🚫 **All members of the Heavenly Council of Fur are currently busy!** Please try again later.',
        );
        return null;
    }

    // Check permissions
    try {
        const workerChannel = await worker.client.channels.fetch(voiceChannel.id);
        if (!workerChannel || !workerChannel.isVoiceBased()) {
            throw new Error('Worker cannot find voice channel');
        }
        const workerPermissions = workerChannel.permissionsFor(worker.client.user!);
        if (
            !workerPermissions ||
            !workerPermissions.has('Connect') ||
            !workerPermissions.has('Speak')
        ) {
            await interaction.editReply(
                `🚫 **${worker.name}** does not have permissions to join your channel!`,
            );
            workerPool.releaseWorker(voiceChannel.id);
            return null;
        }
    } catch {
        await interaction.editReply(
            `🚫 **${worker.name}** cannot access this channel (Is it invited to the server?).`,
        );
        workerPool.releaseWorker(voiceChannel.id);
        return null;
    }

    // Show entry message only for NEW worker connections, not reused ones
    if (
        isNewConnection &&
        interaction.channel &&
        interaction.channel.isTextBased() &&
        !interaction.channel.isDMBased()
    ) {
        const entryMessage = getEntryMessage(worker.name);
        await interaction.channel
            .send(entryMessage)
            .catch((error: unknown) =>
                logger.warn(
                    `[afr] Failed to send entry message: ${error instanceof Error ? error.message : String(error)}`,
                ),
            );
    }

    return worker;
}

async function validateAndCleanupQueue(
    interaction: ChatInputCommandInteraction,
    voiceChannelId: string,
): Promise<Queue | null> {
    const queue = getQueue(voiceChannelId);

    if (!queue) return null;

    // If user's voice channel doesn't match the queue's channel, cleanup old queue
    if (queue.voiceChannelId !== voiceChannelId) {
        const oldChannelName = await getChannelName(queue.worker.client, queue.voiceChannelId);
        const newChannelName = await getChannelName(interaction.client, voiceChannelId);

        logger.info(
            `User switched channels from ${oldChannelName} (${queue.voiceChannelId}) to ${newChannelName} (${voiceChannelId}), cleaning up old queue`,
        );

        // Clear old connection
        if (queue.idleTimeout) clearTimeout(queue.idleTimeout);
        setVoiceStatus(queue.worker.client, queue.voiceChannelId, '');
        if (queue.connection) queue.connection.destroy();
        deleteQueue(queue.voiceChannelId);
        workerPool.releaseWorker(queue.voiceChannelId);

        return null; // Force creation of new queue
    }

    return queue;
}

async function createQueue(
    interaction: ChatInputCommandInteraction,
    worker: WorkerState,
    _track: Song | null,
): Promise<Queue> {
    const member = interaction.member;
    if (!(member instanceof GuildMember)) {
        throw new Error('This command can only be used in a guild.');
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
        throw new Error('You must be in a voice channel to use this command.');
    }

    // CRITICAL: Clean up any old queues this worker might have
    cleanupWorkerOldQueues(worker);

    // Fetch the channel using the worker's client to get the correct adapter creator
    const workerChannel = await worker.client.channels.fetch(voiceChannel.id);
    if (!workerChannel || !workerChannel.isVoiceBased()) {
        throw new Error('Worker cannot join non-voice channel');
    }

    const connection = joinVoiceChannel({
        channelId: workerChannel.id,
        guildId: workerChannel.guild.id,
        adapterCreator: workerChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        group: worker.client.user!.id, // CRITICAL: Use unique group for each bot to allow multiple connections in one guild
    });

    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    const queue: Queue = {
        voiceChannelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        textChannel: interaction.channel,
        connection,
        player,
        songs: [],
        nowPlaying: null,
        autoplay: false,
        worker: worker, // Store the assigned worker
        idleTimeout: null, // Track idle disconnect timeout
        stopping: false, // Flag to prevent autoplay/idle logic when stopping manually
        isRadio: false,
    };

    connection.subscribe(player);

    workerPool.setWorkerBusy(worker, voiceChannel.guild.id, voiceChannel.id);

    player.on(AudioPlayerStatus.Idle, async () => {
        if (queue.stopping) return;

        // Ignore idle events if nothing was "officially" playing (e.g. plugin sounds)
        // This prevents "Queue Finished" messages when a plugin plays a sound effect.
        if (!queue.nowPlaying) return;

        const lastSong = queue.nowPlaying;
        queue.songs.shift();

        if (queue.songs.length > 0) {
            playSong(queue);
        } else if (queue.isRadio) {
            await handleRadio(queue);
        } else if (queue.autoplay && lastSong) {
            await handleAutoplay(queue, lastSong);
        } else {
            queue.nowPlaying = null;

            // Set idle status to show bot is ready for new requests
            setVoiceStatus(queue.worker.client, queue.voiceChannelId, '[IDLE] Ready to Meow');

            // Release worker immediately for reuse, but keep connection alive for 5 minutes
            workerPool.releaseWorker(queue.voiceChannelId);

            // Send enhanced queue finished message
            if (
                queue.textChannel &&
                queue.textChannel.isTextBased() &&
                !queue.textChannel.isDMBased()
            ) {
                try {
                    const channel = await queue.worker.client.channels.fetch(queue.voiceChannelId);
                    const channelName =
                        channel && 'name' in channel
                            ? (channel as { name: string }).name
                            : 'the voice channel';
                    queue.textChannel
                        .send(
                            `🎶 **${queue.worker.name}** has finished the queue in **${channelName}**! Staying connected for 5 more minutes.`,
                        )
                        .catch((err: unknown) =>
                            logger.warn(
                                `Failed to send finished message: ${err instanceof Error ? err.message : String(err)} `,
                            ),
                        );
                } catch (err: unknown) {
                    logger.warn(
                        `Failed to fetch channel for finished message: ${err instanceof Error ? err.message : String(err)} `,
                    );
                    if (queue.textChannel.isTextBased() && !queue.textChannel.isDMBased()) {
                        queue.textChannel
                            .send(
                                `🎶 **${queue.worker.name}** has finished the queue! Staying connected for 5 more minutes.`,
                            )
                            .catch((err: unknown) =>
                                logger.warn(
                                    `Failed to send finished message: ${err instanceof Error ? err.message : String(err)} `,
                                ),
                            );
                    }
                }
            }

            // Set 5-minute idle timeout before disconnecting
            queue.idleTimeout = setTimeout(
                () => {
                    logger.info(
                        `Disconnecting from ${queue.voiceChannelId} after 5 minutes of idle time`,
                    );
                    // Clear voice status before disconnecting
                    setVoiceStatus(queue.worker.client, queue.voiceChannelId, '');
                    if (
                        queue.connection &&
                        queue.connection.state.status !== VoiceConnectionStatus.Destroyed
                    ) {
                        try {
                            queue.connection.destroy();
                        } catch (error) {
                            logger.warn(
                                `[MusicPlayer] Failed to destroy connection for ${queue.voiceChannelId}: ${error}`,
                            );
                        }
                    }
                    deleteQueue(queue.voiceChannelId);
                },
                5 * 60 * 1000,
            ); // 5 minutes
        }
    });

    player.on('error', (error) => {
        logger.error(`Audio player error: ${error.message} `);
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(queue);
        }
    });

    setQueue(voiceChannel.id, queue);

    // Hook: QUEUE_CREATE (Sync to allow plugins to play intro sounds)
    await hookManager.triggerSync('QUEUE_CREATE', { queue, worker });

    return queue;
}

async function reacquireIdleWorker(
    interaction: ChatInputCommandInteraction,
    queue: Queue,
): Promise<boolean> {
    if (queue.idleTimeout) {
        // First, check if the worker was stolen for another task.
        if (queue.worker.busy) {
            logger.error(
                `[Worker Conflict] Worker ${queue.worker.name} for channel ${queue.voiceChannelId} was reassigned while idle.`,
            );
            await interaction.editReply(
                '🚫 **Bot Conflict!** The bot for this channel was assigned another task while idle. Please use `/stop` and try again.',
            );
            return false;
        }
        // Re-acquire the worker for this queue by marking it as busy.
        workerPool.setWorkerBusy(queue.worker, queue.guildId, queue.voiceChannelId);
    }
    return true;
}

async function ensureQueue(
    interaction: ChatInputCommandInteraction,
    voiceChannel: VoiceBasedChannel,
    track: Song | null,
): Promise<Queue | null> {
    let queue = await validateAndCleanupQueue(interaction, voiceChannel.id);

    if (!queue) {
        const worker = await assignWorker(interaction, voiceChannel, true); // NEW connection
        if (!worker) return null;

        queue = await createQueue(interaction, worker, track);
    } else {
        // Queue exists. If it was idle, the worker was marked as free.
        // We need to mark it as busy again before adding a new song.
        const success = await reacquireIdleWorker(interaction, queue);
        if (!success) return null;
    }
    return queue;
}

// --- Exported Functions ---

interface EnqueueOptions {
    position?: 'next' | 'end';
    skipCurrent?: boolean;
}

async function enqueue(
    interaction: ChatInputCommandInteraction,
    query: string,
    options: EnqueueOptions = {},
): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;

    const permissions = voiceChannel.permissionsFor(interaction.client.user!);
    if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
        await interaction.reply({
            content: 'I need the **Connect** and **Speak** permissions to play music!',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply();

    try {
        const track = await resolveTrack(query, interaction.user.id, interaction.user.tag);
        const queue = await ensureQueue(interaction, voiceChannel, track);
        if (!queue) return;

        if (queue.idleTimeout) {
            clearTimeout(queue.idleTimeout);
            queue.idleTimeout = null;
            logger.info(`Cleared idle timeout for ${queue.voiceChannelId} - new song added`);
        }

        const songToAdd = {
            ...track,
            requestedBy: interaction.user.tag,
            requesterId: interaction.user.id,
        };

        if (options.position === 'next') {
            // splice(1, 0, item) inserts at index 1 for non-empty arrays, or index 0 for empty arrays
            queue.songs.splice(1, 0, songToAdd);
        } else {
            queue.songs.push(songToAdd);
        }

        queue.stopping = false;

        // const channelName = await getChannelName(
        //   queue.worker.client,
        //   queue.voiceChannelId
        // );

        const prefix = track.fromCache ? '⚡⚡ ' : '';
        const devPrefix = getDevPrefix();

        const embed = songAddedEmbed(
            track.title,
            track.url,
            track.thumbnail,
            queue.worker.name,
            `${prefix}${devPrefix}`,
        );

        // If skipCurrent is true, we want to play the new song immediately.
        // If the queue was empty, it will just play.
        // If something was playing, we skip it.
        if (options.skipCurrent && queue.nowPlaying) {
            queue.player.stop(); // This triggers Idle event, which plays the next song (which we just inserted at index 1)
            await interaction.editReply({
                content: `⏭️ **Skipping current song to play:** ${track.title}`,
            });
            return;
        }

        if (queue.songs.length === 1 && !queue.nowPlaying) {
            await playSong(queue);
            await interaction.editReply({ embeds: [embed] });
        } else {
            if (options.position === 'next') {
                await interaction.editReply({
                    content: `✅ **Queued next:** ${track.title}`,
                    embeds: [],
                });
            } else {
                await interaction.editReply({ embeds: [embed] });
            }
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Enqueue error: ${msg} `);
        await interaction.editReply(`❌ Error: ${msg} `);
    }
}

async function enqueuePlaylist(
    interaction: ChatInputCommandInteraction,
    url: string,
): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;

    const permissions = voiceChannel.permissionsFor(interaction.client.user!);
    if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
        await interaction.reply({
            content: 'I need permissions to play music!',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply();

    try {
        const data = await fetchPlaylistData(url);
        let entries = data.entries || (data._type === 'playlist' ? [] : [data]);

        let truncated = false;
        if (data.title && data.title.startsWith('Mix -') && entries.length > 50) {
            entries = entries.slice(0, 50);
            truncated = true;
            logger.info(`Truncated autogenerated playlist '${data.title}' to 50 songs.`);
        }

        if (!entries.length) {
            throw new Error('Could not find any songs in this playlist.');
        }

        const queue = await ensureQueue(interaction, voiceChannel, null);
        if (!queue) return;

        const songsToAdd: Song[] = entries.map((entry) => ({
            title: entry.title || 'Unknown Title',
            url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
            durationInSec: entry.duration || 0,
            requestedBy: interaction.user.tag,
            requesterId: interaction.user.id,
        }));

        if (queue.idleTimeout) {
            clearTimeout(queue.idleTimeout);
            queue.idleTimeout = null;
            logger.info(`Cleared idle timeout for ${queue.voiceChannelId} - playlist added`);
        }

        queue.songs.push(...songsToAdd);

        if (!queue.nowPlaying && queue.songs.length === songsToAdd.length) {
            await playSong(queue);
        }

        const truncatedMsg = truncated ? ' (truncated to 50 for performance)' : '';
        await interaction.editReply(
            `✅ **Added ${songsToAdd.length} songs** from playlist: **${
                data.title || 'YouTube Playlist'
            }**${truncatedMsg}`,
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Playlist error: ${msg}`);
        await interaction.editReply(`❌ Failed to load playlist: ${msg}`);
    }
}

async function enqueueSongs(
    interaction: ChatInputCommandInteraction,
    songs: Omit<Song, 'requestedBy' | 'requesterId'>[],
    playlistName: string,
): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;

    const permissions = voiceChannel.permissionsFor(interaction.client.user!);
    if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
        await interaction.reply({
            content: 'I need permissions to play music!',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply();

    try {
        if (!songs.length) {
            throw new Error('No songs provided to enqueue.');
        }

        const queue = await ensureQueue(interaction, voiceChannel, null);
        if (!queue) return;

        const songsToAdd: Song[] = songs.map((song) => {
            const newSong: Song = {
                requestedBy: interaction.user.tag,
                requesterId: interaction.user.id,
                sourceType: 'attachment', // Default fallback
                ...song, // Override with any specific song properties if passed (like sourceType)
            };
            if (!newSong.title) newSong.title = 'Unknown Title';
            if (!newSong.durationInSec) newSong.durationInSec = 0;
            return newSong;
        });

        if (queue.idleTimeout) {
            clearTimeout(queue.idleTimeout);
            queue.idleTimeout = null;
            logger.info(`Cleared idle timeout for ${queue.voiceChannelId} - custom playlist added`);
        }

        queue.songs.push(...songsToAdd);

        if (!queue.nowPlaying && queue.songs.length === songsToAdd.length) {
            await playSong(queue);
        }

        await interaction.editReply(
            `✅ **Added ${songsToAdd.length} songs** from playlist: **${playlistName}**`,
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Custom playlist error: ${msg}`);
        await interaction.editReply(`❌ Failed to load playlist: ${msg}`);
    }
}

async function toggleAutoplay(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = (interaction.member as GuildMember).voice.channel;
    if (!voiceChannel) {
        await interaction.reply({
            content: 'You must be in a voice channel.',
            ephemeral: true,
        });
        return;
    }
    const queue = getQueue(voiceChannel.id);
    if (!queue) {
        await interaction.reply({
            content: 'There is no active queue to enable autoplay on.',
            ephemeral: true,
        });
        return;
    }

    queue.autoplay = !queue.autoplay;

    if (queue.playingMessage) {
        try {
            const components = queue.playingMessage.components;
            if (components && components.length > 0) {
                const oldRow = components[0];
                // @ts-expect-error - Discord.js component types are too broad, this cast is necessary
                const newRow = ActionRowBuilder.from(oldRow.toJSON());

                const componentsList = newRow.components;
                if (componentsList.length > 0) {
                    componentsList.pop();
                    newRow.addComponents(getAutoplayButton(queue.autoplay));
                    // @ts-expect-error - ActionRowBuilder type compatibility issue with Discord.js API
                    await queue.playingMessage.edit({ components: [newRow] });
                }
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to update autoplay button: ${msg}`);
        }
    }

    await interaction.reply(`🔄 **Autoplay is now ${queue.autoplay ? 'ENABLED' : 'DISABLED'}**`);
}

async function skip(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;
    const queue = getQueue(voiceChannel.id);
    if (!queue || !queue.nowPlaying) {
        await interaction.reply({
            content: "There's nothing playing to skip.",
            ephemeral: true,
        });
        return;
    }
    queue.player.stop();
    await interaction.reply('⏭️ Skipped current track.');
}

async function stop(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;
    const queue = getQueue(voiceChannel.id);
    if (!queue) {
        await interaction.reply({
            content: 'Nothing to stop – the queue is already empty.',
            ephemeral: true,
        });
        return;
    }
    const channelName = await getChannelName(queue.worker.client, queue.voiceChannelId);
    queue.songs = [];
    queue.stopping = true;
    queue.isRadio = false;
    setVoiceStatus(queue.worker.client, queue.voiceChannelId, '');
    queue.player.stop();
    if (queue.connection) {
        queue.connection.destroy();
    }
    deleteQueue(queue.voiceChannelId);
    workerPool.releaseWorker(queue.voiceChannelId);
    await interaction.reply(
        `⏹️ **${queue.worker.name}** stopped playback in **#${channelName}** and cleared the queue.`,
    );
}

async function pause(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;
    const queue = getQueue(voiceChannel.id);
    if (!queue || !queue.nowPlaying) {
        await interaction.reply({
            content: "There's nothing playing to pause.",
            ephemeral: true,
        });
        return;
    }
    const channelName = await getChannelName(queue.worker.client, queue.voiceChannelId);
    queue.player.pause();
    setVoiceStatus(queue.worker.client, queue.voiceChannelId, `[PAUSED] ${queue.nowPlaying.title}`);
    await interaction.reply(`⏸️ **${queue.worker.name}** paused in **#${channelName}**.`);
}

async function resume(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;
    const queue = getQueue(voiceChannel.id);
    if (!queue || !queue.nowPlaying) {
        await interaction.reply({
            content: "There's nothing paused to resume.",
            ephemeral: true,
        });
        return;
    }
    const channelName = await getChannelName(queue.worker.client, queue.voiceChannelId);
    queue.player.unpause();
    setVoiceStatus(
        queue.worker.client,
        queue.voiceChannelId,
        `[Playing] ${queue.nowPlaying.title}`,
    );
    await interaction.reply(`▶️ **${queue.worker.name}** resumed in **#${channelName}**.`);
}

async function showQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;
    const queue = getQueue(voiceChannel.id);
    if (!queue || (!queue.nowPlaying && queue.songs.length === 0)) {
        await interaction.reply('The queue is empty.');
        return;
    }

    const lines: string[] = [];

    if (queue.nowPlaying) {
        lines.push(
            `▶️ **Now:** [${queue.nowPlaying.title}](${
                queue.nowPlaying.url
            }) — \`${formatDuration(queue.nowPlaying.durationInSec)}\``,
        );
    }

    const upcoming = queue.songs.slice(1);
    if (upcoming.length) {
        lines.push('');
        lines.push('📜 **Up Next:**');
        upcoming.slice(0, 10).forEach((song, index) => {
            lines.push(
                `${index + 1}. [${song.title}](${song.url}) — \`${formatDuration(
                    song.durationInSec,
                )}\` • requested by **${song.requestedBy}**`,
            );
        });
        if (upcoming.length > 10) {
            lines.push(`…and ${upcoming.length - 10} more.`);
        }
    }

    await interaction.reply({ content: lines.join('\n') });
}

async function nowPlaying(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;
    const queue = getQueue(voiceChannel.id);
    if (!queue || !queue.nowPlaying) {
        await interaction.reply('Nothing is currently playing.');
        return;
    }
    await interaction.reply(
        `▶️ **Now playing:** [${queue.nowPlaying.title}](${queue.nowPlaying.url})`,
    );
}

async function startRadio(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;

    const permissions = voiceChannel.permissionsFor(interaction.client.user!);
    if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
        await interaction.reply({
            content: 'I need the **Connect** and **Speak** permissions to play music!',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply();

    try {
        // Ensure queue exists (or create new one)
        logger.info(`[radio] Starting radio for channel ${voiceChannel.id}`);
        let queue = await validateAndCleanupQueue(interaction, voiceChannel.id);

        if (!queue) {
            logger.info(`[radio] No existing queue, assigning worker...`);
            const worker = await assignWorker(interaction, voiceChannel, true);
            if (!worker) {
                logger.warn(`[radio] Failed to assign worker`);
                return;
            }
            logger.info(`[radio] Assigned worker ${worker.name}`);
            queue = await createQueue(interaction, worker, null);
        } else {
            // Re-acquire worker if idle
            logger.info(`[radio] Reusing existing queue/worker ${queue.worker.name}`);
            const success = await reacquireIdleWorker(interaction, queue);
            if (!success) return;
        }

        if (!queue) return;

        // Enable radio mode
        queue.isRadio = true;
        queue.stopping = false;

        // If nothing is playing, start radio immediately
        if (!queue.nowPlaying && queue.songs.length === 0) {
            logger.info(`[radio] Queue empty, starting playback immediately`);
            await handleRadio(queue);
        } else {
            const channelName = await getChannelName(queue.worker.client, queue.voiceChannelId);
            await interaction.editReply(
                `📻 **Radio Mode Enabled** for **#${channelName}**! Random cached songs will play after the current queue.`,
            );
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Radio error: ${msg}`);
        await interaction.editReply(`❌ Error starting radio: ${msg}`);
    }
}

export default {
    enqueue,
    enqueuePlaylist,
    enqueueSongs,
    toggleAutoplay,
    skip,
    stop,
    pause,
    resume,
    showQueue,
    nowPlaying,
    startRadio,
    getQueues: getAllQueues,
    clearAllQueues,
};
