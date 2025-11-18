const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue."),
  async execute(interaction) {
    await music.showQueue(interaction);
  }
};
