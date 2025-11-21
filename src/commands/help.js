import { SlashCommandBuilder } from "discord.js";
import { helpEmbed } from "../utils/embed-factory.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show information about Jasper's commands."),
  async execute(interaction) {
    await interaction.reply({ embeds: [helpEmbed()] });
  }
};
