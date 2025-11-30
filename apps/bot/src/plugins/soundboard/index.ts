import { PluginContext } from "@jasper/types";
import { registerCommand, handleAutocomplete, handleButtonInteraction, handleModalSubmit } from "./commands/soundboard.js";
import { registerRoutes } from "./routes.js";
import { Interaction } from "discord.js";

let interactionHandler: (interaction: Interaction) => Promise<void>;

const soundboardPlugin = {
    name: "soundboard",
    version: "1.0.0",
    onLoad: async (context: PluginContext) => {
        context.logger.info("Jasper Soundboard loaded!");
        registerRoutes(context);
        registerCommand(context);

        interactionHandler = async (interaction: Interaction) => {
            if (interaction.isAutocomplete() && interaction.commandName === 'soundboard') {
                await handleAutocomplete(interaction, context);
            } else if (interaction.isButton()) {
                await handleButtonInteraction(interaction, context);
            } else if (interaction.isModalSubmit()) {
                await handleModalSubmit(interaction, context);
            }
        };

        context.client.on('interactionCreate', interactionHandler);

        // Schedule cleanup task (every 1 hour)
        context.scheduleTask(60 * 60 * 1000, async () => {
            await cleanupOrphanedFiles(context);
        });
    },
    onUnload: async (context: PluginContext) => {
        if (interactionHandler) {
            context.client.off('interactionCreate', interactionHandler);
        }
        context.logger.info("Jasper Soundboard unloaded!");
    }
};

async function cleanupOrphanedFiles(context: PluginContext) {
    try {
        const files = await context.storage.list();
        const sounds = (await context.db.plugin.get("sounds") as any[]) || [];
        const soundFiles = new Set(sounds.map(s => {
            // Extract filename from URI if needed
            // URI: storage://soundboard/filename.mp3 -> filename.mp3
            let filename = s.fileUri;
            if (filename.startsWith("storage://")) {
                const parts = filename.split("/");
                filename = parts[parts.length - 1];
            }
            return filename;
        }));

        let deletedCount = 0;
        for (const file of files) {
            if (!soundFiles.has(file)) {
                await context.storage.delete(file);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            context.logger.info(`Cleaned up ${deletedCount} orphaned soundboard files.`);
        }
    } catch (error) {
        context.logger.error(`Failed to cleanup orphaned files: ${error}`);
    }
}

export default soundboardPlugin;
