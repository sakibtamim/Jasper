import { FastifyPluginAsync } from 'fastify';
import db from '../core/db/index.js';
import logger from '../core/logger.js';
import pluginManager from '../core/plugins/plugin-manager.js';
import { getCacheStorage } from '../core/cache-manager.js';
import { fetchVideoData } from '../core/audio/stream-handler.js';

const devtoolsRoutes: FastifyPluginAsync = async (fastify) => {
    // Middleware to check if user is authenticated
    fastify.addHook('onRequest', async (request, reply) => {
        // Allow public access to global stats
        if (request.url === '/api/devtools/stats' || request.url.startsWith('/api/devtools/stats?')) {
            return;
        }

        if (!request.user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // 1. Global Stats (Enhanced)
    fastify.get('/api/devtools/stats', async (_request, _reply) => {
        const globalStats = await db.getGlobalStats();
        const cacheStats = await db.getCacheStats();
        return { ...globalStats, ...cacheStats };
    });

    // 2. Users Management
    fastify.get('/api/devtools/users', async (request, _reply) => {
        const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        const result = await db.getAllUsers(limitNum, offsetNum);
        return result;
    });

    fastify.delete('/api/devtools/users/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        // Prevent deleting self
        if (request.user?.id === id) {
            return reply.status(400).send({ error: 'Cannot delete yourself' });
        }

        try {
            await db.deleteUser(id);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete user ${id}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete user' });
        }
    });

    // 3. Sessions Management
    fastify.get('/api/devtools/sessions', async (request, _reply) => {
        const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        const result = await db.getAllSessions(limitNum, offsetNum);
        return result;
    });

    fastify.delete('/api/devtools/sessions/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        // Prevent deleting current session
        if (request.cookies.session_id === id) {
            return reply.status(400).send({ error: 'Cannot delete current session' });
        }

        try {
            await db.deleteSession(id);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete session ${id}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete session' });
        }
    });

    // 4. Cache Management
    fastify.get('/api/devtools/cache', async (request, _reply) => {
        const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        const result = await db.getAllCacheEntries(limitNum, offsetNum);
        return result;
    });

    fastify.delete('/api/devtools/cache/:query', async (request, reply) => {
        const { query } = request.params as { query: string };
        const decodedQuery = decodeURIComponent(query);

        try {
            await db.deleteCacheEntry(decodedQuery);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete cache entry ${decodedQuery}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete cache entry' });
        }
    });

    fastify.get('/api/devtools/cache/audio', async (request, _reply) => {
        const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        const result = await db.getAllAudioCacheEntries(limitNum, offsetNum);
        return result;
    });

    fastify.delete('/api/devtools/cache/audio/:videoId', async (request, reply) => {
        const { videoId } = request.params as { videoId: string };

        try {
            // 1. Delete file via CacheStorage
            const storage = getCacheStorage();
            if (storage) {
                await storage.deleteCachedFile(videoId);
            }

            // 2. Delete DB entry
            await db.deleteAudioCacheEntry(videoId);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete audio cache entry ${videoId}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete audio cache entry' });
        }
    });

    fastify.post('/api/devtools/cache/audio/:videoId/regenerate-thumbnail', async (request, reply) => {
        const { videoId } = request.params as { videoId: string };

        try {
            const url = `https://www.youtube.com/watch?v=${videoId}`;
            const videoData = await fetchVideoData(url);

            if (videoData.thumbnail) {
                await db.updateAudioThumbnail(videoId, videoData.thumbnail);
                return { success: true, thumbnail: videoData.thumbnail };
            } else {
                return reply.status(404).send({ error: 'No thumbnail found' });
            }
        } catch (error) {
            logger.error(`[devtools] Failed to regenerate thumbnail for ${videoId}: ${error}`);
            return reply.status(500).send({ error: 'Failed to regenerate thumbnail' });
        }
    });

    // 5. Stats Management
    fastify.get('/api/devtools/stats/songs', async (request, _reply) => {
        const { limit = '50' } = request.query as { limit?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const result = await db.getTopSongs(limitNum);
        return result;
    });

    fastify.delete('/api/devtools/stats/songs', async (request, reply) => {
        const { url } = request.query as { url: string };
        if (!url) return reply.status(400).send({ error: 'Missing url parameter' });

        try {
            await db.deletePlaysForSong(url);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete plays for song ${url}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete plays for song' });
        }
    });

    fastify.get('/api/devtools/stats/users', async (request, _reply) => {
        const { limit = '50' } = request.query as { limit?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const result = await db.getTopUsers(limitNum);
        return result;
    });

    fastify.delete('/api/devtools/stats/users/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            await db.deletePlaysForUser(id);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete plays for user ${id}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete plays for user' });
        }
    });

    fastify.get('/api/devtools/stats/channels', async (request, _reply) => {
        const { limit = '50' } = request.query as { limit?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const result = await db.getTopChannels(limitNum);
        return result;
    });

    fastify.delete('/api/devtools/stats/channels/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            await db.deletePlaysForChannel(id);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete plays for channel ${id}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete plays for channel' });
        }
    });

    fastify.get('/api/devtools/stats/bots', async (request, _reply) => {
        const { limit = '50' } = request.query as { limit?: string };
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const result = await db.getTopBots(limitNum);
        return result;
    });

    fastify.delete('/api/devtools/stats/bots/:name', async (request, reply) => {
        const { name } = request.params as { name: string };
        try {
            await db.deletePlaysForBot(name);
            return { success: true };
        } catch (error) {
            logger.error(`[devtools] Failed to delete plays for bot ${name}: ${error}`);
            return reply.status(500).send({ error: 'Failed to delete plays for bot' });
        }
    });

    // 6. Plugin Management
    fastify.get('/api/devtools/plugins', async (_request, reply) => {
        try {
            const plugins = await pluginManager.getPluginStatus();
            reply.send({ plugins });
        } catch (error) {
            logger.error(`[api] Failed to get plugin status: ${error}`);
            reply.status(500).send({ error: 'Failed to get plugin status' });
        }
    });

    fastify.post<{ Params: { id: string }, Body: { enabled: boolean } }>('/api/devtools/plugins/:id/toggle', async (request, reply) => {
        const { id } = request.params;
        const { enabled } = request.body;

        if (typeof enabled !== 'boolean') {
            reply.status(400).send({ error: 'Invalid body: enabled must be a boolean' });
            return;
        }

        try {
            const result = await pluginManager.togglePlugin(id, enabled);
            if (result.success) {
                reply.send({ success: true });
            } else {
                reply.status(400).send({ error: result.message || 'Failed to toggle plugin' });
            }
        } catch (error) {
            logger.error(`[api] Failed to toggle plugin ${id}: ${error}`);
            reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // 7. Cookie Management
    fastify.get('/api/devtools/cookies', async (_request, reply) => {
        try {
            const cookies = await db.getCookies();
            reply.send({ cookies });
        } catch (error) {
            logger.error(`[api] Failed to get cookies: ${error}`);
            reply.status(500).send({ error: 'Failed to get cookies' });
        }
    });

    fastify.post<{ Body: { name: string, content: string } }>('/api/devtools/cookies', async (request, reply) => {
        const { name, content } = request.body;
        if (!name || !content) {
            return reply.status(400).send({ error: 'Missing name or content' });
        }

        try {
            await db.addCookie(name, content);
            reply.send({ success: true });
        } catch (error) {
            logger.error(`[api] Failed to add cookie: ${error}`);
            reply.status(500).send({ error: 'Failed to add cookie' });
        }
    });

    fastify.delete<{ Params: { id: string } }>('/api/devtools/cookies/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            await db.deleteCookie(parseInt(id, 10));
            reply.send({ success: true });
        } catch (error) {
            logger.error(`[api] Failed to delete cookie ${id}: ${error}`);
            reply.status(500).send({ error: 'Failed to delete cookie' });
        }
    });

    fastify.post<{ Params: { id: string }, Body: { enabled: boolean } }>('/api/devtools/cookies/:id/toggle', async (request, reply) => {
        const { id } = request.params;
        const { enabled } = request.body;

        if (typeof enabled !== 'boolean') {
            return reply.status(400).send({ error: 'Invalid body: enabled must be a boolean' });
        }

        try {
            await db.updateCookie(parseInt(id, 10), { isActive: enabled });
            reply.send({ success: true });
        } catch (error) {
            logger.error(`[api] Failed to toggle cookie ${id}: ${error}`);
            reply.status(500).send({ error: 'Failed to toggle cookie' });
        }
    });
};

export default devtoolsRoutes;
