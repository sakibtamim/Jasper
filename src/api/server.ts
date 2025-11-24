import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { getRecentLogs } from '../core/logger.js';
import workerPool from '../core/worker-pool.js';
import musicPlayer from '../core/music-player.js';
import { getCacheStats } from '../core/cache-manager.js';
import db from '../core/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = fastify({ logger: false });

// Serve static files from public directory
server.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
    prefix: '/', // optional: default '/'
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

    const [topSongs, topUsers, globalStats] = await Promise.all([
        db.getTopSongs(limitNum),
        db.getTopUsers(limitNum),
        db.getGlobalStats()
    ]);

    return {
        topSongs,
        topUsers,
        globalStats
    };
});

export async function startServer() {
    if (!process.env.PORT) {
        return;
    }

    try {
        const port = parseInt(process.env.PORT, 10);
        await server.listen({ port, host: '0.0.0.0' });
        logger.info(`[webui] Web UI server running at http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
