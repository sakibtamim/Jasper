import { SlashCommandBuilder } from "discord.js";
import music from "../core/musicPlayer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Toggle autoplay to keep the music going!"),
  async execute(interaction) {
    await music.toggleAutoplay(interaction);
  }
};