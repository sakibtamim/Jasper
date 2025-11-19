const { spawn } = require("child_process");
const path = require("path");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
} = require("@discordjs/voice");
const ytSearch = require("yt-search");
const logger = require("./logger");

const queues = new Map();

// Helper: Get the path to the local yt-dlp.exe
function getYtDlpPath() {
  return path.resolve(__dirname, "../../yt-dlp.exe");
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
    autoplay: false, // <--- NEW: Autoplay state
  };

  connection.subscribe(player);

  // EVENT: Song Finished
  player.on(AudioPlayerStatus.Idle, async () => {
    const lastSong = queue.nowPlaying;
    queue.songs.shift();

    if (queue.songs.length > 0) {
      playSong(queue);
    } else if (queue.autoplay && lastSong) {
      // <--- NEW: Handle Autoplay
      await handleAutoplay(queue, lastSong);
    } else {
      queue.nowPlaying = null;
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

// NEW: Logic to find and play a related song
async function handleAutoplay(queue, lastSong) {
  try {
    if (queue.textChannel) {
      queue.textChannel
        .send("🔄 **Autoplay:** Finding a related song...")
        .catch(() => {});
    }

    // Search for the last song title to find related content
    // We look for a 'Mix' or just similar results
    const searchResult = await ytSearch(lastSong.title);

    if (!searchResult || !searchResult.videos.length) {
      if (queue.textChannel)
        queue.textChannel.send("Could not find a related song to autoplay.");
      return;
    }

    // Try to pick a video that isn't the exact same URL
    // We pick from the top 5 results to get something relevant
    let nextVideo =
      searchResult.videos.find((v) => v.url !== lastSong.url) ||
      searchResult.videos[0];

    // If we still have the same song (rare), just pick the second one
    if (nextVideo.url === lastSong.url && searchResult.videos.length > 1) {
      nextVideo = searchResult.videos[1];
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

async function resolveTrack(query) {
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

// Helper to fetch playlist data
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
    logger.info(`Attempting to stream: ${song.title}`);

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
    if (queue.textChannel) {
      queue.textChannel
        .send({
          content: `▶️ **Now playing:** [${song.title}](${song.url})`,
        })
        .catch(() => {});
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
    const entries = data.entries || (data._type === "playlist" ? [] : [data]);

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

    await interaction.editReply(
      `✅ **Added ${songsToAdd.length} songs** from playlist: **${
        data.title || "YouTube Playlist"
      }**`
    );
  } catch (error) {
    logger.error(`Playlist error: ${error.message}`);
    await interaction.editReply(`❌ Failed to load playlist: ${error.message}`);
  }
}

// NEW: Toggle Autoplay Function
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
  toggleAutoplay, // <--- Exported new function
  skip,
  stop,
  pause,
  resume,
  showQueue,
  nowPlaying,
};
