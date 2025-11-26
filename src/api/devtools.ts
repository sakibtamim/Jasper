import { FastifyPluginAsync } from 'fastify';
import db from '../core/db/index.js';
import logger from '../core/logger.js';

const devtoolsRoutes: FastifyPluginAsync = async (fastify) => {
    // Middleware to check if user is authenticated
    fastify.addHook('onRequest', async (request, reply) => {
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
};

export default devtoolsRoutes;
