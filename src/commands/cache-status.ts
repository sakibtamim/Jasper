import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { isCacheEnabled, getCacheStorage } from "../core/cache-manager.js";
import logger from "../core/logger.js";
import config from "../config/config.js";

export default {
    data: new SlashCommandBuilder()
        .setName("cache-status")
        .setDescription("📊 View current cache statistics (size, usage)"),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!isCacheEnabled()) {
            await interaction.reply({
                content: "⚠️ **Caching is currently disabled.**\nEnable it in the `.env` file to see statistics.",
                ephemeral: true
            });
            return;
        }

        const storage = getCacheStorage();
        if (!storage) {
            await interaction.reply({
                content: "❌ **Cache storage not initialized.**",
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            const stats = await storage.getCacheStats();

            const embed = new EmbedBuilder()
                .setColor(config.accentColor)
                .setTitle("📦 Cache Status")
                .setDescription("Current statistics for the local file cache.")
                .addFields(
                    {
                        name: "🔍 Search Cache",
                        value: `**${stats.searchCacheSize}** entries`,
                        inline: true
                    },
                    {
                        name: "🎵 Audio Cache",
                        value: `**${stats.audioCacheFiles}** files`,
                        inline: true
                    },
                    {
                        name: "💾 Total Size",
                        value: `**${stats.audioCacheSizeMB.toFixed(2)} MB**`,
                        inline: true
                    },
                    {
                        name: "⚙️ Configuration",
                        value: [
                            `• Search TTL: **${process.env.CACHE_SEARCH_TTL_HOURS || 168}h**`,
                            `• Audio TTL: **${process.env.CACHE_AUDIO_TTL_HOURS || 72}h**`,
                            `• Cleanup: Every **${process.env.CACHE_CLEANUP_INTERVAL_HOURS || 1}h**`
                        ].join("\n"),
                        inline: false
                    }
                )
                .setFooter({ text: "Jasper Cache Manager" })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[CacheStatus] Error fetching stats: ${msg}`);
            await interaction.editReply({
                content: `❌ **Failed to retrieve cache stats:** ${msg}`
            });
        }
    },
};
