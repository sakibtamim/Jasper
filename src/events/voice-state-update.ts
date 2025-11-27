import { Events, VoiceState, Client } from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import logger from "../core/logger.js";
import { getQueue } from "../core/audio/queue-manager.js";
import { setVoiceStatus } from "../core/utils/voice-utils.js";

export default {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState: VoiceState, newState: VoiceState, client: Client) {
        // We only care about voice channel changes involving the bot's channel
        const channelId = oldState.channelId || newState.channelId;
        if (!channelId) return;

        // Get the queue for this channel
        const queue = getQueue(channelId);
        if (!queue) return;

        // Verify this event is relevant to the worker managing this queue
        if (queue.worker.client.user?.id !== client.user?.id) return;

        // Check if the bot is in the channel
        const channel = queue.connection.joinConfig.channelId;
        if (!channel) return;

        // Fetch the channel to get current members
        try {
            const voiceChannel = await client.channels.fetch(channel);
            if (!voiceChannel || !voiceChannel.isVoiceBased()) return;

            // Filter members to exclude bots (or at least exclude ourself)
            // Ideally we want to pause if ONLY bots are left, or ONLY our bot is left.
            // Let's count non-bot members.
            const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot);

            // Case 1: Channel is empty (only bots left) -> Auto Pause
            if (nonBotMembers.size === 0) {
                if (queue.player.state.status === AudioPlayerStatus.Playing) {
                    logger.info(`[auto-pause] Channel ${voiceChannel.name} is empty. Pausing playback.`);
                    queue.player.pause();
                    queue.isAutoPaused = true;
                    setVoiceStatus(
                        queue.worker.client,
                        queue.voiceChannelId,
                        `[PAUSED] ${queue.nowPlaying?.title || "Auto-Paused"}`
                    );

                    if (queue.textChannel && 'send' in queue.textChannel) {
                        queue.textChannel.send("⏸️ **Auto-Paused** because the voice channel is empty.").catch(() => { });
                    }
                }
            }
            // Case 2: Someone joined and we are auto-paused -> Auto Resume
            else if (nonBotMembers.size > 0 && queue.isAutoPaused) {
                logger.info(`[auto-resume] User joined ${voiceChannel.name}. Resuming playback.`);
                queue.player.unpause();
                queue.isAutoPaused = false;
                setVoiceStatus(
                    queue.worker.client,
                    queue.voiceChannelId,
                    `[Playing] ${queue.nowPlaying?.title || "Resumed"}`
                );

                if (queue.textChannel && 'send' in queue.textChannel) {
                    queue.textChannel.send("▶️ **Auto-Resumed** because a user joined.").catch(() => { });
                }
            }

        } catch (error) {
            logger.error(`[voice-state] Error handling voice state update: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};
