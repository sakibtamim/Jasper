const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the paused track."),
  async execute(interaction) {
    await music.resume(interaction);
  }
};
