import { Plugin, PluginContext } from "@jasper/types";
import { registerRoutes } from "./routes.js";
import { registerCommand, handleAutocomplete, handleButtonInteraction } from "./commands/soundboard.js";
import { Interaction } from "discord.js";

let interactionHandler: (interaction: Interaction) => Promise<void>;

const SoundboardPlugin: Plugin = {
    name: "Jasper Soundboard",
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
            }
        };

        context.client.on('interactionCreate', interactionHandler);
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Jasper Soundboard unloaded!");
        if (interactionHandler) {
            context.client.off('interactionCreate', interactionHandler);
        }
    }
};

export default SoundboardPlugin;
