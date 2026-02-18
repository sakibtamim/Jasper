import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue"),
  async execute(interaction: ChatInputCommandInteraction) {
    await music.showQueue(interaction);
  },
};
