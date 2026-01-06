import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import music from "../core/music-player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Start playing random songs from the cache."),

  async execute(interaction: ChatInputCommandInteraction) {
    await music.startRadio(interaction);
  },
};
