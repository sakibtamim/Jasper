import { Plugin, PluginContext } from "../../core/plugins/plugin-interface.js";

const AdvancedHooksTestPlugin: Plugin = {
    name: "Advanced Hooks Test Plugin",
    version: "1.0.0",
    description: "Verifies advanced hooks like SERVER_READY and WORKER_ASSIGNED.",

    onLoad: async (context: PluginContext) => {
        context.logger.info("Loaded!");

        // Hook: SERVER_READY
        context.on("SERVER_READY", (data: any) => {
            context.logger.info("SERVER_READY hook triggered!");
            const { server } = data;

            // Register a test route
            server.get("/api/test-plugin", async (request: any, reply: any) => {
                return { message: "Hello from AdvancedHooksTestPlugin!" };
            });
            context.logger.info("Registered /api/test-plugin route.");
        });

        // Hook: WORKER_ASSIGNED
        context.on("WORKER_ASSIGNED", (data: any) => {
            const { worker, guildId, voiceChannelId } = data;
            context.logger.info(`WORKER_ASSIGNED: ${worker.name} -> Guild ${guildId} / Channel ${voiceChannelId}`);
        });

        // Hook: VOICE_STATE_UPDATE
        context.on("VOICE_STATE_UPDATE", (data: any) => {
            const { oldState, newState } = data;
            context.logger.info(`VOICE_STATE_UPDATE: ${oldState?.member?.user.username} moved from ${oldState?.channelId} to ${newState?.channelId}`);
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Unloaded!");
    }
};

export default AdvancedHooksTestPlugin;
