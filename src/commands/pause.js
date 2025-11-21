import { SlashCommandBuilder } from "discord.js";
import music from "../core/musicPlayer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current track."),
  async execute(interaction) {
    await music.pause(interaction);
  }
};
