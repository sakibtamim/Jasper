import { Plugin, PluginContext } from "@jasper/types";
import { registerRoutes } from "./routes.js";
import { registerCommand } from "./commands/soundboard.js";

const SoundboardPlugin: Plugin = {
    name: "Jasper Soundboard",
    version: "1.0.0",

    onLoad: async (context: PluginContext) => {
        context.logger.info("Jasper Soundboard loaded!");
        registerRoutes(context);
        registerCommand(context);
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Jasper Soundboard unloaded!");
    }
};

export default SoundboardPlugin;
