const { EmbedBuilder } = require("discord.js");
const { botName, color, accentColor } = require("../../config/config");

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: botName });
}

function helpEmbed() {
  return baseEmbed()
    .setTitle("Jasper Help")
    .setDescription("Meow! I'm Jasper, your fluffy music companion. Here are my main commands:")
    .addFields(
      { name: "/play <query>", value: "Play a YouTube URL or search keyword." },
      { name: "/pause", value: "Pause the current track." },
      { name: "/resume", value: "Resume the paused track." },
      { name: "/skip", value: "Skip the current track." },
      { name: "/stop", value: "Stop playback and clear the queue." },
      { name: "/queue", value: "Show the current music queue." },
      { name: "/nowplaying", value: "Show what's currently playing." }
    )
    .setColor(accentColor);
}

module.exports = {
  baseEmbed,
  helpEmbed
};
