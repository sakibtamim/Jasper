import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song"),
  async execute(interaction: ChatInputCommandInteraction) {
    await music.pause(interaction);
  },
};
