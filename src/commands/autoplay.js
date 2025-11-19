const { SlashCommandBuilder } = require("discord.js");
const music = require("../core/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Toggle autoplay to keep the music going!"),
  async execute(interaction) {
    await music.toggleAutoplay(interaction);
  }
};