import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { getRecentLogs } from '../core/logger.js';
import workerPool from '../core/worker-pool.js';
import musicPlayer from '../core/music-player.js';
import { getCacheStats } from '../core/cache-manager.js';

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
    const workers = workerPool.getWorkers().map(w => ({
        name: w.name,
        role: w.role,
        busy: w.busy,
        guildId: w.guildId,
        voiceChannelId: w.voiceChannelId,
        status: w.client.user?.presence.status || 'offline',
        activity: w.client.user?.presence.activities[0]?.name || 'None'
    }));
    return { workers };
});

// 2. Active Queues
server.get('/api/queues', async (_request, _reply) => {
    const queues = musicPlayer.getQueues();
    const queueData = Object.values(queues).map(q => ({
        guildId: q.guildId,
        voiceChannelId: q.voiceChannelId,
        workerName: q.worker.name,
        nowPlaying: q.nowPlaying ? {
            title: q.nowPlaying.title,
            url: q.nowPlaying.url,
            duration: q.nowPlaying.durationInSec,
            requestedBy: q.nowPlaying.requestedBy
        } : null,
        queueLength: q.songs.length,
        autoplay: q.autoplay
    }));
    return { queues: queueData };
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

export async function startServer() {
    if (!process.env.PORT) {
        return;
    }

    try {
        const port = parseInt(process.env.PORT, 10);
        await server.listen({ port, host: '0.0.0.0' });
        logger.info(`Web UI server running at http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
