import {
    Plugin,
    PluginContext,
    ServerReadyData,
    VoiceStateUpdateData,
    WorkerAssignedData,
} from '@jasper/types';

const AdvancedHooksTestPlugin: Plugin = {
    name: 'Advanced Hooks Test Plugin',
    version: '1.0.0',
    description: 'Verifies advanced hooks like SERVER_READY and WORKER_ASSIGNED.',

    onLoad: async (context: PluginContext) => {
        context.logger.info('Loaded!');

        // Register a test route directly in onLoad (scoped to plugin)
        context.server.get(
            '/test-plugin',
            async (
                _request: import('fastify').FastifyRequest,
                _reply: import('fastify').FastifyReply,
            ) => {
                return { message: 'Hello from AdvancedHooksTestPlugin!' };
            },
        );
        context.logger.info("Registered /test-plugin route under the plugin's API scope.");

        // Hook: SERVER_READY
        context.on<ServerReadyData>('SERVER_READY', (_data) => {
            context.logger.info('SERVER_READY hook triggered! Server is listening.');
        });

        // Hook: WORKER_ASSIGNED
        context.on<WorkerAssignedData>('WORKER_ASSIGNED', ({ worker, guildId, voiceChannelId }) => {
            context.logger.info(
                `Worker ${worker.client.user?.tag} assigned to guild ${guildId} in channel ${voiceChannelId}`,
            );
        });

        // Hook: VOICE_STATE_UPDATE
        context.on<VoiceStateUpdateData>('VOICE_STATE_UPDATE', ({ oldState, newState }) => {
            if (oldState.channelId !== newState.channelId) {
                context.logger.info(
                    `Voice state update: ${oldState.member?.user.tag} moved from ${oldState.channelId} to ${newState.channelId}`,
                );
            }
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info('Unloaded!');
    },
};

export default AdvancedHooksTestPlugin;
