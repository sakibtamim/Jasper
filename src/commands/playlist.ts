import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Add a YouTube playlist to the queue.")
    .addStringOption(option =>
      option
        .setName("url")
        .setDescription("The YouTube playlist URL")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url", true);
    await music.enqueuePlaylist(interaction, url);
  }
};