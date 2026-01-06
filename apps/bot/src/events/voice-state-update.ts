import { Events, VoiceState, Client } from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import logger from "../core/logger.js";
import { getQueue } from "../core/audio/queue-manager.js";
import { setVoiceStatus } from "../core/utils/voice-utils.js";
import hookManager from "../core/plugins/hook-manager.js";

export default {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState, client: Client) {
    // Don't process events for the same channel (e.g., mute, deafen)
    if (oldState.channelId === newState.channelId) return;

    // Hook: VOICE_STATE_UPDATE
    hookManager.trigger("VOICE_STATE_UPDATE", { oldState, newState, client });

    const affectedChannelIds = new Set<string | null>();
    affectedChannelIds.add(oldState.channelId);
    affectedChannelIds.add(newState.channelId);

    for (const channelId of affectedChannelIds) {
      if (!channelId) continue;

      const queue = getQueue(channelId);
      if (!queue) continue;

      if (queue.worker.client.user?.id !== client.user?.id) continue;

      const channel = queue.connection.joinConfig.channelId;
      if (!channel) continue;

      try {
        const voiceChannel = await client.channels.fetch(channelId);
        if (!voiceChannel || !voiceChannel.isVoiceBased()) continue;

        const nonBotMembers = voiceChannel.members.filter((m) => !m.user.bot);

        // Case 1: Channel is empty (only bots left) -> Auto Pause
        if (nonBotMembers.size === 0) {
          if (queue.player.state.status === AudioPlayerStatus.Playing) {
            logger.info(
              `[auto-pause] Channel ${voiceChannel.name} is empty. Pausing playback.`,
            );
            queue.player.pause();
            queue.isAutoPaused = true;
            setVoiceStatus(
              queue.worker.client,
              queue.voiceChannelId,
              `[PAUSED] ${queue.nowPlaying?.title || "Auto-Paused"}`,
            );

            if (queue.textChannel && "send" in queue.textChannel) {
              queue.textChannel
                .send("⏸️ **Auto-Paused** because the voice channel is empty.")
                .catch((error) =>
                  logger.warn(
                    `[voice-state] Failed to send auto-pause message: ${error}`,
                  ),
                );
            }
          }
        }
        // Case 2: Someone joined and we are auto-paused -> Auto Resume
        else if (nonBotMembers.size > 0 && queue.isAutoPaused) {
          logger.info(
            `[auto-resume] User joined ${voiceChannel.name}. Resuming playback.`,
          );
          queue.player.unpause();
          queue.isAutoPaused = false;
          setVoiceStatus(
            queue.worker.client,
            queue.voiceChannelId,
            `[Playing] ${queue.nowPlaying?.title || "Resumed"}`,
          );

          if (queue.textChannel && "send" in queue.textChannel) {
            queue.textChannel
              .send("▶️ **Auto-Resumed** because a user joined.")
              .catch((error) =>
                logger.warn(
                  `[voice-state] Failed to send auto-resume message: ${error}`,
                ),
              );
          }
        }
      } catch (error) {
        logger.error(
          `[voice-state] Error handling voice state update for channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  },
};
