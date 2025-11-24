import { createAudioResource, StreamType, AudioPlayerStatus } from "@discordjs/voice";
import { ActionRowBuilder, ButtonStyle, ComponentType, ButtonBuilder, Message } from "discord.js";
import { APIActionRowComponent, APIButtonComponent } from "discord-api-types/v10";
import ytSearch from "yt-search";
import logger from "../logger.js";
import workerPool from "../worker-pool.js";
import { setVoiceStatus, getChannelName } from "../utils/voice-utils.js";
import { createStreamProcess } from "./stream-handler.js";
import { createControlButtons, getAutoplayButton } from "../ui/player-controls.js";
import { deleteQueue, Queue, Song } from "./queue-manager.js";
import { GuildMember } from "discord.js";
import { isCacheEnabled, getCacheStorage } from "../cache-manager.js";
import { Readable } from "stream";

// Constants for Autoplay
const AUTOPLAY_SEARCH_QUERIES = [
    "popular song",
    "trending song",
    "top hit song",
    "best song",
    "viral song",
    "new music video",
    "official music video",
    "latest song",
    "hit song",
    "music video",
    "lofi hip hop",
    "chill music",
];

const AUTOPLAY_FILTER_KEYWORDS = [
    "playlist",
    "mix -",
    "compilation",
    "full album",
];

const AUTOPLAY_POOL_SIZE = 10;

function getRandomMusicQuery(): string {
    return AUTOPLAY_SEARCH_QUERIES[
        Math.floor(Math.random() * AUTOPLAY_SEARCH_QUERIES.length)
    ];
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string {
    try {
        const urlObj = new URL(url);

        // Handle youtu.be/VIDEO_ID format
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1);
        }

        // Handle youtube.com/shorts/VIDEO_ID
        if (urlObj.pathname.startsWith('/shorts/')) {
            return urlObj.pathname.split('/')[2];
        }

        // Handle youtube.com/embed/VIDEO_ID
        if (urlObj.pathname.startsWith('/embed/')) {
            return urlObj.pathname.split('/')[2];
        }

        // Handle youtube.com/watch?v=VIDEO_ID (and m.youtube.com)
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
            return videoId;
        }
    } catch {
        // Ignore parsing errors, fall through to hash
    }

    // Fallback: use hash of URL if format is unknown
    return Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

export async function handleAutoplay(queue: Queue, lastSong: Song): Promise<void> {
    try {
        if (queue.textChannel && 'send' in queue.textChannel) {
            queue.textChannel
                .send("🔄 **Autoplay:** Finding a new song...")
                .catch((error: unknown) => logger.warn(`Failed to send autoplay message: ${error instanceof Error ? error.message : String(error)}`));
        }

        // Search for varied music instead of the same song
        const searchQuery = getRandomMusicQuery();
        const searchResult = await ytSearch(searchQuery);

        if (!searchResult || !searchResult.videos.length) {
            if (queue.textChannel && 'send' in queue.textChannel) {
                queue.textChannel.send("Could not find a song to autoplay.");
            } return;
        }

        // Filter out playlists and only get individual videos
        const individualVideos = searchResult.videos.filter((video: ytSearch.VideoSearchResult) => {
            const title = video.title.toLowerCase();
            // Exclude playlists, mixes, and compilations
            const isExcluded = AUTOPLAY_FILTER_KEYWORDS.some((keyword) =>
                title.includes(keyword)
            );
            return !isExcluded && video.type === "video";
        });

        if (!individualVideos.length) {
            if (queue.textChannel && 'send' in queue.textChannel) {
                queue.textChannel.send("Could not find a suitable song to autoplay.");
            } return;
        }

        // Pick a random video from the filtered results
        const poolSize = Math.min(AUTOPLAY_POOL_SIZE, individualVideos.length);
        const randomIndex = Math.floor(Math.random() * poolSize);
        let nextVideo = individualVideos[randomIndex];

        // Ensure we don't play the same song that just finished
        if (nextVideo.url === lastSong.url && individualVideos.length > 1) {
            const alternateIndex = (randomIndex + 1) % poolSize;
            nextVideo = individualVideos[alternateIndex];
        }

        const track: Song = {
            title: nextVideo.title,
            url: nextVideo.url,
            durationInSec: nextVideo.seconds,
            requestedBy: "Jasper (Autoplay)",
        };

        queue.songs.push(track);
        playSong(queue);
    } catch (error: unknown) {
        logger.error(`[playback] Autoplay error: ${error instanceof Error ? error.message : String(error)}`);
        if (queue.textChannel && 'send' in queue.textChannel) {
            queue.textChannel.send("❌ An error occurred while trying to play the song.");
        }
    }
}

export async function playSong(queue: Queue): Promise<void> {
    const song = queue.songs[0];
    if (!song) return;

    try {
        logger.info(`[playback] Attempting to stream with yt-dlp: ${song.title}`);

        let audioSource: Readable;

        // Check audio cache if enabled
        if (isCacheEnabled()) {
            const storage = getCacheStorage();
            if (storage) {
                const videoId = extractVideoId(song.url);
                const cachedStream = await storage.getCachedAudioStream(videoId);

                if (cachedStream) {
                    // Cache hit: stream from disk
                    audioSource = cachedStream;
                    song.fromCache = true;
                    logger.info(`[cache] Streaming from cache for: ${song.title}`);
                } else {
                    // Cache miss: stream from memory while writing to disk (async)
                    audioSource = await storage.cacheAudioStream(song.url, videoId, [song.title]);
                    logger.info(`[cache] Downloading and caching: ${song.title}`);
                }
            } else {
                // Cache storage not available, fallback to direct stream
                const process = createStreamProcess(song.url);
                if (!process.stdout) {
                    throw new Error('Failed to create yt-dlp process stdout');
                }
                audioSource = process.stdout;
            }
        } else {
            // Caching disabled: stream directly from yt-dlp
            const process = createStreamProcess(song.url);
            if (!process.stdout) {
                throw new Error('Failed to create yt-dlp process stdout');
            }
            audioSource = process.stdout;
        }

        const resource = createAudioResource(audioSource, {
            inputType: StreamType.Arbitrary,
            inlineVolume: false,
        });

        queue.player.play(resource);
        queue.nowPlaying = song;

        logger.info(`[playback] Now playing in ${queue.guildId}: ${song.title}`);

        setVoiceStatus(
            queue.worker.client,
            queue.voiceChannelId,
            `[Playing] ${song.title}`
        );

        // -------------------------------------------------------
        // BUTTONS SETUP
        // -------------------------------------------------------
        const row = createControlButtons(queue.autoplay);

        let playingMessage: Message | undefined;
        if (queue.textChannel && 'send' in queue.textChannel) {
            const channelName = await getChannelName(
                queue.worker.client,
                queue.voiceChannelId
            );

            let content = "";
            if (queue.isRadio) {
                content = `📻 **Radio:** [${song.title}](${song.url}) in **#${channelName}**`;
            } else {
                const prefix = song.fromCache ? "⚡⚡ " : "";
                content = `${prefix}▶️ **${queue.worker.name}** is now playing in **#${channelName}**: [${song.title}](${song.url})`;
            }

            playingMessage = await queue.textChannel
                .send({
                    content,
                    components: [row],
                })
                .catch((error: unknown) => logger.warn(`Failed to send playing message: ${error instanceof Error ? error.message : String(error)}`)) as Message | undefined;
            if (playingMessage) {
                queue.playingMessage = playingMessage;
            }
        }

        // Setup Collector to handle button clicks
        if (playingMessage) {
            const collector = playingMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: song.durationInSec > 0 ? song.durationInSec * 1000 : 3600000, // Listen until song ends
            });

            collector.on("collect", async (i) => {
                if (!(i.member instanceof GuildMember)) {
                    await i.reply({ content: "This command can only be used in a guild.", ephemeral: true });
                    return;
                }

                // Security: Ensure clicker is in the same voice channel
                const memberVoiceChannelId = i.member.voice.channelId;
                if (
                    !memberVoiceChannelId ||
                    memberVoiceChannelId !== queue.voiceChannelId
                ) {
                    return i.reply({
                        content: "You need to be in the voice channel to control music!",
                        ephemeral: true,
                    });
                }

                if (i.customId === "pause_resume") {
                    if (queue.player.state.status === AudioPlayerStatus.Paused) {
                        queue.player.unpause();
                        setVoiceStatus(
                            queue.worker.client,
                            queue.voiceChannelId,
                            `[Playing] ${queue.nowPlaying!.title}`
                        );
                        // Update button to show "Pause" again
                        const newRow = ActionRowBuilder.from<ButtonBuilder>(playingMessage!.components[0] as APIActionRowComponent<APIButtonComponent>);
                        newRow.components[0]
                            .setLabel("⏸️ Pause")
                            .setStyle(ButtonStyle.Secondary);
                        await i.update({ components: [newRow] });
                    } else {
                        queue.player.pause();
                        setVoiceStatus(
                            queue.worker.client,
                            queue.voiceChannelId,
                            `[PAUSED] ${queue.nowPlaying!.title}`
                        );
                        // Update button to show "Resume"
                        const newRow = ActionRowBuilder.from<ButtonBuilder>(playingMessage!.components[0] as APIActionRowComponent<APIButtonComponent>);
                        newRow.components[0]
                            .setLabel("▶️ Resume")
                            .setStyle(ButtonStyle.Success);
                        await i.update({ components: [newRow] });
                    }
                } else if (i.customId === "skip") {
                    await i.reply({ content: `⏭️ **Skipped** by ${i.user.username}` });
                    queue.player.stop();
                    collector.stop();
                } else if (i.customId === "stop") {
                    await i.reply({ content: `⏹️ **Stopped** by ${i.user.username}` });
                    queue.stopping = true;
                    setVoiceStatus(queue.worker.client, queue.voiceChannelId, "");
                    queue.songs = [];
                    queue.player.stop();
                    if (queue.connection) queue.connection.destroy();
                    deleteQueue(queue.voiceChannelId);
                    workerPool.releaseWorker(queue.voiceChannelId);
                    collector.stop();
                } else if (i.customId === "toggle_autoplay") {
                    queue.autoplay = !queue.autoplay;
                    const newRow = ActionRowBuilder.from<ButtonBuilder>(playingMessage!.components[0] as APIActionRowComponent<APIButtonComponent>);
                    // Replace the last component (autoplay button) with the updated one
                    newRow.components.pop();
                    newRow.addComponents(getAutoplayButton(queue.autoplay));
                    await i.update({ components: [newRow] });
                }
            });

            // Disable buttons when the song ends
            collector.on("end", () => {
                try {
                    const disabledRow = ActionRowBuilder.from<ButtonBuilder>(playingMessage!.components[0] as APIActionRowComponent<APIButtonComponent>);
                    disabledRow.components.forEach((btn) => btn.setDisabled(true));
                    playingMessage!.edit({ components: [disabledRow] }).catch((error: unknown) => logger.warn(`Failed to disable buttons: ${error instanceof Error ? error.message : String(error)}`));
                } catch (e) {
                    // Message might have been deleted, ignore
                }
            });
        }
    } catch (error: any) {
        logger.error(`[playback] Failed to play song: ${error.message}`);
        queue.songs.shift();
        playSong(queue);
    }
}

export async function handleRadio(queue: Queue): Promise<void> {
    try {
        if (queue.textChannel && 'send' in queue.textChannel) {
            queue.textChannel
                .send("📻 **Radio Mode:** Picking a random song from cache...")
                .catch((error: unknown) => logger.warn(`Failed to send radio message: ${error instanceof Error ? error.message : String(error)}`));
        }

        if (!isCacheEnabled()) {
            if (queue.textChannel && 'send' in queue.textChannel) {
                queue.textChannel.send("❌ Cache is disabled. Cannot play radio.");
            }
            queue.isRadio = false;
            return;
        }

        const storage = getCacheStorage();
        if (!storage) {
            if (queue.textChannel && 'send' in queue.textChannel) {
                queue.textChannel.send("❌ Cache storage not available.");
            }
            queue.isRadio = false;
            return;
        }

        const randomSong = await storage.getRandomCachedSong();
        if (!randomSong) {
            if (queue.textChannel && 'send' in queue.textChannel) {
                queue.textChannel.send("❌ No songs in cache to play.");
            }
            queue.isRadio = false;
            return;
        }

        // Ensure we don't play the same song if possible
        if (queue.nowPlaying && queue.nowPlaying.url === randomSong.url) {
            // Try one more time
            const retrySong = await storage.getRandomCachedSong();
            if (retrySong) {
                queue.songs.push(retrySong);
            } else {
                queue.songs.push(randomSong);
            }
        } else {
            queue.songs.push(randomSong);
        }

        playSong(queue);

    } catch (error: unknown) {
        logger.error(`[playback] Radio error: ${error instanceof Error ? error.message : String(error)}`);
        if (queue.textChannel && 'send' in queue.textChannel) {
            queue.textChannel.send("❌ An error occurred while trying to play radio.");
        }
        queue.isRadio = false;
    }
}
