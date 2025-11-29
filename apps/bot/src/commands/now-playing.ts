import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show the currently playing song"),
  async execute(interaction: ChatInputCommandInteraction) {
    await music.nowPlaying(interaction);
  }
};
