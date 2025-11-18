const { SlashCommandBuilder } = require("discord.js");
const { helpEmbed } = require("../utils/embedFactory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show information about Jasper's commands."),
  async execute(interaction) {
    await interaction.reply({ embeds: [helpEmbed()] });
  }
};
