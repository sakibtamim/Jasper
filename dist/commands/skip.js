import { SlashCommandBuilder } from "discord.js";
import music from "../core/music-player.js";
export default {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song"),
    async execute(interaction) {
        await music.skip(interaction);
    }
};
