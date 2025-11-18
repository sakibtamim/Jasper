const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube or search by keywords.")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("YouTube URL or search term")
        .setRequired(true)
    ),
  async execute(interaction) {
    const query = interaction.options.getString("query", true);
    await music.enqueue(interaction, query);
  }
};
