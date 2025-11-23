import { SlashCommandBuilder } from "discord.js";
import playlistCommand from "./playlist.js";

export default {
    data: new SlashCommandBuilder()
        .setName("pl")
        .setDescription("Alias for /playlist")
        .addStringOption(option =>
            option
                .setName("url")
                .setDescription("The YouTube playlist URL")
                .setRequired(true)
        ),
    execute: playlistCommand.execute,
};
