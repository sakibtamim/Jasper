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
    },
    onUnload: async (context: PluginContext) => {
        if (interactionHandler) {
            context.client.off('interactionCreate', interactionHandler);
        }
        context.logger.info("Jasper Soundboard unloaded!");
    }
};

export default soundboardPlugin;
