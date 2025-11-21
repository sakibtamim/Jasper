import { SlashCommandBuilder } from "discord.js";
import music from "../core/musicPlayer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the paused track."),
  async execute(interaction) {
    await music.resume(interaction);
  }
};
