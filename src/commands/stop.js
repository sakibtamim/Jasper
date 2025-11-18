const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and clear the queue."),
  async execute(interaction) {
    await music.stop(interaction);
  }
};
