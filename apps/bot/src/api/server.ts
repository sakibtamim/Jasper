import fastifyCookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { RuntimeProfile } from '@jasper/types';
import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    COOKIE_SECRET,
    MAX_UPLOAD_FILE_SIZE_BYTES,
    PORT,
    RUNTIME_PROFILE,
    isDevelopment,
} from '../config/env.js';
import { getCacheStats } from '../core/cache-manager.js';
import db from '../core/db/index.js';
import { HealthAggregator, defaultHealthAggregator } from '../core/health/index.js';
import logger, { getRecentLogs } from '../core/logger.js';
import musicPlayer from '../core/music-player.js';
import hookManager from '../core/plugins/hook-manager.js';
import pluginManager from '../core/plugins/plugin-manager.js';
import { metricsRegistry } from '../core/telemetry/index.js';
import workerPool from '../core/worker-pool.js';
import authGuardPlugin, { AuthGuardOptions } from './auth-guard.js';
import authRoutes from './auth.js';
import devtoolsRoutes from './devtools.js';
import hostedGuardPlugin, { assertHostedRouteSafety } from './hosted-guard.js';
import pluginsManagementRoutes from './plugins-management.js';
import pluginsRegistryRoutes from './plugins-registry.js';
import operatorRoutes from './routes/operator.js';
import playerRoutes from './routes/player.js';
import workloadRoutes from './routes/workload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions extends AuthGuardOptions {
    profile?: RuntimeProfile;
    enableLegacyAuth?: boolean;
    enableDevtools?: boolean;
    enableLegacyDashboard?: boolean;
    enablePluginManagement?: boolean;
    fastifyOptions?: FastifyServerOptions;
    healthAggregator?: HealthAggregator;
}

/**
 * Factory to create and configure Fastify instance with default-deny auth and hosted safety.
 */
export function buildServer(options: ServerOptions = {}): FastifyInstance {
    const profile = options.profile ?? RUNTIME_PROFILE;
    const isHosted = profile === 'hosted';

    // Hosted Startup Validation: fail-closed if legacy or un-isolated routes are explicitly enabled
    if (isHosted) {
        if (options.enableLegacyAuth === true) {
            throw new Error(
                'Hosted startup validation failed: legacy /api/auth/* routes cannot be enabled in hosted profile.',
            );
        }
        if (options.enableDevtools === true) {
            throw new Error(
                'Hosted startup validation failed: DevTools routes cannot be enabled in hosted profile.',
            );
        }
        if (options.enableLegacyDashboard === true) {
            throw new Error(
                'Hosted startup validation failed: global dashboard routes cannot be enabled in hosted profile.',
            );
        }
        if (options.enablePluginManagement === true) {
            throw new Error(
                'Hosted startup validation failed: customer plugin-management routes cannot be enabled in hosted profile.',
            );
        }
    }

    const app = fastify(options.fastifyOptions ?? { logger: false });

    // 1. Install Hosted Safety Guard (throws on forbidden route registrations in hosted mode)
    app.register(hostedGuardPlugin, { profile });

    // 2. Multipart Uploads
    app.register(multipart, {
        limits: {
            fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
        },
    });

    // 3. React App Static Assets
    app.register(fastifyStatic, {
        root: path.join(__dirname, '../../../web/dist'),
        prefix: '/',
    });

    // 4. Cookie Plugin with Secret (enables signed cookies)
    const effectiveCookieSecret =
        options.cookieSecret ??
        COOKIE_SECRET ??
        (isDevelopment ? 'dev-default-cookie-secret-32-chars-long-jasper' : undefined);

    app.register(fastifyCookie, {
        secret: effectiveCookieSecret,
    });

    // 5. HTTP Authorization Guard (Default-Deny, Principal/Action/Guild Scoping, Signed Sessions)
    app.register(authGuardPlugin, {
        cookieSecret: effectiveCookieSecret,
        operatorTokens: options.operatorTokens,
        workloadTokens: options.workloadTokens,
        systemTokens: options.systemTokens,
        membershipResolver: options.membershipResolver,
    });

    const healthAggregator = options.healthAggregator ?? defaultHealthAggregator;

    // 6. Health & Diagnostic Routes
    app.get('/health/live', { config: { auth: { public: true } } }, async (_request, reply) => {
        return reply.status(200).send(healthAggregator.getPublicLive());
    });

    app.get('/health/ready', { config: { auth: { public: true } } }, async (_request, reply) => {
        const result = await healthAggregator.getPublicReady();
        return reply.status(result.statusCode).send(result.payload);
    });

    app.get(
        '/internal/health',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff', 'runtime_workload'],
                },
            },
        },
        async () => {
            return await healthAggregator.getInternalHealth();
        },
    );

    app.get(
        '/metrics',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff', 'runtime_workload'],
                },
            },
        },
        async (_request, reply) => {
            reply.header('content-type', 'text/plain; version=0.0.4');
            return metricsRegistry.toPrometheusText();
        },
    );

    // 7. Route Registrations (Safe & Conditional)
    app.register(playerRoutes);
    app.register(operatorRoutes);
    app.register(workloadRoutes);
    app.register(pluginsRegistryRoutes, { prefix: '/api/plugins' });

    // Serve Plugin Assets
    app.register(fastifyStatic, {
        root: path.join(__dirname, '../../dist/plugins'),
        prefix: '/plugins',
        decorateReply: false,
    });

    // Root route: Serve React app
    app.get('/', { config: { auth: { public: true } } }, async (_request, reply) => {
        return reply.sendFile('index.html', path.join(__dirname, '../../../web/dist'));
    });

    // Dynamic plugin routes
    app.all<{ Params: { pluginId: string; '*': string } }>(
        '/api/plugins/:pluginId/*',
        {
            config: {
                auth: {
                    allowedPrincipals: [
                        'anonymous',
                        'customer_user',
                        'tenant_member',
                        'staff',
                        'runtime_workload',
                    ],
                    allowSelfHostedFallback: true,
                },
            },
        },
        async (request, reply) => {
            const { pluginId } = request.params;
            const wildCardPath = '/' + (request.params['*'] || '');

            const handled = await pluginManager.handleDynamicRoute(
                pluginId,
                request.method,
                wildCardPath,
                request,
                reply,
            );

            if (handled) return;

            if (!reply.sent) {
                return reply.status(404).send({ error: 'Plugin Route Not Found' });
            }
        },
    );

    // 8. Self-Hosted Legacy & Dashboard Routes (Disabled in Hosted Profile)
    const enableLegacyAuth = options.enableLegacyAuth ?? !isHosted;
    const enableDevtools = options.enableDevtools ?? !isHosted;
    const enablePluginManagement = options.enablePluginManagement ?? !isHosted;
    const enableLegacyDashboard = options.enableLegacyDashboard ?? !isHosted;

    if (enableLegacyAuth) {
        app.register(authRoutes);
    }

    if (enableDevtools) {
        app.register(devtoolsRoutes);
    }

    if (enablePluginManagement) {
        app.register(pluginsManagementRoutes, { prefix: '/api/plugins' });
    }

    if (enableLegacyDashboard) {
        // Scoped Dashboard Endpoints
        const dashboardPolicy = {
            auth: {
                allowedPrincipals: ['tenant_member' as const, 'staff' as const],
            },
        };

        // 1. Worker Status (Scoped by guild if provided)
        app.get('/api/status', { config: dashboardPolicy }, async (request, _reply) => {
            const targetGuildId = request.guildId;
            const queues = musicPlayer.getQueues();

            let workers = workerPool.getWorkers();
            if (targetGuildId) {
                workers = workers.filter((w) => w.guildId === targetGuildId);
            }

            const workerData = workers.map((w) => {
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
                                    avatarUrl: member.displayAvatarURL(),
                                };
                            }
                        }

                        nowPlaying = {
                            title: queue.nowPlaying.title,
                            thumbnail: queue.nowPlaying.thumbnail,
                            requester,
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
                    nowPlaying,
                };
            });
            return { workers: workerData };
        });

        // 2. Active Queues (Scoped by guild if provided)
        app.get('/api/queues', { config: dashboardPolicy }, async (request, _reply) => {
            const targetGuildId = request.guildId;
            const { page = '1', limit = '10' } = request.query as {
                page?: string;
                limit?: string;
            };
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

            let queues = Array.from(musicPlayer.getQueues().values());
            if (targetGuildId) {
                queues = queues.filter((q) => q.guildId === targetGuildId);
            }

            const allQueueData = queues.map((q) => {
                let guildName = q.guildId;
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
                    nowPlaying: q.nowPlaying
                        ? {
                              title: q.nowPlaying.title,
                              url: q.nowPlaying.url,
                              duration: q.nowPlaying.durationInSec,
                              requestedBy: q.nowPlaying.requestedBy,
                              startTime: q.nowPlaying.startTime,
                          }
                        : null,
                    songs: q.songs.map((song) => ({
                        title: song.title,
                        url: song.url,
                        duration: song.durationInSec,
                        requestedBy: song.requestedBy,
                        thumbnail: song.thumbnail,
                    })),
                    queueLength: q.songs.length,
                    autoplay: q.autoplay,
                };
            });

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
                    hasPreviousPage: pageNum > 1,
                },
            };
        });

        // 3. Cache Stats (Staff only)
        app.get(
            '/api/cache',
            { config: { auth: { allowedPrincipals: ['staff'] } } },
            async (_request, _reply) => {
                const stats = await getCacheStats();
                return { stats };
            },
        );

        // 4. Activity Logs (Scoped by guild if provided)
        app.get('/api/logs', { config: dashboardPolicy }, async (request, _reply) => {
            const targetGuildId = request.guildId;
            let logs = getRecentLogs();
            if (targetGuildId) {
                logs = logs.filter(
                    (entry) =>
                        entry.message.includes(`[${targetGuildId}]`) ||
                        entry.message.includes(targetGuildId),
                );
            }
            return { logs };
        });

        // 5. Statistics (Scoped or Staff)
        app.get('/api/stats', { config: dashboardPolicy }, async (request, _reply) => {
            const { limit = '10' } = request.query as { limit?: string };
            const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

            const [topSongs, topUsers, topChannels, topBots, topCacheHits, globalStats] =
                await Promise.all([
                    db.getTopSongs(limitNum),
                    db.getTopUsers(limitNum),
                    db.getTopChannels(limitNum),
                    db.getTopBots(limitNum),
                    db.getTopCacheHits(limitNum),
                    db.getGlobalStats(),
                ]);

            const workers = workerPool.getWorkers();

            const findUser = async (
                userId: string,
            ): Promise<{ username: string; avatarUrl: string | null } | null> => {
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
                                        avatarUrl: member.user.displayAvatarURL(),
                                    };
                                }
                            }
                        }
                        const user = worker.client.users.cache.get(userId);
                        if (user) {
                            return {
                                username: user.username,
                                avatarUrl: user.displayAvatarURL(),
                            };
                        }
                    } catch (e) {
                        logger.warn(
                            `[api] Error checking cache for user ${userId} on worker ${worker.name}: ${e instanceof Error ? e.message : String(e)}`,
                        );
                    }
                }

                const readyWorker = workers.find((w) => w.client.isReady());
                if (readyWorker) {
                    try {
                        const discordUser = await readyWorker.client.users.fetch(userId);
                        return {
                            username: discordUser.username,
                            avatarUrl: discordUser.displayAvatarURL(),
                        };
                    } catch (e) {
                        logger.warn(
                            `[api] Error fetching user ${userId} via ${readyWorker.name}: ${e instanceof Error ? e.message : String(e)}`,
                        );
                    }
                }

                return null;
            };

            const enhancedUsers = await Promise.all(
                topUsers.map(async (user) => {
                    const discordData = await findUser(user.userId);
                    return {
                        ...user,
                        username: discordData?.username || user.userId,
                        avatarUrl: discordData?.avatarUrl || null,
                    };
                }),
            );

            const enhancedChannels = await Promise.all(
                topChannels.map(async (channel) => {
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
                            logger.warn(
                                `[api] Error fetching channel ${channel.channelId} from worker ${worker.name}: ${e instanceof Error ? e.message : String(e)}`,
                            );
                        }
                    }

                    return {
                        ...channel,
                        guildName,
                        channelName,
                        guildIconUrl,
                    };
                }),
            );

            const enhancedCacheHits = await Promise.all(
                topCacheHits.map(async (hit) => {
                    let displayName = hit.entityName;
                    let avatarUrl: string | null = null;

                    if (hit.entityType === 'user') {
                        const discordData = await findUser(hit.entityId);
                        if (discordData) {
                            displayName = discordData.username;
                            avatarUrl = discordData.avatarUrl;
                        }
                    } else {
                        const worker = workers.find((w) => w.name === hit.entityId);
                        if (worker && worker.client.user) {
                            displayName = worker.client.user.username;
                            avatarUrl = worker.client.user.displayAvatarURL();
                        }
                    }

                    return {
                        ...hit,
                        displayName,
                        avatarUrl,
                    };
                }),
            );

            const enhancedTopSongs = topSongs.map((song) => ({
                ...song,
                thumbnail: song.thumbnail || '/assets/images/jasper-logo.webp',
            }));

            return {
                topSongs: enhancedTopSongs,
                topUsers: enhancedUsers,
                topChannels: enhancedChannels,
                topBots,
                topCacheHits: enhancedCacheHits,
                globalStats,
            };
        });
    }

    // SPA Fallback: Serve React app for all non-API, non-legacy routes
    app.setNotFoundHandler((request, reply) => {
        if (
            request.url.startsWith('/api/') ||
            request.url.startsWith('/legacy/') ||
            request.url.startsWith('/plugins/') ||
            request.url.startsWith('/internal/')
        ) {
            return reply.status(404).send({ error: 'Not Found' });
        }

        return reply.sendFile('index.html', path.join(__dirname, '../../../web/dist'));
    });

    return app;
}

export const server = buildServer();

export async function startServer(options?: ServerOptions) {
    const profile = options?.profile ?? RUNTIME_PROFILE;
    logger.info(`[webui] Starting server on port ${PORT} with profile "${profile}"...`);

    // Pre-listen assertion of hosted route safety (fails closed if legacy admin/devtools/auth are present)
    assertHostedRouteSafety(server, profile);

    if (!PORT) {
        logger.warn('[webui] PORT is not set or 0, skipping server start.');
        return;
    }

    try {
        await server.listen({ port: PORT, host: '0.0.0.0' });
        logger.info(`[webui] Backend API server running at http://localhost:${PORT}`);
        if (isDevelopment) {
            logger.info(`[webui] React Dashboard: http://localhost:5173 (Vite dev server)`);
            logger.info(
                `[webui] Legacy UI: http://localhost:5173/legacy/index.html (via Vite proxy)`,
            );
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
