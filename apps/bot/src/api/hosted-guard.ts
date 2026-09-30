import { RuntimeProfile } from '@jasper/types';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import { RUNTIME_PROFILE } from '../config/env.js';

export const FORBIDDEN_HOSTED_ROUTE_PATTERNS: { name: string; pattern: RegExp }[] = [
    { name: 'legacy /api/auth/*', pattern: /^\/api\/auth(\/.*)?$/ },
    { name: 'DevTools /api/devtools/*', pattern: /^\/api\/devtools(\/.*)?$/ },
    { name: 'global dashboard status', pattern: /^\/api\/status$/ },
    { name: 'global dashboard queues', pattern: /^\/api\/queues$/ },
    { name: 'global dashboard cache', pattern: /^\/api\/cache$/ },
    { name: 'global dashboard logs', pattern: /^\/api\/logs$/ },
    { name: 'global dashboard stats', pattern: /^\/api\/stats$/ },
    { name: 'customer plugin install', pattern: /^\/api\/plugins\/install$/ },
    { name: 'customer plugin storage', pattern: /^\/api\/plugins\/[^/]+\/storage(\/.*)?$/ },
    { name: 'customer plugin toggle', pattern: /^\/api\/plugins\/[^/]+\/toggle$/ },
];

/**
 * Checks whether a given route URL is prohibited under the hosted runtime profile.
 */
export function isForbiddenHostedRoute(url: string): { forbidden: boolean; ruleName?: string } {
    const cleanUrl = url.split('?')[0];
    for (const rule of FORBIDDEN_HOSTED_ROUTE_PATTERNS) {
        if (rule.pattern.test(cleanUrl)) {
            return { forbidden: true, ruleName: rule.name };
        }
    }
    return { forbidden: false };
}

export interface HostedGuardOptions {
    profile?: RuntimeProfile;
}

/**
 * Fastify plugin that fails closed on startup if any legacy or dangerous routes
 * are registered when running under the 'hosted' runtime profile.
 */
export const hostedGuardPlugin: FastifyPluginAsync<HostedGuardOptions> = async (
    fastify: FastifyInstance,
    options: HostedGuardOptions,
) => {
    const profile = options.profile ?? RUNTIME_PROFILE;
    if (profile !== 'hosted') {
        return;
    }

    fastify.addHook('onRoute', (routeOptions) => {
        const check = isForbiddenHostedRoute(routeOptions.url);
        if (check.forbidden) {
            throw new Error(
                `Hosted runtime profile violation: route "${routeOptions.method} ${routeOptions.url}" (${check.ruleName}) cannot be enabled in hosted profile. Startup aborted.`,
            );
        }
    });
};

(hostedGuardPlugin as unknown as Record<symbol, unknown>)[Symbol.for('skip-override')] = true;

/**
 * Assertion utility to ensure server has no forbidden hosted routes.
 * Throws immediately if violations are detected.
 */
export function assertHostedRouteSafety(
    server: FastifyInstance,
    profile: RuntimeProfile = RUNTIME_PROFILE,
): void {
    if (profile !== 'hosted') {
        return;
    }

    // Inspect server's registered routes via printRoutes or internal route structure if available
    // When using hostedGuardPlugin, the onRoute hook guarantees immediate failure,
    // but this function provides an explicit checkpoint prior to listen.
    const forbiddenFound: string[] = [];

    // Check if server has routes registered
    const routesString = typeof server.printRoutes === 'function' ? server.printRoutes() : '';
    for (const rule of FORBIDDEN_HOSTED_ROUTE_PATTERNS) {
        // Simple search heuristic for route names in printed route tree
        if (
            rule.name.includes('/api/auth') &&
            (routesString.includes('/api/auth') || routesString.includes('/auth/login'))
        ) {
            forbiddenFound.push(rule.name);
        } else if (rule.name.includes('/api/devtools') && routesString.includes('/api/devtools')) {
            forbiddenFound.push(rule.name);
        } else if (
            rule.name.includes('global dashboard') &&
            routesString.includes(rule.name.split(' ')[2])
        ) {
            forbiddenFound.push(rule.name);
        } else if (
            rule.name.includes('customer plugin') &&
            routesString.includes('/api/plugins/install')
        ) {
            forbiddenFound.push(rule.name);
        }
    }

    if (forbiddenFound.length > 0) {
        throw new Error(
            `Hosted startup validation failed: legacy /api/auth/*, DevTools, dashboard, public operations, or customer plugin-management routes remain enabled. Found: ${forbiddenFound.join(', ')}`,
        );
    }
}

export default hostedGuardPlugin;
