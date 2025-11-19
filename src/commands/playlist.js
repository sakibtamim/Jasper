const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Add a YouTube playlist to the queue.")
    .addStringOption(option =>
      option
        .setName("url")
        .setDescription("The YouTube playlist URL")
        .setRequired(true)
    ),
  async execute(interaction) {
    const url = interaction.options.getString("url", true);
    await music.enqueuePlaylist(interaction, url);
  }
};