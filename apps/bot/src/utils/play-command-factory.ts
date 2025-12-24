import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import music from "../core/music-player.js";
import ytSearch from "yt-search";
import logger from "../core/logger.js";

interface PlayCommandOptions {
    position?: 'next' | 'end';
    skipCurrent?: boolean;
}

// Supported audio file extensions for attachments
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.webm', '.opus'];
const SUPPORTED_AUDIO_CONTENT_TYPES = ['audio/', 'video/webm', 'video/ogg'];

function isAudioFile(filename: string, contentType: string | null): boolean {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    const hasValidExtension = SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
    const hasValidContentType = contentType ? SUPPORTED_AUDIO_CONTENT_TYPES.some(type => contentType.startsWith(type)) : false;
    return hasValidExtension || hasValidContentType;
}

export function createPlayCommand(name: string, description: string, options: PlayCommandOptions = {}) {
    return {
        data: new SlashCommandBuilder()
            .setName(name)
            .setDescription(description)
            .addStringOption(
                (option) =>
                    option
                        .setName("query")
                        .setDescription("Search term or URL")
                        .setRequired(false)
                        .setAutocomplete(true)
            )
            .addAttachmentOption(
                (option) =>
                    option
                        .setName("file")
                        .setDescription("Audio file to play (mp3, ogg, wav, flac, m4a)")
                        .setRequired(false)
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
            const attachment = interaction.options.getAttachment("file");
            let query = interaction.options.getString("query");
            let playlistWarning = null;

            // Validate that at least one input is provided
            if (!attachment && !query) {
                await interaction.reply({
                    content: "❌ Please provide either a search query/URL or an audio file attachment.",
                    ephemeral: true,
                });
                return;
            }

            // If attachment is provided, validate and use it
            if (attachment) {
                if (!isAudioFile(attachment.name, attachment.contentType)) {
                    await interaction.reply({
                        content: `❌ The attached file \`${attachment.name}\` is not a supported audio format.\nSupported formats: ${SUPPORTED_AUDIO_EXTENSIONS.join(', ')}`,
                        ephemeral: true,
                    });
                    return;
                }

                // Use attachment URL as the query
                query = attachment.url;
                logger.info(`[commands] /${name}: Playing from attachment: ${attachment.name}`);
            } else if (query) {
                // Handle playlist URL warning for YouTube links
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
                        logger.warn(`Failed to parse/clean URL in /${name} command: ${error}`);
                    }
                }
            }

            await music.enqueue(interaction, query!, options);

            if (playlistWarning) {
                await interaction.followUp({
                    content: playlistWarning,
                    ephemeral: true,
                });
            }
        },
    };
}
