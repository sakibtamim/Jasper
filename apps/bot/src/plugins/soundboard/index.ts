import { PluginContext } from "@jasper/types";
import { registerCommand, handleAutocomplete, handleButtonInteraction, handleModalSubmit } from "./commands/soundboard.js";
import { registerRoutes } from "./routes.js";
import { SoundService } from "./services/sound-service.js";
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
        const soundService = new SoundService(context);
        const sounds = await soundService.getSounds();

        // Part 1: Delete orphaned files (files in storage but not in DB)
        const soundFiles = new Set(sounds.map(s => {
            // Extract filename from URI if needed
            let filename = s.fileUri;
            if (filename.startsWith("storage://")) {
                const parts = filename.split("/");
                filename = parts[parts.length - 1];
            }
            return filename;
        }));

        let deletedFilesCount = 0;
        for (const file of files) {
            if (!soundFiles.has(file)) {
                await context.storage.delete(file);
                deletedFilesCount++;
            }
        }

        // Part 2: Delete orphaned DB entries (entries in DB but file missing in storage)
        const storageFiles = new Set(files);
        let deletedDbCount = 0;

        for (const sound of sounds) {
            let filename = sound.fileUri;
            if (filename.startsWith("storage://")) {
                const parts = filename.split("/");
                filename = parts[parts.length - 1];
            }

            if (!storageFiles.has(filename)) {
                await soundService.deleteSound(sound.id);
                deletedDbCount++;
            }
        }

        if (deletedFilesCount > 0 || deletedDbCount > 0) {
            context.logger.info(`[Cleanup] Deleted ${deletedFilesCount} orphaned files and ${deletedDbCount} orphaned DB entries.`);
        }
    } catch (error) {
        context.logger.error(`Failed to cleanup orphaned files: ${error}`);
    }
}

export default soundboardPlugin;
