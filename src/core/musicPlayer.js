const { spawn } = require("child_process"); // Required to run yt-dlp
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
  };

  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(queue);
    } else {
      queue.nowPlaying = null;
    }
  });

  player.on("error", (error) => {
    logger.error(`Audio player error: ${error.message}`);
    // Skip the broken song and try the next one
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(queue);
    }
  });

  queues.set(voiceChannel.guild.id, queue);
  return queue;
}

async function resolveTrack(query) {
  // 1. Search using yt-search (It is reliable for finding videos)
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

async function playSong(queue) {
  const song = queue.songs[0];
  if (!song) return;

  try {
    logger.info(`Attempting to stream with yt-dlp: ${song.title}`);

    // ----------------------------------------------------------
    // EXTERNAL STREAMING: Spawn yt-dlp process
    // ----------------------------------------------------------

    // Point to the yt-dlp.exe in your root folder
    const ytDlpPath = path.resolve(__dirname, "../../yt-dlp.exe");

    // Arguments:
    // -f bestaudio: Get best audio
    // -o - : Output to stdout (standard output) so we can pipe it
    // -q : Quiet mode (don't log to console)
    const args = ["-f", "bestaudio", "-o", "-", "-q", song.url];

    const ytDlpProcess = spawn(ytDlpPath, args);

    // Handle spawn errors (e.g., file not found)
    ytDlpProcess.on("error", (err) => {
      logger.error(`Failed to spawn yt-dlp: ${err.message}`);
      logger.warn("Make sure yt-dlp.exe is in the root folder!");
      // Manually trigger skip
      queue.player.emit("error", new Error("yt-dlp spawn failed"));
    });

    // Create resource from the process output (stdout)
    // We turn off volume control for performance (inlineVolume: false)
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
  skip,
  stop,
  pause,
  resume,
  showQueue,
  nowPlaying,
};
