import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import musicPlayer from "../core/music-player.js";
import workerPool from "../core/worker-pool.js";
import logger from "../core/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName("catastrophic-reset")
        .setDescription("🚨 Emergency: Clear all queues and reset all bots to idle"),

    async execute(interaction: ChatInputCommandInteraction) {
        logger.info(`[catastrophicreset] Initiated by ${interaction.user.tag}`);

        // Clear all queues and connections
        musicPlayer.clearAllQueues();

        // Release all workers
        workerPool.releaseAllWorkers();

        await interaction.reply({
            content:
                "🔥 **CATASTROPHIC RESET COMPLETE**\n" +
                "✅ All queues cleared\n" +
                "✅ All bots disconnected\n" +
                "✅ All workers reset to idle\n" +
                "✅ All voice statuses cleared",
            ephemeral: false,
        });

        logger.info("[catastrophicreset] Reset complete");
    },
};
