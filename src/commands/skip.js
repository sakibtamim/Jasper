const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song."),
  async execute(interaction) {
    await music.skip(interaction);
  }
};
