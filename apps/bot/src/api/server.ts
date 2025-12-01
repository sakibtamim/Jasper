import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { getRecentLogs } from '../core/logger.js';
import workerPool from '../core/worker-pool.js';
import musicPlayer from '../core/music-player.js';
import { getCacheStats } from '../core/cache-manager.js';
import fastifyCookie from '@fastify/cookie';
import db from '../core/db/index.js';
import authRoutes from './auth.js';
import devtoolsRoutes from './devtools.js';
import { PORT, COOKIE_SECRET, isDevelopment } from '../config/env.js';
import hookManager from '../core/plugins/hook-manager.js';
import pluginsRegistryRoutes from './plugins-registry.js';
import pluginsManagementRoutes from './plugins-management.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const server = fastify({ logger: false });

// Serve legacy static UI
server.register(fastifyStatic, {
    root: path.join(__dirname, '../../../web/public'),
    prefix: '/legacy',
    decorateReply: false
});

// Serve React app static assets
server.register(fastifyStatic, {
    root: path.join(__dirname, '../../../web/dist'),
    prefix: '/',
});

// Register Cookie Plugin
server.register(fastifyCookie, {
    secret: COOKIE_SECRET || undefined,
});

// Global Session Hook
server.addHook('onRequest', async (request, reply) => {
    // Only run auth logic for API routes to avoid hitting the DB for static assets
    if (!request.raw.url?.startsWith('/api/')) {
        return;
    }

    const sessionId = request.cookies.session_id;
    if (sessionId) {
        try {
            const session = await db.getSession(sessionId);
            if (!session) {
                // Invalid session, clear cookie and allow request to continue without user attached
                reply.clearCookie('session_id');
            } else {
                const user = await db.getUser(session.userId);
                if (user) {
                    request.user = user;
                }
            }
        } catch (e) {
            logger.warn(`[auth] Error validating session: ${e}`);
        }
    }
});

// Register Auth Routes
server.register(authRoutes);
server.register(devtoolsRoutes);
server.register(pluginsRegistryRoutes, { prefix: '/api/plugins' });
server.register(pluginsManagementRoutes, { prefix: '/api/plugins' });
// Serve Plugin Assets
server.register(fastifyStatic, {
    root: path.join(__dirname, '../../dist/plugins'),
    prefix: '/plugins',
    decorateReply: false,
});

// Root route: Serve React app
server.get('/', async (request, reply) => {
    return reply.sendFile('index.html', path.join(__dirname, '../../../web/dist'));
});


// API Endpoints

// 1. Worker Status
server.get('/api/status', async (_request, _reply) => {
    const queues = musicPlayer.getQueues();
    const workers = workerPool.getWorkers().map(w => {
        let guildName = null;
        let guildIconUrl = null;
        let channelName = null;
        let nowPlaying = null;

        let guild = null;
        if (w.guildId) {
            guild = w.client.guilds.cache.get(w.guildId);
            if (guild) {
                guildName = guild.name;
                guildIconUrl = guild.iconURL();
            }
        }

        if (w.voiceChannelId) {
            const channel = w.client.channels.cache.get(w.voiceChannelId);
            if (channel && channel.isVoiceBased()) {
                channelName = channel.name;
            }

            const queue = queues.get(w.voiceChannelId);
            if (queue && queue.nowPlaying) {
                let requester = null;
                if (queue.nowPlaying.requesterId && guild) {
                    const member = guild.members.cache.get(queue.nowPlaying.requesterId);
                    if (member) {
                        requester = {
                            id: member.id,
                            username: member.user.username,
                            displayName: member.displayName,
                            avatarUrl: member.displayAvatarURL()
                        };
                    }
                }

                nowPlaying = {
                    title: queue.nowPlaying.title,
                    thumbnail: queue.nowPlaying.thumbnail,
                    requester
                };
            }
        }

        return {
            name: w.name,
            role: w.role,
            busy: w.busy,
            guildId: w.guildId,
            voiceChannelId: w.voiceChannelId,
            status: w.client.user?.presence.status || 'offline',
            activity: w.client.user?.presence.activities[0]?.name || 'None',
            avatarUrl: w.client.user?.displayAvatarURL(),
            guildName,
            guildIconUrl,
            channelName,
            nowPlaying
        };
    });
    return { workers };
});

// 2. Active Queues (with pagination)
server.get('/api/queues', async (request, _reply) => {
    const { page = '1', limit = '10' } = request.query as { page?: string; limit?: string };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10)); // Max 50 per page

    const queues = musicPlayer.getQueues();
    const allQueueData = Array.from(queues.values()).map(q => {
        let guildName = q.guildId; // Default to ID if name not found
        if (q.worker && q.worker.client) {
            const guild = q.worker.client.guilds.cache.get(q.guildId);
            if (guild) {
                guildName = guild.name;
            }
        }

        return {
            guildId: q.guildId,
            guildName,
            voiceChannelId: q.voiceChannelId,
            workerName: q.worker.name,
            nowPlaying: q.nowPlaying ? {
                title: q.nowPlaying.title,
                url: q.nowPlaying.url,
                duration: q.nowPlaying.durationInSec,
                requestedBy: q.nowPlaying.requestedBy,
                startTime: q.nowPlaying.startTime
            } : null,
            songs: q.songs.map(song => ({
                title: song.title,
                url: song.url,
                duration: song.durationInSec,
                requestedBy: song.requestedBy,
                thumbnail: song.thumbnail
            })),
            queueLength: q.songs.length,
            autoplay: q.autoplay
        };
    });

    // Pagination
    const totalQueues = allQueueData.length;
    const totalPages = Math.ceil(totalQueues / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedQueues = allQueueData.slice(startIndex, endIndex);

    return {
        queues: paginatedQueues,
        pagination: {
            currentPage: pageNum,
            totalPages,
            totalQueues,
            limit: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1
        }
    };
});

// 3. Cache Stats
server.get('/api/cache', async (_request, _reply) => {
    const stats = await getCacheStats();
    return { stats };
});

// 4. Activity Logs
server.get('/api/logs', async (_request, _reply) => {
    const logs = getRecentLogs();
    return { logs };
});

// 5. Statistics
server.get('/api/stats', async (request, _reply) => {
    const { limit = '10' } = request.query as { limit?: string };
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const [topSongs, topUsers, topChannels, topBots, topCacheHits, globalStats] = await Promise.all([
        db.getTopSongs(limitNum),
        db.getTopUsers(limitNum),
        db.getTopChannels(limitNum),
        db.getTopBots(limitNum),
        db.getTopCacheHits(limitNum),
        db.getGlobalStats()
    ]);

    const workers = workerPool.getWorkers();

    // Helper to find a user across all workers (Cache-First Strategy)
    const findUser = async (userId: string): Promise<{ username: string; avatarUrl: string | null } | null> => {
        // 1. Try local cache of all workers first
        for (const worker of workers) {
            try {
                const guildId = worker.guildId;
                if (guildId) {
                    const guild = worker.client.guilds.cache.get(guildId);
                    if (guild) {
                        const member = guild.members.cache.get(userId);
                        if (member) {
                            return {
                                username: member.user.username,
                                avatarUrl: member.user.displayAvatarURL()
                            };
                        }
                    }
                }
                // Also check global user cache
                const user = worker.client.users.cache.get(userId);
                if (user) {
                    return {
                        username: user.username,
                        avatarUrl: user.displayAvatarURL()
                    };
                }
            } catch (e) {
                logger.warn(`[api] Error checking cache for user ${userId} on worker ${worker.name}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // 2. Fallback to fetch if not found in any cache
        // We use the first available worker to fetch
        if (workers.length > 0) {
            try {
                const discordUser = await workers[0].client.users.fetch(userId);
                return {
                    username: discordUser.username,
                    avatarUrl: discordUser.displayAvatarURL()
                };
            } catch (e) {
                logger.warn(`[api] Error fetching user ${userId}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        return null;
    };

    // Enhance topUsers
    const enhancedUsers = await Promise.all(topUsers.map(async (user) => {
        const discordData = await findUser(user.userId);
        return {
            ...user,
            username: discordData?.username || user.userId,
            avatarUrl: discordData?.avatarUrl || null
        };
    }));

    // Enhance topChannels
    const enhancedChannels = await Promise.all(topChannels.map(async (channel) => {
        let guildName = channel.guildId;
        let channelName = channel.channelId;
        let guildIconUrl: string | null = null;

        for (const worker of workers) {
            try {
                const guild = worker.client.guilds.cache.get(channel.guildId);
                if (guild) {
                    guildName = guild.name;
                    guildIconUrl = guild.iconURL();

                    const discordChannel = guild.channels.cache.get(channel.channelId);
                    if (discordChannel) {
                        channelName = discordChannel.name;
                    }
                    break;
                }
            } catch (e) {
                logger.warn(`[api] Error fetching channel ${channel.channelId} from worker ${worker.name}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        return {
            ...channel,
            guildName,
            channelName,
            guildIconUrl
        };
    }));

    // Enhance cache hits
    const enhancedCacheHits = await Promise.all(topCacheHits.map(async (hit) => {
        let displayName = hit.entityName;
        let avatarUrl: string | null = null;

        if (hit.entityType === 'user') {
            const discordData = await findUser(hit.entityId);
            if (discordData) {
                displayName = discordData.username;
                avatarUrl = discordData.avatarUrl;
            }
        } else {
            // For bots, use worker data
            const worker = workers.find(w => w.name === hit.entityId);
            if (worker && worker.client.user) {
                displayName = worker.client.user.username;
                avatarUrl = worker.client.user.displayAvatarURL();
            }
        }

        return {
            ...hit,
            displayName,
            avatarUrl
        };
    }));

    // Enhance topSongs with default thumbnail
    const enhancedTopSongs = topSongs.map(song => ({
        ...song,
        thumbnail: song.thumbnail || '/assets/images/jasper-logo.png'
    }));

    return {
        topSongs: enhancedTopSongs,
        topUsers: enhancedUsers,
        topChannels: enhancedChannels,
        topBots,
        topCacheHits: enhancedCacheHits,
        globalStats
    };
});

export async function startServer() {
    logger.info(`[webui] Starting server on port ${PORT}...`);
    if (!PORT) {
        logger.warn("[webui] PORT is not set or 0, skipping server start.");
        return;
    }

    try {
        await server.listen({ port: PORT, host: '0.0.0.0' });
        logger.info(`[webui] Backend API server running at http://localhost:${PORT}`);
        if (isDevelopment) {
            logger.info(`[webui] React Dashboard: http://localhost:5173 (Vite dev server)`);
            logger.info(`[webui] Legacy UI: http://localhost:5173/legacy/index.html (via Vite proxy)`);
        } else {
            logger.info(`[webui] React Dashboard: http://localhost:${PORT}`);
            logger.info(`[webui] Legacy UI: http://localhost:${PORT}/legacy/index.html`);
        }

        // Hook: SERVER_READY
        await hookManager.trigger('SERVER_READY', { server });
    } catch (err) {
        logger.error(`[webui] Failed to start server: ${err}`);
        process.exit(1);
    }
}

// SPA Fallback: Serve React app for all non-API, non-legacy routes
server.setNotFoundHandler((request, reply) => {
    // SPA fallback: serve index.html for non-API, non-legacy, and non-plugin routes
    if (request.url.startsWith('/api/') || request.url.startsWith('/legacy/') || request.url.startsWith('/plugins/')) {
        return reply.status(404).send({ error: 'Not Found' });
    }

    // Serve React app index.html for all other routes (SPA fallback)
    return reply.sendFile('index.html', path.join(__dirname, '../../../web/dist'));
});
