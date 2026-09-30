import {
    DisposalHandle,
    IPluginRouter,
    PluginRequestContext,
    PluginRouteAccess,
    PluginRouteDefinition,
    PluginRouteHandler,
} from '@jasper/types';

import logger from '../logger.js';

interface RequestLike {
    params?: Record<string, string>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    headers?: Record<string, string | string[] | undefined>;
    principal?: import('@jasper/types').AuthenticatedPrincipal;
    guildId?: string;
    id?: string;
    [key: string]: unknown;
}

interface ReplyLike {
    sent?: boolean;
    code: (statusCode: number) => ReplyLike;
    status?: (statusCode: number) => ReplyLike;
    send: (payload: unknown) => void;
    [key: string]: unknown;
}

interface InternalRouteEntry {
    method: string;
    pathDef: string;
    regex: RegExp;
    paramNames: string[];
    isTyped: boolean;
    definition?: PluginRouteDefinition<unknown, unknown>;
    legacyHandler?: PluginRouteHandler;
}

// Escape regex special characters in a string
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class DynamicPluginRouter implements IPluginRouter {
    private routes: InternalRouteEntry[] = [];
    private active: boolean = true;

    constructor(private pluginId: string) {}

    isActive(): boolean {
        return this.active;
    }

    /**
     * Deactivates this router immediately.
     * All registered routes are wiped and subsequent requests are rejected,
     * ensuring no stale handlers can execute after plugin unload.
     */
    deactivate(): void {
        this.active = false;
        this.routes = [];
        logger.debug(`[plugins:${this.pluginId}] Dynamic router deactivated`);
    }

    private compilePath(pathStr: string) {
        const paramNames: string[] = [];
        const parts = pathStr.split(/:([a-zA-Z0-9_]+)/g);
        let regexStr = '';
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                regexStr += escapeRegex(parts[i]);
            } else {
                paramNames.push(parts[i]);
                regexStr += '([a-zA-Z0-9_-]+)';
            }
        }
        return { regex: new RegExp(`^${regexStr}$`), paramNames };
    }

    private normalizePath(pathStr: string): string {
        let normalized = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    }

    /**
     * Register a strongly-typed route with schema and default-deny access policy.
     * Omission of schema or access policy fails registration (HJ-OSS-10).
     */
    registerRoute<TReq = unknown, TRes = unknown>(
        definition: PluginRouteDefinition<TReq, TRes>,
    ): DisposalHandle {
        if (!this.active) {
            throw new Error(
                `[plugins:${this.pluginId}] Cannot register route '${definition.path}': router is deactivated`,
            );
        }

        // 1. Access policy validation (Default is deny)
        if (!definition.access || typeof definition.access !== 'object') {
            throw new Error(
                `[plugins:${this.pluginId}] Route registration rejected: Missing access policy for ${definition.method} ${definition.path}. Default is deny.`,
            );
        }

        if (definition.access.kind !== 'public' && definition.access.kind !== 'authorized') {
            throw new Error(
                `[plugins:${this.pluginId}] Route registration rejected: Invalid access policy kind '${(definition.access as PluginRouteAccess).kind}' for ${definition.method} ${definition.path}.`,
            );
        }

        if (
            definition.access.kind === 'authorized' &&
            (!definition.access.policyAction || definition.access.policyAction.trim().length === 0)
        ) {
            throw new Error(
                `[plugins:${this.pluginId}] Route registration rejected: Authorized access policy must specify a valid policyAction for ${definition.method} ${definition.path}.`,
            );
        }

        // 2. Schema validation (Missing schema fails registration)
        if (!definition.schema || typeof definition.schema !== 'object') {
            throw new Error(
                `[plugins:${this.pluginId}] Route registration rejected: Missing schema bundle for ${definition.method} ${definition.path}.`,
            );
        }

        const normalized = this.normalizePath(definition.path);
        const { regex, paramNames } = this.compilePath(normalized);

        const entry: InternalRouteEntry = {
            method: definition.method.toUpperCase(),
            pathDef: normalized,
            regex,
            paramNames,
            isTyped: true,
            definition: definition as unknown as PluginRouteDefinition<unknown, unknown>,
        };

        this.routes.push(entry);
        logger.debug(
            `[plugins:${this.pluginId}] Registered typed route ${entry.method} ${entry.pathDef} (access: ${definition.access.kind})`,
        );

        return {
            dispose: () => {
                const idx = this.routes.indexOf(entry);
                if (idx !== -1) {
                    this.routes.splice(idx, 1);
                    logger.debug(
                        `[plugins:${this.pluginId}] Disposed route ${entry.method} ${entry.pathDef}`,
                    );
                }
            },
        };
    }

    private addLegacyRoute(
        method: string,
        pathStr: string,
        handler: PluginRouteHandler,
    ): IPluginRouter {
        if (!this.active) {
            throw new Error(
                `[plugins:${this.pluginId}] Cannot register route '${pathStr}': router is deactivated`,
            );
        }

        const normalized = this.normalizePath(pathStr);
        const { regex, paramNames } = this.compilePath(normalized);

        this.routes.push({
            method: method.toUpperCase(),
            pathDef: normalized,
            regex,
            paramNames,
            isTyped: false,
            legacyHandler: handler,
        });

        return this;
    }

    get(pathStr: string, handler: PluginRouteHandler): IPluginRouter {
        return this.addLegacyRoute('GET', pathStr, handler);
    }
    post(pathStr: string, handler: PluginRouteHandler): IPluginRouter {
        return this.addLegacyRoute('POST', pathStr, handler);
    }
    put(pathStr: string, handler: PluginRouteHandler): IPluginRouter {
        return this.addLegacyRoute('PUT', pathStr, handler);
    }
    delete(pathStr: string, handler: PluginRouteHandler): IPluginRouter {
        return this.addLegacyRoute('DELETE', pathStr, handler);
    }
    patch(pathStr: string, handler: PluginRouteHandler): IPluginRouter {
        return this.addLegacyRoute('PATCH', pathStr, handler);
    }
    options(pathStr: string, handler: PluginRouteHandler): IPluginRouter {
        return this.addLegacyRoute('OPTIONS', pathStr, handler);
    }
    all(pathStr: string, handler: PluginRouteHandler): IPluginRouter {
        return this.addLegacyRoute('ALL', pathStr, handler);
    }

    async register(
        pluginFn: (router: IPluginRouter, opts?: unknown) => void | Promise<void>,
        opts?: unknown,
    ): Promise<void> {
        if (typeof pluginFn === 'function') {
            await pluginFn(this, opts);
        }
    }

    /**
     * Dispatch incoming HTTP requests matching this plugin's path.
     * Enforces default-deny access policies, schema requirements, and guild scoping.
     */
    async handle(
        method: string,
        pathStr: string,
        req: RequestLike,
        reply: ReplyLike,
    ): Promise<boolean> {
        if (!this.active) {
            return false;
        }

        const normalized = this.normalizePath(pathStr);
        const upperMethod = method.toUpperCase();

        for (const route of this.routes) {
            if (route.method === upperMethod || route.method === 'ALL') {
                const match = normalized.match(route.regex);
                if (match) {
                    if (!req.params) {
                        req.params = {};
                    }
                    route.paramNames.forEach((name, i) => {
                        req.params![name] = match[i + 1];
                    });

                    // 1. Process Typed Route
                    if (route.isTyped && route.definition) {
                        const def = route.definition;

                        // Check Guild Scoping if required
                        const targetGuildId =
                            req.guildId ||
                            (typeof req.headers?.['x-jasper-guild-id'] === 'string'
                                ? req.headers['x-jasper-guild-id']
                                : typeof req.headers?.['x-guild-id'] === 'string'
                                  ? req.headers['x-guild-id']
                                  : (req.query?.guildId as string | undefined) ||
                                    (req.params?.guildId as string | undefined) ||
                                    (req.body?.guildId as string | undefined));

                        if (def.guildRequired && !targetGuildId) {
                            reply.code(400).send({
                                error: `guildId is required for this route (${def.method} ${def.path})`,
                            });
                            return true;
                        }

                        // Check Access Policy
                        if (def.access.kind === 'authorized') {
                            const principal = req.principal;
                            if (!principal || principal.type === 'anonymous') {
                                reply.code(401).send({
                                    error: 'Unauthorized: authentication required for this route',
                                });
                                return true;
                            }

                            // Principal Type check
                            if (
                                def.access.allowedPrincipals &&
                                !def.access.allowedPrincipals.includes(principal.type)
                            ) {
                                reply.code(403).send({
                                    error: `Forbidden: principal type '${principal.type}' is not authorized for action '${def.access.policyAction}'`,
                                });
                                return true;
                            }

                            // Cross-guild denial for tenant members
                            if (
                                principal.type === 'tenant_member' &&
                                targetGuildId &&
                                targetGuildId !== principal.guildId
                            ) {
                                reply.code(403).send({
                                    error: `Forbidden: cross-guild access denied. Scoped to ${principal.guildId}, not ${targetGuildId}`,
                                });
                                return true;
                            }

                            // Role check for tenant_member
                            if (
                                def.access.requiredRole &&
                                principal.type === 'tenant_member' &&
                                !def.access.requiredRole.includes(principal.role)
                            ) {
                                reply.code(403).send({
                                    error: `Forbidden: role '${principal.role}' is insufficient for action '${def.access.policyAction}'`,
                                });
                                return true;
                            }
                        }

                        // Simple schema validation for required body fields
                        if (def.schema.body && typeof def.schema.body === 'object') {
                            const required = (def.schema.body as { required?: string[] }).required;
                            if (Array.isArray(required) && required.length > 0) {
                                const body = req.body ?? {};
                                for (const field of required) {
                                    if (!(field in body) || body[field] === undefined) {
                                        reply.code(400).send({
                                            error: `Validation error: missing required body field '${field}'`,
                                        });
                                        return true;
                                    }
                                }
                            }
                        }

                        const context: PluginRequestContext = {
                            principal: req.principal || { type: 'anonymous' },
                            guild: targetGuildId
                                ? { guildId: targetGuildId, installationId: targetGuildId }
                                : undefined,
                            requestId:
                                req.id ||
                                `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        };

                        const result = await def.handler(context, req);
                        if (result !== undefined && !reply.sent) {
                            reply.send(result);
                        }
                        return true;
                    }

                    // 2. Process Legacy Route
                    if (route.legacyHandler) {
                        const result = await route.legacyHandler(req, reply);
                        if (result !== undefined && !reply.sent) {
                            reply.send(result);
                        }
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
