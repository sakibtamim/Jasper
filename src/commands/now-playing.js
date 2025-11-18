const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show the song currently playing."),
  async execute(interaction) {
    await music.nowPlaying(interaction);
  }
};
