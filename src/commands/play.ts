import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import music from "../core/music-player.js";
import ytSearch from "yt-search";

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube or search by keywords.")
    .addStringOption(
      (option) =>
        option
          .setName("query")
          .setDescription("Search term or URL")
          .setRequired(true)
          .setAutocomplete(true) // <--- Enables the suggestions
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();

    // Don't search if the input is empty
    if (!focusedValue) return;

    try {
      // Search YouTube for the typed value
      const result = await ytSearch(focusedValue);

      // Discord allows max 25 choices
      // We map the results to show the Title but send the URL as the value
      const choices = result.videos.slice(0, 25).map((video) => ({
        name: video.title.substring(0, 100), // Limit name to 100 chars
        value: video.url,
      }));

      await interaction.respond(choices);
    } catch (error) {
      console.error(`Autocomplete failed for query "${focusedValue}":`, error);
      await interaction.respond([]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString("query", true);

    // Fix for Issue #10: Detect playlist URLs and reject them
    // This prevents the bot from hanging when trying to process a whole playlist
    if (/[?&]list=([^#\&\?]+)/.test(query)) {
      await interaction.reply({
        content: "🚫 **Playlist links are not supported in /play.**\nPlease use `/playlist` for playlists!",
        ephemeral: true,
      });
      return;
    }

    await music.enqueue(interaction, query);
  },
};
