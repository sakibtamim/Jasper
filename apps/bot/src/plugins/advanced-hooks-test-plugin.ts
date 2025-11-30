import { Plugin, PluginContext } from "../core/plugins/plugin-interface.js";
import logger from "../core/logger.js";

const AdvancedHooksTestPlugin: Plugin = {
    name: "Advanced Hooks Test Plugin",
    version: "1.0.0",
    description: "Verifies advanced hooks like SERVER_READY and WORKER_ASSIGNED.",

    onLoad: async (context: PluginContext) => {
        logger.info("[AdvancedHooksTestPlugin] Loaded!");

        // Hook: SERVER_READY
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context.on("SERVER_READY", (data: any) => {
            logger.info("[AdvancedHooksTestPlugin] SERVER_READY hook triggered!");
            const { server } = data;

            // Register a test route
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            server.get("/api/test-plugin", async (_request: any, _reply: any) => {
                return { message: "Hello from AdvancedHooksTestPlugin!" };
            });
            logger.info("[AdvancedHooksTestPlugin] Registered /api/test-plugin route.");
        });

        // Hook: WORKER_ASSIGNED
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context.on("WORKER_ASSIGNED", (data: any) => {
            const { worker, guildId, voiceChannelId } = data;
            logger.info(`[AdvancedHooksTestPlugin] WORKER_ASSIGNED: ${worker.name} -> Guild ${guildId} / Channel ${voiceChannelId}`);
        });

        // Hook: VOICE_STATE_UPDATE
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context.on("VOICE_STATE_UPDATE", (data: any) => {
            const { oldState, newState } = data;
            logger.info(`[AdvancedHooksTestPlugin] VOICE_STATE_UPDATE: ${oldState?.member?.user.username} moved from ${oldState?.channelId} to ${newState?.channelId}`);
        });
    },

    onUnload: async (_context: PluginContext) => {
        logger.info("[AdvancedHooksTestPlugin] Unloaded!");
    }
};

export default AdvancedHooksTestPlugin;
