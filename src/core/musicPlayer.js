const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
} = require("@discordjs/voice");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const ytSearch = require("yt-search");
const logger = require("./logger");

const queues = new Map();

const { findYtDlpPath } = require("../utils/ytDlpHelper");

// Helper: Get the path to the local yt-dlp.exe
function getYtDlpPath() {
  const path = findYtDlpPath();
  if (path) return path;

  // If nothing was found, throw an informative error
  throw new Error(
    "yt-dlp not found. Please install yt-dlp and ensure it is on your PATH, or add a static yt-dlp binary next to the app."
  );
}

async function setVoiceStatus(channel, status) {
  if (!channel) return;

  try {
    // Truncate to 500 chars just in case
    const safeStatus = status.substring(0, 500);

    // Use Raw API: /channels/{id}/voice-status
    await channel.client.rest.put(`/channels/${channel.id}/voice-status`, {
      body: { status: safeStatus },
    });
  } catch (error) {
    logger.warn(`Failed to set voice channel status: ${error.message}`);
  }
}

function getQueue(guildId) {
  return queues.get(guildId);
}

function createQueue(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    throw new Error("You must be in a voice channel to use this command.");
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  const queue = {
    voiceChannel,
    textChannel: interaction.channel,
    connection,
    player,
    songs: [],
    nowPlaying: null,
    autoplay: false,
  };

  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, async () => {
    const lastSong = queue.nowPlaying;
    queue.songs.shift();

    if (queue.songs.length > 0) {
      playSong(queue);
    } else if (queue.autoplay && lastSong) {
      await handleAutoplay(queue, lastSong);
    } else {
      queue.nowPlaying = null;
      setVoiceStatus(queue.voiceChannel, "");
    }
  });

  player.on("error", (error) => {
    logger.error(`Audio player error: ${error.message}`);
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(queue);
    }
  });

  queues.set(voiceChannel.guild.id, queue);
  return queue;
}

// Helper: Generate random search queries for varied music
function getRandomMusicQuery() {
  const queries = [
    "popular music 2024",
    "trending songs",
    "top hits",
    "best music",
    "viral songs",
    "popular songs",
    "music hits",
    "top music",
    "trending music",
    "popular hits",
  ];
  return queries[Math.floor(Math.random() * queries.length)];
}

async function handleAutoplay(queue, lastSong) {
  try {
    if (queue.textChannel) {
      queue.textChannel
        .send("🔄 **Autoplay:** Finding a new song...")
        .catch(() => {});
    }

    // Search for varied music instead of the same song
    const searchQuery = getRandomMusicQuery();
    const searchResult = await ytSearch(searchQuery);

    if (!searchResult || !searchResult.videos.length) {
      if (queue.textChannel)
        queue.textChannel.send("Could not find a song to autoplay.");
      return;
    }

    // Pick a random video from the results (not just the first one)
    const randomIndex = Math.floor(
      Math.random() * Math.min(10, searchResult.videos.length)
    );
    let nextVideo = searchResult.videos[randomIndex];

    // Ensure we don't play the same song that just finished
    if (nextVideo.url === lastSong.url && searchResult.videos.length > 1) {
      const alternateIndex =
        (randomIndex + 1) % Math.min(10, searchResult.videos.length);
      nextVideo = searchResult.videos[alternateIndex];
    }

    const track = {
      title: nextVideo.title,
      url: nextVideo.url,
      durationInSec: nextVideo.seconds,
      requestedBy: "Jasper (Autoplay)",
    };

    queue.songs.push(track);
    playSong(queue);
  } catch (error) {
    logger.error(`Autoplay error: ${error.message}`);
    if (queue.textChannel)
      queue.textChannel.send("❌ Failed to autoplay next song.");
  }
}

function isUrl(text) {
  return text.includes("youtube.com") || text.includes("youtu.be");
}

function fetchVideoData(url) {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    // -J: Dump JSON metadata
    const args = ["-J", url];

    const process = spawn(ytDlpPath, args);
    let data = "";
    let error = "";

    process.stdout.on("data", (chunk) => (data += chunk));
    process.stderr.on("data", (chunk) => (error += chunk));

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed: ${error}`));
      } else {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error("Failed to parse video JSON"));
        }
      }
    });
  });
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

function fetchPlaylistData(url) {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const args = ["--flat-playlist", "-J", url];

    const process = spawn(ytDlpPath, args);
    let data = "";
    let error = "";

    process.stdout.on("data", (chunk) => (data += chunk));
    process.stderr.on("data", (chunk) => (error += chunk));

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed: ${error}`));
      } else {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error("Failed to parse playlist JSON"));
        }
      }
    });
  });
}

async function playSong(queue) {
  const song = queue.songs[0];
  if (!song) return;

  try {
    logger.info(`Attempting to stream with yt-dlp: ${song.title}`);

    const ytDlpPath = getYtDlpPath();
    const args = ["-f", "bestaudio", "-o", "-", "-q", song.url];

    const ytDlpProcess = spawn(ytDlpPath, args);

    ytDlpProcess.on("error", (err) => {
      logger.error(`Failed to spawn yt-dlp: ${err.message}`);
      queue.player.emit("error", new Error("yt-dlp spawn failed"));
    });

    const resource = createAudioResource(ytDlpProcess.stdout, {
      inputType: StreamType.Arbitrary,
      inlineVolume: false,
    });

    queue.player.play(resource);
    queue.nowPlaying = song;

    logger.info(
      `Now playing in ${queue.voiceChannel.guild.name}: ${song.title}`
    );

    setVoiceStatus(queue.voiceChannel, `[Playing] ${song.title}`);

    // -------------------------------------------------------
    // NEW: BUTTONS SETUP
    // -------------------------------------------------------
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("pause_resume")
        .setLabel("⏸️ Pause")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("skip")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("⏹️ Stop")
        .setStyle(ButtonStyle.Danger)
    );

    let playingMessage;
    if (queue.textChannel) {
      playingMessage = await queue.textChannel
        .send({
          content: `▶️ **Now playing:** [${song.title}](${song.url})`,
          components: [row],
        })
        .catch(() => {});
    }

    // Setup Collector to handle button clicks
    if (playingMessage) {
      const collector = playingMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: song.durationInSec > 0 ? song.durationInSec * 1000 : 3600000, // Listen until song ends
      });

      collector.on("collect", async (i) => {
        // Security: Ensure clicker is in the same voice channel
        if (
          !i.member.voice.channelId ||
          i.member.voice.channelId !== queue.voiceChannel.id
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
              queue.voiceChannel,
              `[Playing] ${queue.nowPlaying.title}`
            );
            // Update button to show "Pause" again
            const newRow = ActionRowBuilder.from(playingMessage.components[0]);
            newRow.components[0]
              .setLabel("⏸️ Pause")
              .setStyle(ButtonStyle.Secondary);
            await i.update({ components: [newRow] });
          } else {
            queue.player.pause();
            setVoiceStatus(
              queue.voiceChannel,
              `[PAUSED] ${queue.nowPlaying.title}`
            );
            // Update button to show "Resume"
            const newRow = ActionRowBuilder.from(playingMessage.components[0]);
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
          setVoiceStatus(queue.voiceChannel, "");
          queue.songs = [];
          queue.player.stop();
          if (queue.connection) queue.connection.destroy();
          queues.delete(queue.voiceChannel.guild.id);
          collector.stop();
        }
      });

      // Disable buttons when the song ends
      collector.on("end", () => {
        try {
          const disabledRow = ActionRowBuilder.from(
            playingMessage.components[0]
          );
          disabledRow.components.forEach((btn) => btn.setDisabled(true));
          playingMessage.edit({ components: [disabledRow] }).catch(() => {});
        } catch (e) {
          // Message might have been deleted, ignore
        }
      });
    }
  } catch (error) {
    logger.error(`Failed to play song: ${error.message}`);
    queue.songs.shift();
    playSong(queue);
  }
}

async function enqueue(interaction, query) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      content: "You must be in a voice channel to summon Jasper.",
      ephemeral: true,
    });
    return;
  }

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
    let queue = getQueue(interaction.guild.id);

    if (!queue) {
      queue = createQueue(interaction);
    }

    queue.songs.push({
      ...track,
      requestedBy: interaction.user.tag,
    });

    if (queue.songs.length === 1 && !queue.nowPlaying) {
      await playSong(queue);
      await interaction.editReply(
        `▶️ **Now playing:** [${track.title}](${track.url})`
      );
    } else {
      await interaction.editReply(
        `✅ **Queued:** [${track.title}](${track.url})`
      );
    }
  } catch (error) {
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

async function enqueuePlaylist(interaction, url) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      content: "You must be in a voice channel.",
      ephemeral: true,
    });
    return;
  }

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
    // Feature 2: Truncate autogenerated playlists (e.g. "Mix - ...")
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

    let queue = getQueue(interaction.guild.id);
    if (!queue) {
      queue = createQueue(interaction);
    }

    const songsToAdd = entries.map((entry) => ({
      title: entry.title || "Unknown Title",
      url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
      durationInSec: entry.duration || 0,
      requestedBy: interaction.user.tag,
    }));

    queue.songs.push(...songsToAdd);

    if (!queue.nowPlaying && queue.songs.length === songsToAdd.length) {
      await playSong(queue);
    }

    const truncatedMsg = truncated ? " (truncated to 50 for performance)" : "";
    await interaction.editReply(
      `✅ **Added ${songsToAdd.length} songs** from playlist: **${
        data.title || "YouTube Playlist"
      }**${truncatedMsg}`
    );
  } catch (error) {
    logger.error(`Playlist error: ${error.message}`);
    await interaction.editReply(`❌ Failed to load playlist: ${error.message}`);
  }
}

async function toggleAutoplay(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue) {
    await interaction.reply({
      content: "There is no active queue to enable autoplay on.",
      ephemeral: true,
    });
    return;
  }

  queue.autoplay = !queue.autoplay;
  await interaction.reply(
    `🔄 **Autoplay is now ${queue.autoplay ? "ENABLED" : "DISABLED"}**`
  );
}

async function skip(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply({
      content: "There's nothing playing to skip.",
      ephemeral: true,
    });
    return;
  }
  queue.player.stop(true);
  await interaction.reply("⏭️ Skipped current track.");
}

async function stop(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue) {
    await interaction.reply({
      content: "Nothing to stop – the queue is already empty.",
      ephemeral: true,
    });
    return;
  }
  queue.songs = [];
  setVoiceStatus(queue.voiceChannel, "");
  queue.player.stop(true);
  if (queue.connection) {
    queue.connection.destroy();
  }
  queues.delete(interaction.guild.id);
  await interaction.reply("⏹️ Stopped playback and cleared the queue.");
}

async function pause(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply({
      content: "There's nothing playing to pause.",
      ephemeral: true,
    });
    return;
  }
  queue.player.pause();
  setVoiceStatus(queue.voiceChannel, `[PAUSED] ${queue.nowPlaying.title}`);
  await interaction.reply("⏸️ Paused.");
}

async function resume(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply({
      content: "There's nothing paused to resume.",
      ephemeral: true,
    });
    return;
  }
  queue.player.unpause();
  setVoiceStatus(queue.voiceChannel, `[Playing] ${queue.nowPlaying.title}`);
  await interaction.reply("▶️ Resumed.");
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function showQueue(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue || (!queue.nowPlaying && queue.songs.length === 0)) {
    await interaction.reply("The queue is empty.");
    return;
  }

  const lines = [];

  if (queue.nowPlaying) {
    lines.push(
      `▶️ **Now:** [${queue.nowPlaying.title}](${
        queue.nowPlaying.url
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
  const queue = getQueue(interaction.guild.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply("Nothing is currently playing.");
    return;
  }
  await interaction.reply(
    `▶️ **Now playing:** [${queue.nowPlaying.title}](${queue.nowPlaying.url})`
  );
}

module.exports = {
  enqueue,
  enqueuePlaylist,
  toggleAutoplay,
  skip,
  stop,
  pause,
  resume,
  showQueue,
  nowPlaying,
};
