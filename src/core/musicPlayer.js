const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");
const playdl = require("play-dl");
const logger = require("./logger");

/**
 * Guild music queues
 * Map<guildId, { voiceChannel, textChannel, connection, player, songs: Array, nowPlaying }>
 */
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
    selfDeaf: true
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });

  const queue = {
    voiceChannel,
    textChannel: interaction.channel,
    connection,
    player,
    songs: [],
    nowPlaying: null
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
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(queue);
    }
  });

  queues.set(voiceChannel.guild.id, queue);
  return queue;
}

async function resolveTrack(query) {
  let video;

  // If it's a valid YouTube URL, use it directly; otherwise search
  const validated = playdl.yt_validate(query);
  if (validated === "video" || validated === "shorts") {
    video = await playdl.video_info(query);
  } else {
    const results = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
    if (!results.length) {
      throw new Error("No results found on YouTube.");
    }
    video = await playdl.video_info(results[0].url);
  }

  return {
    title: video.video_details.title,
    url: video.video_details.url,
    durationInSec: video.video_details.durationInSec
  };
}

async function playSong(queue) {
  const song = queue.songs[0];
  if (!song) return;

  const stream = await playdl.stream(song.url, { discordPlayerCompatibility: true });
  const resource = createAudioResource(stream.stream, { inputType: stream.type });

  queue.player.play(resource);
  queue.nowPlaying = song;

  logger.info(`Now playing in ${queue.voiceChannel.guild.name}: ${song.title}`);
  if (queue.textChannel) {
    queue.textChannel.send({
      content: `▶️ **Now playing:** [${song.title}](${song.url})`
    }).catch(() => {});
  }
}

async function enqueue(interaction, query) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({ content: "You must be in a voice channel to summon Jasper.", ephemeral: true });
    return;
  }

  const permissions = voiceChannel.permissionsFor(interaction.client.user);
  if (!permissions || !permissions.has("Connect") || !permissions.has("Speak")) {
    await interaction.reply({ content: "I need the **Connect** and **Speak** permissions to play music!", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const track = await resolveTrack(query);
  let queue = getQueue(interaction.guild.id);

  if (!queue) {
    queue = createQueue(interaction);
  }

  queue.songs.push({
    ...track,
    requestedBy: interaction.user.tag
  });

  if (queue.songs.length === 1 && !queue.nowPlaying) {
    await playSong(queue);
    await interaction.editReply(`▶️ **Now playing:** [${track.title}](${track.url})`);
  } else {
    await interaction.editReply(`✅ **Queued:** [${track.title}](${track.url})`);
  }
}

async function skip(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply({ content: "There's nothing playing to skip.", ephemeral: true });
    return;
  }
  queue.player.stop(true);
  await interaction.reply("⏭️ Skipped current track.");
}

async function stop(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue) {
    await interaction.reply({ content: "Nothing to stop – the queue is already empty.", ephemeral: true });
    return;
  }
  queue.songs = [];
  queue.player.stop(true);
  queue.connection.destroy();
  queues.delete(interaction.guild.id);
  await interaction.reply("⏹️ Stopped playback and cleared the queue.");
}

async function pause(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply({ content: "There's nothing playing to pause.", ephemeral: true });
    return;
  }
  queue.player.pause();
  await interaction.reply("⏸️ Paused.");
}

async function resume(interaction) {
  const queue = getQueue(interaction.guild.id);
  if (!queue || !queue.nowPlaying) {
    await interaction.reply({ content: "There's nothing paused to resume.", ephemeral: true });
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
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
    lines.push(`▶️ **Now:** [${queue.nowPlaying.title}](${queue.nowPlaying.url}) — \`${formatDuration(queue.nowPlaying.durationInSec)}\``);
  }

  const upcoming = queue.songs.slice(1);
  if (upcoming.length) {
    lines.push("");
    lines.push("📜 **Up Next:**");
    upcoming.slice(0, 10).forEach((song, index) => {
      lines.push(`${index + 1}. [${song.title}](${song.url}) — \`${formatDuration(song.durationInSec)}\` • requested by **${song.requestedBy}**`);
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
  await interaction.reply(`▶️ **Now playing:** [${queue.nowPlaying.title}](${queue.nowPlaying.url})`);
}

module.exports = {
  enqueue,
  skip,
  stop,
  pause,
  resume,
  showQueue,
  nowPlaying
};
