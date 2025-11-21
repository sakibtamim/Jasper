import { SlashCommandBuilder } from "discord.js";
import music from "../core/musicPlayer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue."),
  async execute(interaction) {
    await music.showQueue(interaction);
  }
};
