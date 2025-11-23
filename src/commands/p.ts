import { SlashCommandBuilder } from "discord.js";
import playCommand from "./play.js";

export default {
    data: new SlashCommandBuilder()
        .setName("p")
        .setDescription("Alias for /play")
        .addStringOption(
            (option) =>
                option
                    .setName("query")
                    .setDescription("Search term or URL")
                    .setRequired(true)
                    .setAutocomplete(true)
        ),
    autocomplete: playCommand.autocomplete,
    execute: playCommand.execute,
};
