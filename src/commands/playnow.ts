import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import music from "../core/music-player.js";
import ytSearch from "yt-search";
import logger from "../core/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName("playnow")
        .setDescription("Skip current song and play this immediately.")
        .addStringOption(
            (option) =>
                option
                    .setName("query")
                    .setDescription("Search term or URL")
                    .setRequired(true)
                    .setAutocomplete(true)
        ),

    async autocomplete(interaction: AutocompleteInteraction) {
        const focusedValue = interaction.options.getFocused();

        if (!focusedValue) return;

        try {
            const result = await ytSearch(focusedValue);

            const choices = result.videos.slice(0, 25).map((video) => ({
                name: video.title.substring(0, 100),
                value: video.url,
            }));

            await interaction.respond(choices);
        } catch (error) {
            logger.error(`[commands] Autocomplete failed for query "${focusedValue}": ${error instanceof Error ? error.message : String(error)}`, { suppressOnWebUI: true });
            await interaction.respond([]);
        }
    },

    async execute(interaction: ChatInputCommandInteraction) {
        let query = interaction.options.getString("query", true);
        let playlistWarning = null;

        if (query.includes("list=") && (query.includes("youtube.com") || query.includes("youtu.be"))) {
            try {
                const urlToParse = query.startsWith("http") ? query : `https://${query}`;
                const urlObj = new URL(urlToParse);
                urlObj.searchParams.delete("list");
                urlObj.searchParams.delete("index");
                urlObj.searchParams.delete("start_radio");
                query = urlObj.toString();

                playlistWarning = "⚠️ **I'm only playing the first song.**\nIf you want to queue the whole playlist, please use `/playlist`!";
            } catch (error) {
                logger.warn(`Failed to parse/clean URL in /playnow command: ${error}`);
            }
        }

        await music.enqueue(interaction, query, { position: 'next', skipCurrent: true });

        if (playlistWarning) {
            await interaction.followUp({
                content: playlistWarning,
                ephemeral: true,
            });
        }
    },
};
