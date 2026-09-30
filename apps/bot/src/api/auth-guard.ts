import { AuthenticatedPrincipal, RouteAuthPolicy, TenantMemberPrincipal } from '@jasper/types';
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { COOKIE_SECRET } from '../config/env.js';
import db from '../core/db/index.js';
import logger from '../core/logger.js';
import workerPool from '../core/worker-pool.js';

export type MembershipResolver = (
    userId: string,
    guildId: string,
) => Promise<TenantMemberPrincipal | null>;

export interface AuthGuardOptions {
    cookieSecret?: string;
    operatorTokens?: string[];
    workloadTokens?: string[];
    systemTokens?: string[];
    membershipResolver?: MembershipResolver;
}

/**
 * Default tenant membership resolver using worker pool and discord cache/fetch.
 */
export async function defaultMembershipResolver(
    userId: string,
    guildId: string,
): Promise<TenantMemberPrincipal | null> {
    const workers = workerPool.getWorkers();
    for (const worker of workers) {
        if (!worker.client?.isReady()) continue;
        const guild = worker.client.guilds.cache.get(guildId);
        if (guild) {
            let member = guild.members.cache.get(userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(userId);
                } catch {
                    // Not in guild
                }
            }
            if (member) {
                let role: 'owner' | 'admin' | 'member' = 'member';
                if (guild.ownerId === userId) {
                    role = 'owner';
                } else if (
                    member.permissions.has('Administrator') ||
                    member.permissions.has('ManageGuild')
                ) {
                    role = 'admin';
                }
                return {
                    type: 'tenant_member',
                    userId,
                    username: member.user.username,
                    guildId,
                    role,
                };
            }
        }
    }
    return null;
}

/**
 * Helper to extract target guild ID from request (headers, query, params, or body).
 */
export function extractTargetGuildId(request: FastifyRequest): string | undefined {
    // 1. Header
    const headerGuild = request.headers['x-jasper-guild-id'];
    if (typeof headerGuild === 'string' && headerGuild.trim().length > 0) {
        return headerGuild.trim();
    }

    // 2. Query
    const query = request.query as Record<string, unknown> | undefined;
    if (query && typeof query.guildId === 'string' && query.guildId.trim().length > 0) {
        return query.guildId.trim();
    }

    // 3. Params
    const params = request.params as Record<string, unknown> | undefined;
    if (params && typeof params.guildId === 'string' && params.guildId.trim().length > 0) {
        return params.guildId.trim();
    }

    // 4. Body
    const body = request.body as Record<string, unknown> | undefined;
    if (body && typeof body.guildId === 'string' && body.guildId.trim().length > 0) {
        return body.guildId.trim();
    }

    // 5. If body has voiceChannelId, look up guildId from active worker
    if (body && typeof body.voiceChannelId === 'string') {
        const workers = workerPool.getWorkers();
        const worker = workers.find((w) => w.voiceChannelId === body.voiceChannelId);
        if (worker?.guildId) {
            return worker.guildId;
        }
    }

    return undefined;
}

/**
 * Core HTTP authorization guard plugin for Fastify.
 * Enforces default-deny on all /api/* routes, resolves principals, validates signed sessions,
 * and enforces tenant/action policies.
 */
export const authGuardPlugin: FastifyPluginAsync<AuthGuardOptions> = async (
    fastify: FastifyInstance,
    options: AuthGuardOptions,
) => {
    const cookieSecret = options.cookieSecret ?? COOKIE_SECRET;
    const operatorTokens = new Set(
        [
            ...(options.operatorTokens ?? []),
            process.env.OPERATOR_TOKEN,
            process.env.STAFF_TOKEN,
        ].filter((t): t is string => Boolean(t && t.length > 0)),
    );
    const workloadTokens = new Set(
        [...(options.workloadTokens ?? []), process.env.WORKLOAD_TOKEN].filter((t): t is string =>
            Boolean(t && t.length > 0),
        ),
    );
    const systemTokens = new Set(
        [...(options.systemTokens ?? []), process.env.SYSTEM_TOKEN].filter((t): t is string =>
            Boolean(t && t.length > 0),
        ),
    );
    const membershipResolver = options.membershipResolver ?? defaultMembershipResolver;

    // Pre-handler principal resolution and policy enforcement
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
        const url = request.raw.url || request.url;

        // Skip non-API and static routes
        if (!url.startsWith('/api/') && !url.startsWith('/internal/')) {
            return;
        }

        // If request did not match any registered route (404), allow Fastify notFoundHandler to respond
        if (request.is404 || !request.routeOptions?.url) {
            return;
        }

        // If an API request fell through to the static asset wildcard route (/*), it is a 404 Not Found
        if (request.routeOptions.url === '/*' || request.routeOptions.url === '*') {
            return reply.status(404).send({ error: 'Not Found' });
        }

        // 1. Resolve Principal
        let principal: AuthenticatedPrincipal = { type: 'anonymous' };

        // A. Staff / Operator Bearer Token
        const authHeader = request.headers.authorization;
        const operatorHeader = request.headers['x-jasper-operator-token'];
        const workloadHeader = request.headers['x-jasper-workload-token'];
        const systemHeader = request.headers['x-jasper-system-token'];

        if (typeof operatorHeader === 'string' && operatorTokens.has(operatorHeader)) {
            principal = { type: 'staff', subject: 'operator', role: 'operator' };
        } else if (
            typeof authHeader === 'string' &&
            authHeader.startsWith('Bearer ') &&
            operatorTokens.has(authHeader.slice(7).trim())
        ) {
            principal = { type: 'staff', subject: 'staff-bearer', role: 'staff' };
        } else if (typeof workloadHeader === 'string' && workloadTokens.has(workloadHeader)) {
            principal = { type: 'runtime_workload', workloadId: 'cell-workload' };
        } else if (
            typeof authHeader === 'string' &&
            authHeader.startsWith('Workload ') &&
            workloadTokens.has(authHeader.slice(9).trim())
        ) {
            principal = { type: 'runtime_workload', workloadId: 'cell-workload' };
        } else if (typeof systemHeader === 'string' && systemTokens.has(systemHeader)) {
            principal = {
                type: 'system_job',
                jobName: 'internal-job',
                allowedActions: ['*'],
            };
        } else {
            // B. Session Cookie Authentication
            const rawSessionId = request.cookies.session_id;
            let validatedSessionId: string | undefined = undefined;

            if (rawSessionId) {
                if (cookieSecret && typeof request.unsignCookie === 'function') {
                    const unsigned = request.unsignCookie(rawSessionId);
                    if (unsigned.valid && unsigned.value) {
                        validatedSessionId = unsigned.value;
                    } else {
                        logger.warn('[auth-guard] Invalid or tampered signed session cookie');
                    }
                } else {
                    validatedSessionId = rawSessionId;
                }
            }

            if (validatedSessionId) {
                try {
                    const session = await db.getSession(validatedSessionId);
                    if (session && session.expiresAt.getTime() > Date.now()) {
                        const user = await db.getUser(session.userId);
                        if (user) {
                            request.user = user;
                            const targetGuildId = extractTargetGuildId(request);

                            if (targetGuildId) {
                                request.guildId = targetGuildId;
                                const membership = await membershipResolver(user.id, targetGuildId);
                                if (membership) {
                                    principal = membership;
                                } else {
                                    // Authenticated customer user, but not member of target guild
                                    principal = {
                                        type: 'customer_user',
                                        userId: user.id,
                                        username: user.username,
                                        discriminator: user.discriminator,
                                        avatar: user.avatar,
                                    };
                                }
                            } else {
                                principal = {
                                    type: 'customer_user',
                                    userId: user.id,
                                    username: user.username,
                                    discriminator: user.discriminator,
                                    avatar: user.avatar,
                                };
                            }
                        }
                    }
                } catch (err) {
                    logger.warn(`[auth-guard] Error validating session: ${err}`);
                }
            }
        }

        request.principal = principal;

        // 2. Policy Evaluation
        const authPolicy: RouteAuthPolicy | undefined = request.routeOptions.config?.auth;

        // Default-Deny: If route does not declare an auth policy, fail closed
        if (!authPolicy) {
            return reply.status(403).send({
                error: 'Forbidden: route has no access policy (default-deny)',
            });
        }

        // Public route: allow anonymous and all principals
        if (authPolicy.public) {
            return;
        }

        // Authentication Required: If principal is anonymous on non-public route
        if (principal.type === 'anonymous') {
            return reply.status(401).send({
                error: 'Unauthorized: authentication required',
            });
        }

        // Guild Scope Requirement & Cross-Guild Denial
        if (authPolicy.requireGuild) {
            if (principal.type !== 'tenant_member' && principal.type !== 'staff') {
                return reply.status(403).send({
                    error: 'Forbidden: guild/tenant membership required',
                });
            }

            if (principal.type === 'tenant_member') {
                const targetGuildId = extractTargetGuildId(request);
                if (targetGuildId && targetGuildId !== principal.guildId) {
                    return reply.status(403).send({
                        error: `Forbidden: cross-guild access denied. Principal is scoped to guild ${principal.guildId}, not ${targetGuildId}`,
                    });
                }
            }
        }

        // Allowed Principals Check
        if (
            authPolicy.allowedPrincipals &&
            !authPolicy.allowedPrincipals.includes(principal.type)
        ) {
            // Staff can access operator/internal or customer routes unless prohibited
            if (principal.type === 'staff') {
                // Allowed
            } else {
                return reply.status(403).send({
                    error: `Forbidden: principal type "${principal.type}" not allowed for this route`,
                });
            }
        }

        // Role Requirement within Tenant
        if (authPolicy.requiredRole && principal.type === 'tenant_member') {
            if (!authPolicy.requiredRole.includes(principal.role)) {
                return reply.status(403).send({
                    error: `Forbidden: requires role in [${authPolicy.requiredRole.join(', ')}], user has "${principal.role}"`,
                });
            }
        }

        // Global Mutation Guard: "any authenticated user grants no global mutation"
        if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
            if (principal.type === 'customer_user' && !authPolicy.public) {
                return reply.status(403).send({
                    error: 'Forbidden: customer user has no global mutation authority',
                });
            }
        }
    });
};

// Ensure hooks break Fastify encapsulation and apply to parent/sibling routes
(authGuardPlugin as unknown as Record<symbol, unknown>)[Symbol.for('skip-override')] = true;

export default authGuardPlugin;
