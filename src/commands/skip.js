import { SlashCommandBuilder } from "discord.js";
import music from "../core/musicPlayer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song."),
  async execute(interaction) {
    await music.skip(interaction);
  }
};
