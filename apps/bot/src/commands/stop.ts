import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the music and clear the queue"),
  async execute(interaction: ChatInputCommandInteraction) {
    await music.stop(interaction);
  },
};
