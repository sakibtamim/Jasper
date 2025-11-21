import { SlashCommandBuilder } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and clear the queue."),
  async execute(interaction) {
    await music.stop(interaction);
  }
};
