import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import musicPlayer from '../../core/music-player.js';

interface SeekRequestBody {
    voiceChannelId: string;
    position: number | string;
}

const playerRoutes: FastifyPluginAsync = async (fastify) => {
    const handleSeek = async (
        req: FastifyRequest<{ Body: SeekRequestBody }>,
        reply: FastifyReply,
    ) => {
        const body = req.body;
        if (!body || typeof body !== 'object') {
            return reply.status(400).send({
                error: 'Invalid request body',
            });
        }

        const { voiceChannelId, position } = body;

        if (!voiceChannelId || typeof voiceChannelId !== 'string') {
            return reply.status(400).send({
                error: 'voiceChannelId is required and must be a string',
            });
        }

        if (
            position === undefined ||
            position === null ||
            (typeof position !== 'number' && typeof position !== 'string')
        ) {
            return reply.status(400).send({
                error: 'position is required and must be a number or string',
            });
        }

        try {
            const result = await musicPlayer.seekQueue(voiceChannelId, position);
            return reply.status(200).send({
                success: true,
                position: result.position,
                voiceChannelId,
                track: {
                    title: result.track.title,
                    url: result.track.url,
                    duration: result.track.durationInSec,
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            if (
                message.includes('nothing currently playing') ||
                message.includes('No active queue')
            ) {
                return reply.status(404).send({ error: message });
            }
            if (message.includes('Invalid seek position')) {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: message });
        }
    };

    const seekConfig = {
        auth: {
            allowedPrincipals: ['tenant_member' as const, 'staff' as const],
            requireGuild: true,
            action: 'playback:seek',
        },
    };

    fastify.post('/api/player/seek', { config: seekConfig }, handleSeek);
    fastify.post('/seek', { config: seekConfig }, handleSeek);
};

export default playerRoutes;
