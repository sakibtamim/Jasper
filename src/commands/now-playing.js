import { SlashCommandBuilder } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show the song currently playing."),
  async execute(interaction) {
    await music.nowPlaying(interaction);
  }
};
