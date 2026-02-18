import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Toggle autoplay to keep the music going!"),
  async execute(interaction: ChatInputCommandInteraction) {
    await music.toggleAutoplay(interaction);
  },
};
