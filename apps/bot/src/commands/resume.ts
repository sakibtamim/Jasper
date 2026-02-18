import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the current song"),
  async execute(interaction: ChatInputCommandInteraction) {
    await music.resume(interaction);
  },
};
