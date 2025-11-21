import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { ActionRowBuilder } from "discord.js";
import logger from "./logger.js";
import workerPool from "./worker-pool.js";

import {
  validateInteraction,
  setVoiceStatus,
  getChannelName,
  formatDuration,
} from "./utils/voice-utils.js";

import {
  getQueue,
  setQueue,
  deleteQueue,
  getAllQueues,
  cleanupWorkerOldQueues,
  clearAllQueues,
} from "./audio/queue-manager.js";

import {
  fetchVideoData,
  fetchPlaylistData,
  isUrl,
} from "./audio/stream-handler.js";

import { playSong, handleAutoplay } from "./audio/playback-engine.js";
import { getAutoplayButton } from "./ui/player-controls.js";
import ytSearch from "yt-search";

// --- Helpers ---

async function assignWorker(interaction, voiceChannel) {
  // Allocate a worker
  const worker = workerPool.allocateWorker(
    interaction.guild.id,
    voiceChannel.id
  );
  if (!worker) {
    await interaction.editReply(
      "🚫 **All members of the Heavenly Council of Fur are currently busy!** Please try again later."
    );
    return null;
  }

  // Check permissions
  try {
    const workerChannel = await worker.client.channels.fetch(voiceChannel.id);
    const workerPermissions = workerChannel.permissionsFor(worker.client.user);
    if (
      !workerPermissions ||
      !workerPermissions.has("Connect") ||
      !workerPermissions.has("Speak")
    ) {
      await interaction.editReply(
        `🚫 **${worker.name}** does not have permissions to join your channel!`
      );
      workerPool.releaseWorker(voiceChannel.id);
      return null;
    }
  } catch (err) {
    await interaction.editReply(
      `🚫 **${worker.name}** cannot access this channel (Is it invited to the server?).`
    );
    workerPool.releaseWorker(voiceChannel.id);
    return null;
  }

  // Flavor text
  if (worker.role === "worker") {
    await interaction.channel
      .send(
        `🐾 **Jasper** is busy, summoning **${worker.name}** to handle the beats!`
      )
      .catch(() => { });
  }

  return worker;
}

async function validateAndCleanupQueue(interaction, voiceChannelId) {
  const queue = getQueue(voiceChannelId);

  if (!queue) return null;

  // If user's voice channel doesn't match the queue's channel, cleanup old queue
  if (queue.voiceChannelId !== voiceChannelId) {
    const oldChannelName = await getChannelName(
      queue.worker.client,
      queue.voiceChannelId
    );
    const newChannelName = await getChannelName(
      interaction.client,
      voiceChannelId
    );

    logger.info(
      `User switched channels from ${oldChannelName} (${queue.voiceChannelId}) to ${newChannelName} (${voiceChannelId}), cleaning up old queue`
    );

    // Clear old connection
    if (queue.idleTimeout) clearTimeout(queue.idleTimeout);
    setVoiceStatus(queue.worker.client, queue.voiceChannelId, "");
    if (queue.connection) queue.connection.destroy();
    deleteQueue(queue.voiceChannelId);
    workerPool.releaseWorker(queue.voiceChannelId);

    return null; // Force creation of new queue
  }

  return queue;
}

async function createQueue(interaction, worker, track) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    throw new Error("You must be in a voice channel to use this command.");
  }

  // CRITICAL: Clean up any old queues this worker might have
  cleanupWorkerOldQueues(worker);

  // Fetch the channel using the worker's client to get the correct adapter creator
  const workerChannel = await worker.client.channels.fetch(voiceChannel.id);

  const connection = joinVoiceChannel({
    channelId: workerChannel.id,
    guildId: workerChannel.guild.id,
    adapterCreator: workerChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
    group: worker.client.user.id, // CRITICAL: Use unique group for each bot to allow multiple connections in one guild
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  const queue = {
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
  };

  connection.subscribe(player);

  workerPool.setWorkerBusy(worker, voiceChannel.guild.id, voiceChannel.id);

  player.on(AudioPlayerStatus.Idle, async () => {
    if (queue.stopping) return;

    const lastSong = queue.nowPlaying;
    queue.songs.shift();

    if (queue.songs.length > 0) {
      playSong(queue);
    } else if (queue.autoplay && lastSong) {
      await handleAutoplay(queue, lastSong);
    } else {
      queue.nowPlaying = null;

      // Set idle status to show bot is ready for new requests
      setVoiceStatus(
        queue.worker.client,
        queue.voiceChannelId,
        "[IDLE] Ready to Meow"
      );

      // Release worker immediately for reuse, but keep connection alive for 5 minutes
      workerPool.releaseWorker(queue.voiceChannelId);

      // Send enhanced queue finished message
      if (queue.textChannel) {
        try {
          const channel = await queue.worker.client.channels.fetch(
            queue.voiceChannelId
          );
          const channelName = channel ? channel.name : "the voice channel";
          queue.textChannel
            .send(
              `🎶 **${queue.worker.name}** has finished the queue in **${channelName}**! Staying connected for 5 more minutes.`
            )
            .catch((err) =>
              logger.warn(`Failed to send finished message: ${err.message}`)
            );
        } catch (err) {
          logger.warn(
            `Failed to fetch channel for finished message: ${err.message}`
          );
          queue.textChannel
            .send(
              `🎶 **${queue.worker.name}** has finished the queue! Staying connected for 5 more minutes.`
            )
            .catch((err) =>
              logger.warn(`Failed to send finished message: ${err.message}`)
            );
        }
      }

      // Set 5-minute idle timeout before disconnecting
      queue.idleTimeout = setTimeout(() => {
        logger.info(
          `Disconnecting from ${queue.voiceChannelId} after 5 minutes of idle time`
        );
        // Clear voice status before disconnecting
        setVoiceStatus(queue.worker.client, queue.voiceChannelId, "");
        if (queue.connection) {
          queue.connection.destroy();
        }
        deleteQueue(queue.voiceChannelId);
      }, 5 * 60 * 1000); // 5 minutes
    }
  });

  player.on("error", (error) => {
    logger.error(`Audio player error: ${error.message}`);
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(queue);
    }
  });

  setQueue(voiceChannel.id, queue);
  return queue;
}

async function resolveTrack(query) {
  // Feature 1: Direct URL support
  if (isUrl(query)) {
    try {
      const videoData = await fetchVideoData(query);
      return {
        title: videoData.title,
        url: videoData.webpage_url || videoData.url,
        durationInSec: videoData.duration,
      };
    } catch (error) {
      throw new Error(`Failed to resolve URL: ${error.message}`);
    }
  }

  const searchResult = await ytSearch(query);
  if (searchResult && searchResult.videos.length > 0) {
    const video = searchResult.videos[0];
    return {
      title: video.title,
      url: video.url,
      durationInSec: video.seconds,
    };
  }
  throw new Error("No results found on YouTube.");
}

// --- Exported Functions ---

async function enqueue(interaction, query) {
  const voiceChannel = await validateInteraction(interaction);
  if (!voiceChannel) return;

  const permissions = voiceChannel.permissionsFor(interaction.client.user);
  if (
    !permissions ||
    !permissions.has("Connect") ||
    !permissions.has("Speak")
  ) {
    await interaction.reply({
      content:
        "I need the **Connect** and **Speak** permissions to play music!",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const track = await resolveTrack(query);
    let queue = await validateAndCleanupQueue(interaction, voiceChannel.id);

    if (!queue) {
      const worker = await assignWorker(interaction, voiceChannel);
      if (!worker) return;

      queue = await createQueue(interaction, worker, track);
    }

    if (queue.idleTimeout) {
      clearTimeout(queue.idleTimeout);
      queue.idleTimeout = null;
      logger.info(
        `Cleared idle timeout for ${queue.voiceChannelId} - new song added`
      );
    }

    queue.songs.push({
      ...track,
      requestedBy: interaction.user.tag,
    });
    queue.stopping = false;

    const channelName = await getChannelName(
      queue.worker.client,
      queue.voiceChannelId
    );

    if (queue.songs.length === 1 && !queue.nowPlaying) {
      await playSong(queue);
      await interaction.editReply(
        `✅ **${queue.worker.name}** added to queue in **#${channelName}**: [${track.title}](${track.url})`
      );
    } else {
      await interaction.editReply(
        `✅ **${queue.worker.name}** queued in **#${channelName}**: [${track.title}](${track.url})`
      );
    }
  } catch (error) {
    logger.error(error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

async function enqueuePlaylist(interaction, url) {
  const voiceChannel = await validateInteraction(interaction);
  if (!voiceChannel) return;

  const permissions = voiceChannel.permissionsFor(interaction.client.user);
  if (
    !permissions ||
    !permissions.has("Connect") ||
    !permissions.has("Speak")
  ) {
    await interaction.reply({
      content: "I need permissions to play music!",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const data = await fetchPlaylistData(url);
    let entries = data.entries || (data._type === "playlist" ? [] : [data]);

    let truncated = false;
    if (data.title && data.title.startsWith("Mix -") && entries.length > 50) {
      entries = entries.slice(0, 50);
      truncated = true;
      logger.info(
        `Truncated autogenerated playlist '${data.title}' to 50 songs.`
      );
    }

    if (!entries.length) {
      throw new Error("Could not find any songs in this playlist.");
    }

    let queue = getQueue(voiceChannel.id);
    if (!queue) {
      const worker = await assignWorker(interaction, voiceChannel);
      if (!worker) return;

      queue = await createQueue(interaction, worker, null);
    }

    const songsToAdd = entries.map((entry) => ({
      title: entry.title || "Unknown Title",
      url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
      durationInSec: entry.duration || 0,
      requestedBy: interaction.user.tag,
    }));

    if (queue.idleTimeout) {
      clearTimeout(queue.idleTimeout);
      queue.idleTimeout = null;
      logger.info(
        `Cleared idle timeout for ${queue.voiceChannelId} - playlist added`
      );
    }

    queue.songs.push(...songsToAdd);

    if (!queue.nowPlaying && queue.songs.length === songsToAdd.length) {
      await playSong(queue);
    }

    const truncatedMsg = truncated ? " (truncated to 50 for performance)" : "";
    await interaction.editReply(
      `✅ **Added ${songsToAdd.length} songs** from playlist: **${data.title || "YouTube Playlist"
      }**${truncatedMsg}`
    );
  } catch (error) {
    logger.error(`Playlist error: ${error.message}`);
    await interaction.editReply(`❌ Failed to load playlist: ${error.message}`);
  }
}

async function toggleAutoplay(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      content: "You must be in a voice channel.",
      ephemeral: true,
    });
    return;
  }
  const queue = getQueue(voiceChannel.id);
  if (!queue) {
    await interaction.reply({
      content: "There is no active queue to enable autoplay on.",
      ephemeral: true,
    });
    return;
  }

  queue.autoplay = !queue.autoplay;

  if (queue.playingMessage) {
    try {
      const newRow = ActionRowBuilder.from(queue.playingMessage.components[0]);
      newRow.components.pop();
      newRow.addComponents(getAutoplayButton(queue.autoplay));
      await queue.playingMessage.edit({ components: [newRow] });
    } catch (error) {
      logger.error(`Failed to update autoplay button: ${error.message}`);
    }
  }

  await interaction.reply(
    `🔄 **Autoplay is now ${queue.autoplay ? "ENABLED" : "DISABLED"}**`
  );
}

async function skip(interaction) {
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
  await interaction.reply("⏭️ Skipped current track.");
}

async function stop(interaction) {
  const voiceChannel = await validateInteraction(interaction);
  if (!voiceChannel) return;
  const queue = getQueue(voiceChannel.id);
  if (!queue) {
    await interaction.reply({
      content: "Nothing to stop – the queue is already empty.",
      ephemeral: true,
    });
    return;
  }
  const channelName = await getChannelName(
    queue.worker.client,
    queue.voiceChannelId
  );
  queue.songs = [];
  queue.stopping = true;
  setVoiceStatus(queue.worker.client, queue.voiceChannelId, "");
  queue.player.stop();
  if (queue.connection) {
    queue.connection.destroy();
  }
  deleteQueue(queue.voiceChannelId);
  workerPool.releaseWorker(queue.voiceChannelId);
  await interaction.reply(
    `⏹️ **${queue.worker.name}** stopped playback in **#${channelName}** and cleared the queue.`
  );
}

async function pause(interaction) {
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
  const channelName = await getChannelName(
    queue.worker.client,
    queue.voiceChannelId
  );
  queue.player.pause();
  setVoiceStatus(
    queue.worker.client,
    queue.voiceChannelId,
    `[PAUSED] ${queue.nowPlaying.title}`
  );
  await interaction.reply(
    `⏸️ **${queue.worker.name}** paused in **#${channelName}**.`
  );
}

async function resume(interaction) {
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
  const channelName = await getChannelName(
    queue.worker.client,
    queue.voiceChannelId
  );
  queue.player.unpause();
  setVoiceStatus(
    queue.worker.client,
    queue.voiceChannelId,
    `[Playing] ${queue.nowPlaying.title}`
  );
  await interaction.reply(
    `▶️ **${queue.worker.name}** resumed in **#${channelName}**.`
  );
}

async function showQueue(interaction) {
  const voiceChannel = await validateInteraction(interaction);
  if (!voiceChannel) return;
  const queue = getQueue(voiceChannel.id);
  if (!queue || (!queue.nowPlaying && queue.songs.length === 0)) {
    await interaction.reply("The queue is empty.");
    return;
  }

  const lines = [];

  if (queue.nowPlaying) {
    lines.push(
      `▶️ **Now:** [${queue.nowPlaying.title}](${queue.nowPlaying.url
      }) — \`${formatDuration(queue.nowPlaying.durationInSec)}\``
    );
  }

  const upcoming = queue.songs.slice(1);
  if (upcoming.length) {
    lines.push("");
    lines.push("📜 **Up Next:**");
    upcoming.slice(0, 10).forEach((song, index) => {
      lines.push(
        `${index + 1}. [${song.title}](${song.url}) — \`${formatDuration(
          song.durationInSec
        )}\` • requested by **${song.requestedBy}**`
      );
    });
    if (upcoming.length > 10) {
      lines.push(`…and ${upcoming.length - 10} more.`);
    }
  }

  await interaction.reply({ content: lines.join("\n") });
}

async function nowPlaying(interaction) {
  const voiceChannel = await validateInteraction(interaction);
  if (!voiceChannel) return;
  const queue = getQueue(voiceChannel.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply("Nothing is currently playing.");
    return;
  }
  await interaction.reply(
    `▶️ **Now playing:** [${queue.nowPlaying.title}](${queue.nowPlaying.url})`
  );
}

export default {
  enqueue,
  enqueuePlaylist,
  toggleAutoplay,
  skip,
  stop,
  pause,
  resume,
  showQueue,
  nowPlaying,
  getQueues: getAllQueues,
  clearAllQueues,
};
