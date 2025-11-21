const { SlashCommandBuilder } = require("discord.js");
const musicPlayer = require("../core/musicPlayer");
const workerPool = require("../core/workerPool");
const logger = require("../core/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("catastrophic-reset")
        .setDescription("🚨 Emergency: Clear all queues and reset all bots to idle"),

    async execute(interaction) {
        logger.info(`[CatastrophicReset] Initiated by ${interaction.user.tag}`);

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

        logger.info("[CatastrophicReset] Reset complete");
    },
};
