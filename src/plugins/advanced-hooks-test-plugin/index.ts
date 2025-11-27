import { Plugin, PluginContext, ServerReadyData, WorkerAssignedData, VoiceStateUpdateData } from "../../core/plugins/plugin-interface.js";

const AdvancedHooksTestPlugin: Plugin = {
    name: "Advanced Hooks Test Plugin",
    version: "1.0.0",
    description: "Verifies advanced hooks like SERVER_READY and WORKER_ASSIGNED.",

    onLoad: async (context: PluginContext) => {
        context.logger.info("Loaded!");

        // Hook: SERVER_READY
        context.on<ServerReadyData>("SERVER_READY", ({ server }) => {
            context.logger.info("SERVER_READY hook triggered!");
            // The original line 'const { server } = data;' is removed as 'server' is now directly destructured from the event data.

            // Register a test route
            server.get("/test-plugin", async (request: any, reply: any) => {
                return { message: "Hello from AdvancedHooksTestPlugin!" };
            });
            context.logger.info("Registered /api/test-plugin route.");
        });

        // Hook: WORKER_ASSIGNED
        context.on<WorkerAssignedData>("WORKER_ASSIGNED", ({ worker, guildId, voiceChannelId }) => {
            context.logger.info(`Worker ${worker.client.user?.tag} assigned to guild ${guildId} in channel ${voiceChannelId}`);
        });

        // Hook: VOICE_STATE_UPDATE
        context.on<VoiceStateUpdateData>("VOICE_STATE_UPDATE", ({ oldState, newState }) => {
            if (oldState.channelId !== newState.channelId) {
                context.logger.info(`Voice state update: ${oldState.member?.user.tag} moved from ${oldState.channelId} to ${newState.channelId}`);
            }
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Unloaded!");
    }
};

export default AdvancedHooksTestPlugin;
