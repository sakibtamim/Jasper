const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current track."),
  async execute(interaction) {
    await music.pause(interaction);
  }
};
