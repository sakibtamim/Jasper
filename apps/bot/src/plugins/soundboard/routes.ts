import { PluginContext } from '@jasper/types';

import { SoundService } from './services/sound-service.js';
import { Play } from './types.js';

export const registerRoutes = (context: PluginContext) => {
    const { server } = context;
    const soundService = new SoundService(context);

    // GET /api/plugins/soundboard/sounds
    server.get('/sounds', async (req, _reply) => {
        const query = req.query as { guildId?: string };
        const guildId = query?.guildId || (req.headers['x-guild-id'] as string | undefined);
        const sounds = await soundService.getSounds(guildId);
        return { sounds };
    });

    // POST /api/plugins/soundboard/sounds
    server.post('/sounds', async (req, reply) => {
        const body = req.body as {
            name: string;
            emoji: string;
            fileUri: string;
            guildId?: string;
            installationId?: string;
            userId?: string;
        };

        if (!body || !body.name || !body.emoji || !body.fileUri) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        if (body.name.length > 32) return reply.code(400).send({ error: 'Name too long' });
        if (body.emoji.length > 10) return reply.code(400).send({ error: 'Emoji too long' });

        // Authenticate mutations and attribute real user identity (no placeholder)
        const userId = req.user?.id || body.userId;
        if (!userId) {
            return reply
                .code(401)
                .send({ error: 'Authentication required: user identity must be provided' });
        }

        const query = req.query as { guildId?: string };
        const guildId =
            body.guildId || query?.guildId || (req.headers['x-guild-id'] as string | undefined);
        if (!guildId) {
            return reply
                .code(400)
                .send({ error: 'guildId is required to scope sound to an installation' });
        }

        const newSound = await soundService.addSound(
            body.name,
            body.emoji,
            body.fileUri,
            userId,
            guildId,
            body.installationId || guildId,
        );

        return newSound;
    });

    // DELETE /api/plugins/soundboard/sounds/:id
    server.delete('/sounds/:id', async (req, reply) => {
        const { id } = req.params as { id: string };
        const query = req.query as { guildId?: string };
        const guildId = query?.guildId || (req.headers['x-guild-id'] as string | undefined);

        try {
            const success = await soundService.deleteSound(id, guildId);

            if (!success) {
                return reply.code(404).send({ error: 'Sound not found' });
            }

            return { success: true };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('Unauthorized') || msg.includes('different guild')) {
                return reply.code(403).send({ error: msg });
            }
            return reply.code(500).send({ error: msg });
        }
    });

    // PATCH /api/plugins/soundboard/sounds/:id
    server.patch('/sounds/:id', async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = req.body as { name?: string; emoji?: string; guildId?: string };
        const query = req.query as { guildId?: string };
        const guildId =
            body?.guildId || query?.guildId || (req.headers['x-guild-id'] as string | undefined);

        if (!body || (!body.name && !body.emoji)) {
            return reply.code(400).send({ error: 'No updates provided' });
        }

        if (body.name && body.name.length > 32)
            return reply.code(400).send({ error: 'Name too long' });
        if (body.emoji && body.emoji.length > 10)
            return reply.code(400).send({ error: 'Emoji too long' });

        try {
            const updatedSound = await soundService.updateSound(id, body, guildId);

            if (!updatedSound) {
                return reply.code(404).send({ error: 'Sound not found' });
            }

            return updatedSound;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('Unauthorized') || msg.includes('different guild')) {
                return reply.code(403).send({ error: msg });
            }
            return reply.code(500).send({ error: msg });
        }
    });

    // GET /api/plugins/soundboard/stats
    server.get('/stats', async (req, _reply) => {
        const query = req.query as { guildId?: string };
        const guildId = query?.guildId || (req.headers['x-guild-id'] as string | undefined);
        return await soundService.getStats(guildId);
    });

    // DELETE /api/plugins/soundboard/data (Debug: Clear data)
    // WARNING: This is a destructive operation - requires authentication
    server.delete('/data', async (req, reply) => {
        // Check if user is authenticated (req.user is set by auth middleware)
        if (!req.user) {
            return reply.code(401).send({ error: 'Authentication required' });
        }

        const query = req.query as { guildId?: string };
        const guildId = query?.guildId || (req.headers['x-guild-id'] as string | undefined);

        if (guildId) {
            const sounds = await soundService.getSounds();
            const remainingSounds = sounds.filter((s) => s.guildId !== guildId);
            await context.db.plugin.set('sounds', remainingSounds);

            const plays = ((await context.db.plugin.get('plays')) as Play[]) || [];
            const remainingPlays = plays.filter((p) => p.guildId !== guildId);
            await context.db.plugin.set('plays', remainingPlays);
            return { success: true, message: `Data cleared for guild ${guildId}` };
        }

        await context.db.plugin.set('sounds', []);
        await context.db.plugin.set('plays', []);
        return { success: true, message: 'All data cleared' };
    });
};
