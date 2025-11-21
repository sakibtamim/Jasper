import { createAudioResource, StreamType, AudioPlayerStatus } from "@discordjs/voice";
import { ActionRowBuilder, ButtonStyle, ComponentType } from "discord.js";
import ytSearch from "yt-search";
import logger from "../logger.js";
import workerPool from "../worker-pool.js";
import { setVoiceStatus, getChannelName } from "../utils/voice-utils.js";
import { createStreamProcess } from "./stream-handler.js";
import { createControlButtons, getAutoplayButton } from "../ui/player-controls.js";
import { deleteQueue } from "./queue-manager.js";
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
function getRandomMusicQuery() {
    return AUTOPLAY_SEARCH_QUERIES[Math.floor(Math.random() * AUTOPLAY_SEARCH_QUERIES.length)];
}
export async function handleAutoplay(queue, lastSong) {
    try {
        if (queue.textChannel) {
            queue.textChannel
                .send("🔄 **Autoplay:** Finding a new song...")
                .catch((error) => logger.warn(`Failed to send autoplay message: ${error.message}`));
        }
        // Search for varied music instead of the same song
        const searchQuery = getRandomMusicQuery();
        const searchResult = await ytSearch(searchQuery);
        if (!searchResult || !searchResult.videos.length) {
            if (queue.textChannel)
                queue.textChannel.send("Could not find a song to autoplay.");
            return;
        }
        // Filter out playlists and only get individual videos
        const individualVideos = searchResult.videos.filter((video) => {
            const title = video.title.toLowerCase();
            // Exclude playlists, mixes, and compilations
            const isExcluded = AUTOPLAY_FILTER_KEYWORDS.some((keyword) => title.includes(keyword));
            return !isExcluded && video.type === "video";
        });
        if (!individualVideos.length) {
            if (queue.textChannel)
                queue.textChannel.send("Could not find a suitable song to autoplay.");
            return;
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
        const track = {
            title: nextVideo.title,
            url: nextVideo.url,
            durationInSec: nextVideo.seconds,
            requestedBy: "Jasper (Autoplay)",
        };
        queue.songs.push(track);
        playSong(queue);
    }
    catch (error) {
        logger.error(`Autoplay error: ${error.message}`);
        if (queue.textChannel)
            queue.textChannel.send("❌ Failed to autoplay next song.");
    }
}
export async function playSong(queue) {
    const song = queue.songs[0];
    if (!song)
        return;
    try {
        logger.info(`Attempting to stream with yt-dlp: ${song.title}`);
        const ytDlpProcess = createStreamProcess(song.url);
        const resource = createAudioResource(ytDlpProcess.stdout, {
            inputType: StreamType.Arbitrary,
            inlineVolume: false,
        });
        queue.player.play(resource);
        queue.nowPlaying = song;
        logger.info(`Now playing in ${queue.guildId}: ${song.title}`);
        setVoiceStatus(queue.worker.client, queue.voiceChannelId, `[Playing] ${song.title}`);
        // -------------------------------------------------------
        // BUTTONS SETUP
        // -------------------------------------------------------
        const row = createControlButtons(queue.autoplay);
        let playingMessage;
        if (queue.textChannel) {
            const channelName = await getChannelName(queue.worker.client, queue.voiceChannelId);
            playingMessage = await queue.textChannel
                .send({
                content: `▶️ **${queue.worker.name}** is now playing in **#${channelName}**: [${song.title}](${song.url})`,
                components: [row],
            })
                .catch((error) => logger.warn(`Failed to send playing message: ${error.message}`));
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
                // Security: Ensure clicker is in the same voice channel
                const memberVoiceChannelId = i.member?.voice?.channelId;
                if (!memberVoiceChannelId ||
                    memberVoiceChannelId !== queue.voiceChannelId) {
                    return i.reply({
                        content: "You need to be in the voice channel to control music!",
                        ephemeral: true,
                    });
                }
                if (i.customId === "pause_resume") {
                    if (queue.player.state.status === AudioPlayerStatus.Paused) {
                        queue.player.unpause();
                        setVoiceStatus(queue.worker.client, queue.voiceChannelId, `[Playing] ${queue.nowPlaying.title}`);
                        // Update button to show "Pause" again
                        const newRow = ActionRowBuilder.from(playingMessage.components[0]);
                        newRow.components[0]
                            .setLabel("⏸️ Pause")
                            .setStyle(ButtonStyle.Secondary);
                        await i.update({ components: [newRow] });
                    }
                    else {
                        queue.player.pause();
                        setVoiceStatus(queue.worker.client, queue.voiceChannelId, `[PAUSED] ${queue.nowPlaying.title}`);
                        // Update button to show "Resume"
                        const newRow = ActionRowBuilder.from(playingMessage.components[0]);
                        newRow.components[0]
                            .setLabel("▶️ Resume")
                            .setStyle(ButtonStyle.Success);
                        await i.update({ components: [newRow] });
                    }
                }
                else if (i.customId === "skip") {
                    await i.reply({ content: `⏭️ **Skipped** by ${i.user.username}` });
                    queue.player.stop();
                    collector.stop();
                }
                else if (i.customId === "stop") {
                    await i.reply({ content: `⏹️ **Stopped** by ${i.user.username}` });
                    queue.stopping = true;
                    setVoiceStatus(queue.worker.client, queue.voiceChannelId, "");
                    queue.songs = [];
                    queue.player.stop();
                    if (queue.connection)
                        queue.connection.destroy();
                    deleteQueue(queue.voiceChannelId);
                    workerPool.releaseWorker(queue.voiceChannelId);
                    collector.stop();
                }
                else if (i.customId === "toggle_autoplay") {
                    queue.autoplay = !queue.autoplay;
                    const newRow = ActionRowBuilder.from(playingMessage.components[0]);
                    // Replace the last component (autoplay button) with the updated one
                    newRow.components.pop();
                    newRow.addComponents(getAutoplayButton(queue.autoplay));
                    await i.update({ components: [newRow] });
                }
            });
            // Disable buttons when the song ends
            collector.on("end", () => {
                try {
                    const disabledRow = ActionRowBuilder.from(playingMessage.components[0]);
                    disabledRow.components.forEach((btn) => btn.setDisabled(true));
                    playingMessage.edit({ components: [disabledRow] }).catch((error) => logger.warn(`Failed to disable buttons: ${error.message}`));
                }
                catch (e) {
                    // Message might have been deleted, ignore
                }
            });
        }
    }
    catch (error) {
        logger.error(`Failed to play song: ${error.message}`);
        queue.songs.shift();
        playSong(queue);
    }
}
