import { FastifyPluginAsync } from 'fastify';

import { RUNTIME_PROFILE } from '../../config/env.js';
import db from '../../core/db/index.js';
import workerPool from '../../core/worker-pool.js';

const operatorRoutes: FastifyPluginAsync = async (fastify) => {
    const staffAuthConfig = {
        auth: {
            allowedPrincipals: ['staff' as const],
            action: 'operator:manage',
        },
    };

    // 1. Health check with component details for operators
    fastify.get('/api/operator/health', { config: staffAuthConfig }, async (_request, _reply) => {
        const workers = workerPool.getWorkers();
        return {
            status: 'ok',
            runtimeProfile: RUNTIME_PROFILE,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            workers: {
                total: workers.length,
                busy: workers.filter((w) => w.busy).length,
                ready: workers.filter((w) => w.client.isReady()).length,
            },
        };
    });

    // 2. Worker details for operators
    fastify.get('/api/operator/workers', { config: staffAuthConfig }, async (_request, _reply) => {
        const workers = workerPool.getWorkers().map((w) => ({
            name: w.name,
            role: w.role,
            busy: w.busy,
            guildId: w.guildId,
            voiceChannelId: w.voiceChannelId,
            status: w.client.user?.presence.status || 'offline',
        }));
        return { workers };
    });

    // 3. System stats for operators
    fastify.get('/api/operator/stats', { config: staffAuthConfig }, async (_request, _reply) => {
        const globalStats = await db.getGlobalStats();
        return { stats: globalStats };
    });

    // 4. Operator drain command
    fastify.post('/api/operator/drain', { config: staffAuthConfig }, async (_request, _reply) => {
        return {
            success: true,
            message: 'Drain signal acknowledged',
            timestamp: new Date().toISOString(),
        };
    });
};

export default operatorRoutes;
