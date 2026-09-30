import { AuthenticatedPrincipal, Plugin, PluginManifest } from '@jasper/types';
import { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import hookManager from '../hook-manager.js';
import { DefaultInstallationRuntimeOperations } from '../installation-operations.js';
import { PluginManager } from '../plugin-manager.js';
import { validatePluginManifest } from '../plugin-manifest.js';
import { MemoryRuntimeComponentStateStore } from '../runtime-component-store.js';

// Mock workerPool and db
vi.mock('../../worker-pool.js', () => ({
    default: {
        getWorkers: vi.fn().mockReturnValue([
            {
                name: 'worker-1',
                role: 'controller',
                client: {
                    isReady: () => true,
                    guilds: { cache: new Map([['guild-1', { ownerId: 'owner-123' }]]) },
                },
                busy: false,
                guildId: 'guild-1',
                voiceChannelId: 'vc-1',
            },
        ]),
        allocateWorker: vi.fn(),
        releaseWorker: vi.fn(),
    },
}));

vi.mock('../../db/index.js', () => ({
    default: {
        getPluginData: vi.fn().mockResolvedValue(null),
        setPluginData: vi.fn().mockResolvedValue(undefined),
        deletePluginData: vi.fn().mockResolvedValue(undefined),
        clearPluginData: vi.fn().mockResolvedValue(undefined),
        getAllPluginMeta: vi.fn().mockResolvedValue([]),
        isPluginEnabled: vi.fn().mockResolvedValue(true),
        setPluginEnabled: vi.fn().mockResolvedValue(undefined),
        deletePluginMeta: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('Plugin SDK vNext & Contract (HJ-OSS-10)', () => {
    let pluginManager: PluginManager;
    let mockClient: Client;
    let mockServer: { register: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        pluginManager = new PluginManager();
        mockClient = new Client({ intents: [] });
        mockClient.commands = new Map() as unknown as Client['commands'];

        // Register core commands that simulate Jasper's built-in commands
        mockClient.commands.set('play', {
            data: { name: 'play', description: 'Play music' },
        } as any);
        mockClient.commands.set('skip', {
            data: { name: 'skip', description: 'Skip song' },
        } as any);
        mockClient.commands.set('seek', {
            data: { name: 'seek', description: 'Seek playback' },
        } as any);

        mockServer = { register: vi.fn() };
        pluginManager.init(mockClient, mockServer as any);
    });

    afterEach(async () => {
        vi.clearAllMocks();
        hookManager.clear();
    });

    describe('1. Manifest Validation & Versioning', () => {
        it('validates a well-formed vNext manifest with capabilities and SDK range', () => {
            const raw = {
                id: 'custom-soundboard',
                name: 'Custom Soundboard',
                version: '1.2.0',
                sdkVersion: '^1.0.0',
                description: 'Custom sound effects',
                capabilities: ['audio:play', 'routes:register', 'commands:register'],
            };
            const result = validatePluginManifest(raw, '1.0.0', true);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.manifest?.id).toBe('custom-soundboard');
        });

        it('rejects invalid plugin IDs with uppercase, spaces, or special characters', () => {
            const invalidIds = ['MyPlugin', 'sound board', 'plugin_1', 'plugin!'];
            for (const id of invalidIds) {
                const res = validatePluginManifest({ id, name: 'Test', version: '1.0.0' });
                expect(res.valid).toBe(false);
                expect(res.errors[0]).toContain("Invalid plugin 'id'");
            }
        });

        it('rejects invalid semantic versions', () => {
            const res = validatePluginManifest({
                id: 'test-plugin',
                name: 'Test',
                version: 'not-a-semver',
            });
            expect(res.valid).toBe(false);
            expect(res.errors[0]).toContain("Invalid semantic version in 'version'");
        });

        it('fails validation in strict/hosted mode if sdkVersion is incompatible with core', () => {
            const raw = {
                id: 'future-plugin',
                name: 'Future Plugin',
                version: '1.0.0',
                sdkVersion: '^2.0.0', // Requires Jasper 2.x
            };
            const result = validatePluginManifest(raw, '1.0.0', true);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain("Plugin requires SDK version range '^2.0.0'");
        });

        it('rejects directory traversal in manifest entry path', () => {
            const raw = {
                id: 'traversal-plugin',
                name: 'Bad Plugin',
                version: '1.0.0',
                entry: '../outside.js',
            };
            const result = validatePluginManifest(raw, '1.0.0', false);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Invalid entry path');
        });
    });

    describe('2. Command Collision Prevention', () => {
        it('prevents a plugin from overwriting core bot commands', async () => {
            const collidingPlugin: Plugin = {
                name: 'hijack-play',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.registerCommand({
                        data: { name: 'play', description: 'Hijacked play command' },
                        execute: vi.fn(),
                    });
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'hijack-play',
                name: 'hijack-play',
                version: '1.0.0',
                capabilities: ['commands:register'],
            };

            await expect(
                pluginManager.registerPlugin(collidingPlugin, metadata, '/tmp/hijack-play'),
            ).rejects.toThrow(/collides with a core bot command and cannot be overwritten/);

            // Verify core command remained intact
            expect(mockClient.commands.get('play')?.data.description).toBe('Play music');
        });

        it('prevents a plugin from colliding with another plugin command', async () => {
            const pluginA: Plugin = {
                name: 'plugin-a',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.registerCommand({
                        data: { name: 'custom-cmd', description: 'Plugin A Command' },
                        execute: vi.fn(),
                    });
                },
                onUnload: vi.fn(),
            };

            const pluginB: Plugin = {
                name: 'plugin-b',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.registerCommand({
                        data: { name: 'custom-cmd', description: 'Plugin B Command' },
                        execute: vi.fn(),
                    });
                },
                onUnload: vi.fn(),
            };

            const metaA: PluginManifest = {
                id: 'plugin-a',
                name: 'plugin-a',
                version: '1.0.0',
                capabilities: ['commands:register'],
            };

            const metaB: PluginManifest = {
                id: 'plugin-b',
                name: 'plugin-b',
                version: '1.0.0',
                capabilities: ['commands:register'],
            };

            await pluginManager.registerPlugin(pluginA, metaA, '/tmp/a');
            await expect(pluginManager.registerPlugin(pluginB, metaB, '/tmp/b')).rejects.toThrow(
                /is already registered by plugin 'plugin-a'/,
            );
        });
    });

    describe('3. Capability Enforcement', () => {
        it('denies commands:register when capability is omitted', async () => {
            const plugin: Plugin = {
                name: 'no-commands-cap',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.registerCommand({
                        data: { name: 'safe-cmd', description: 'Safe' },
                        execute: vi.fn(),
                    });
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'no-commands-cap',
                name: 'no-commands-cap',
                version: '1.0.0',
                capabilities: ['routes:register'], // No commands:register
            };

            await expect(
                pluginManager.registerPlugin(plugin, metadata, '/tmp/test'),
            ).rejects.toThrow(
                /Capability denied: Plugin does not declare capability 'commands:register'/,
            );
        });

        it('denies hooks:subscribe when capability is omitted', async () => {
            const plugin: Plugin = {
                name: 'no-hooks-cap',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.on('QUEUE_CREATE', vi.fn());
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'no-hooks-cap',
                name: 'no-hooks-cap',
                version: '1.0.0',
                capabilities: ['commands:register'],
            };

            await expect(
                pluginManager.registerPlugin(plugin, metadata, '/tmp/test'),
            ).rejects.toThrow(
                /Capability denied: Plugin does not declare capability 'hooks:subscribe'/,
            );
        });

        it('denies routes:register when capability is omitted', async () => {
            const plugin: Plugin = {
                name: 'no-routes-cap',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.server.registerRoute({
                        method: 'GET',
                        path: '/test',
                        access: { kind: 'public' },
                        schema: {},
                        handler: async () => ({ ok: true }),
                    });
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'no-routes-cap',
                name: 'no-routes-cap',
                version: '1.0.0',
                capabilities: ['tasks:schedule'],
            };

            await expect(
                pluginManager.registerPlugin(plugin, metadata, '/tmp/test'),
            ).rejects.toThrow(
                /Capability denied: Plugin does not declare capability 'routes:register'/,
            );
        });

        it('denies tasks:schedule when capability is omitted', async () => {
            const plugin: Plugin = {
                name: 'no-tasks-cap',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.scheduleTask(1000, vi.fn());
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'no-tasks-cap',
                name: 'no-tasks-cap',
                version: '1.0.0',
                capabilities: ['audio:play'],
            };

            await expect(
                pluginManager.registerPlugin(plugin, metadata, '/tmp/test'),
            ).rejects.toThrow(
                /Capability denied: Plugin does not declare capability 'tasks:schedule'/,
            );
        });

        it('exposes componentState and installationOperations only when requested', async () => {
            let capturedContext: any = null;

            const plugin: Plugin = {
                name: 'hosted-adapter-mock',
                version: '1.0.0',
                onLoad: async (context) => {
                    capturedContext = context;
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'hosted-adapter-mock',
                name: 'hosted-adapter-mock',
                version: '1.0.0',
                capabilities: ['component:state', 'installation:runtime'],
            };

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/hosted');
            expect(capturedContext.componentState).toBeDefined();
            expect(capturedContext.installationOperations).toBeDefined();
        });

        it('does NOT expose componentState and installationOperations to legacy plugins without explicit capabilities', async () => {
            let capturedContext: any = null;

            const plugin: Plugin = {
                name: 'legacy-plugin-mock',
                version: '1.0.0',
                onLoad: async (context) => {
                    capturedContext = context;
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'legacy-plugin-mock',
                name: 'legacy-plugin-mock',
                version: '1.0.0',
                // capabilities omitted (legacy)
            };

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/legacy');
            expect(capturedContext.componentState).toBeUndefined();
            expect(capturedContext.installationOperations).toBeUndefined();
        });
    });

    describe('4. Typed Route Registration & Default-Deny Auth', () => {
        it('rejects route registration when access policy is missing (default deny)', async () => {
            let router: any;
            const plugin: Plugin = {
                name: 'deny-route',
                version: '1.0.0',
                onLoad: async (context) => {
                    router = context.server;
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'deny-route',
                name: 'deny-route',
                version: '1.0.0',
                capabilities: ['routes:register'],
            };

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/deny');

            expect(() => {
                router.registerRoute({
                    method: 'GET',
                    path: '/unprotected',
                    schema: {},
                    handler: vi.fn(),
                } as any);
            }).toThrow(/Missing access policy for GET \/unprotected\. Default is deny\./);
        });

        it('rejects route registration when schema is missing', async () => {
            let router: any;
            const plugin: Plugin = {
                name: 'schema-route',
                version: '1.0.0',
                onLoad: async (context) => {
                    router = context.server;
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'schema-route',
                name: 'schema-route',
                version: '1.0.0',
                capabilities: ['routes:register'],
            };

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/schema');

            expect(() => {
                router.registerRoute({
                    method: 'POST',
                    path: '/no-schema',
                    access: { kind: 'public' },
                    handler: vi.fn(),
                } as any);
            }).toThrow(/Missing schema bundle for POST \/no-schema\./);
        });

        it('rejects anonymous requests to authorized route with 401', async () => {
            const plugin: Plugin = {
                name: 'auth-route',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.server.registerRoute({
                        method: 'POST',
                        path: '/admin-action',
                        access: {
                            kind: 'authorized',
                            policyAction: 'admin:execute',
                            allowedPrincipals: ['staff'],
                        },
                        schema: {},
                        handler: async () => ({ success: true }),
                    });
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'auth-route',
                name: 'auth-route',
                version: '1.0.0',
                capabilities: ['routes:register'],
            };

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/auth');

            let sentPayload: any = null;
            let statusCode = 200;
            const mockReply = {
                code: (c: number) => {
                    statusCode = c;
                    return mockReply;
                },
                send: (p: any) => {
                    sentPayload = p;
                },
            };

            const handled = await pluginManager.handleDynamicRoute(
                'auth-route',
                'POST',
                '/admin-action',
                { principal: { type: 'anonymous' } },
                mockReply,
            );

            expect(handled).toBe(true);
            expect(statusCode).toBe(401);
            expect(sentPayload?.error).toContain('authentication required');
        });

        it('enforces role requirements for tenant members and requires guild if guildRequired: true', async () => {
            const plugin: Plugin = {
                name: 'guild-scoped-route',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.server.registerRoute({
                        method: 'POST',
                        path: '/guild-action',
                        access: {
                            kind: 'authorized',
                            policyAction: 'guild:moderate',
                            requiredRole: ['admin', 'owner'],
                        },
                        guildRequired: true,
                        schema: {
                            body: { required: ['action'] },
                        },
                        handler: async (ctx, req: any) => ({
                            appliedBy: ctx.principal,
                            action: req.body.action,
                            guild: ctx.guild,
                        }),
                    });
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'guild-scoped-route',
                name: 'guild-scoped-route',
                version: '1.0.0',
                capabilities: ['routes:register'],
            };

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/guild-route');

            // 1. Missing guildId -> 400 Bad Request
            let statusCode = 200;
            let sentPayload: any;
            const reply = {
                code: (c: number) => {
                    statusCode = c;
                    return reply;
                },
                send: (p: any) => {
                    sentPayload = p;
                },
            };

            const memberPrincipal: AuthenticatedPrincipal = {
                type: 'tenant_member',
                userId: 'user-1',
                username: 'alice',
                guildId: 'guild-1',
                role: 'member',
            };

            await pluginManager.handleDynamicRoute(
                'guild-scoped-route',
                'POST',
                '/guild-action',
                { principal: memberPrincipal }, // No guildId provided
                reply,
            );
            expect(statusCode).toBe(400);
            expect(sentPayload?.error).toContain('guildId is required');

            // 2. Insufficient role ('member' vs required ['admin', 'owner']) -> 403 Forbidden
            await pluginManager.handleDynamicRoute(
                'guild-scoped-route',
                'POST',
                '/guild-action',
                { principal: memberPrincipal, guildId: 'guild-1' },
                reply,
            );
            expect(statusCode).toBe(403);
            expect(sentPayload?.error).toContain("role 'member' is insufficient");

            // 3. Schema validation error -> 400 Bad Request
            const adminPrincipal: AuthenticatedPrincipal = {
                type: 'tenant_member',
                userId: 'admin-1',
                username: 'bob',
                guildId: 'guild-1',
                role: 'admin',
            };

            await pluginManager.handleDynamicRoute(
                'guild-scoped-route',
                'POST',
                '/guild-action',
                { principal: adminPrincipal, guildId: 'guild-1', body: {} }, // Missing 'action' field
                reply,
            );
            expect(statusCode).toBe(400);
            expect(sentPayload?.error).toContain("missing required body field 'action'");

            // 4. Successful execution with PluginRequestContext
            statusCode = 200;
            await pluginManager.handleDynamicRoute(
                'guild-scoped-route',
                'POST',
                '/guild-action',
                {
                    principal: adminPrincipal,
                    guildId: 'guild-1',
                    body: { action: 'clear-queue' },
                },
                reply,
            );
            expect(statusCode).toBe(200);
            expect(sentPayload?.action).toBe('clear-queue');
            expect(sentPayload?.guild?.guildId).toBe('guild-1');
        });
    });

    describe('5. Deterministic Lifecycle Unloading & Stale Handler Prevention', () => {
        it('disposes all commands, hooks, intervals, and deactivates routes on unload', async () => {
            let hookExecuted = false;
            const hookCallback = () => {
                hookExecuted = true;
            };

            const plugin: Plugin = {
                name: 'lifecycle-test',
                version: '1.0.0',
                onLoad: async (context) => {
                    context.registerCommand({
                        data: { name: 'ephemeral-cmd', description: 'Ephemeral' },
                        execute: vi.fn(),
                    });
                    context.on('QUEUE_CREATE', hookCallback);
                    context.scheduleTask(100, vi.fn());
                    context.server.registerRoute({
                        method: 'GET',
                        path: '/live',
                        access: { kind: 'public' },
                        schema: {},
                        handler: async () => ({ live: true }),
                    });
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'lifecycle-test',
                name: 'lifecycle-test',
                version: '1.0.0',
                capabilities: [
                    'commands:register',
                    'hooks:subscribe',
                    'tasks:schedule',
                    'routes:register',
                ],
            };

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/life');

            // Verify registrations before unload
            expect(mockClient.commands.has('ephemeral-cmd')).toBe(true);

            // Test route works before unload
            let sentPayload: any;
            const reply = {
                code: () => reply,
                send: (p: any) => {
                    sentPayload = p;
                },
            };
            const beforeHandled = await pluginManager.handleDynamicRoute(
                'lifecycle-test',
                'GET',
                '/live',
                {},
                reply,
            );
            expect(beforeHandled).toBe(true);
            expect(sentPayload).toEqual({ live: true });

            // Trigger hook before unload
            await hookManager.triggerSync('QUEUE_CREATE', {} as any);
            expect(hookExecuted).toBe(true);

            // Now unload plugin
            hookExecuted = false;
            await pluginManager.unloadPlugin('lifecycle-test');

            // 1. Command removed
            expect(mockClient.commands.has('ephemeral-cmd')).toBe(false);

            // 2. Hook listener removed
            await hookManager.triggerSync('QUEUE_CREATE', {} as any);
            expect(hookExecuted).toBe(false);

            // 3. Route is deactivated (no stale handler can execute)
            const afterHandled = await pluginManager.handleDynamicRoute(
                'lifecycle-test',
                'GET',
                '/live',
                {},
                reply,
            );
            expect(afterHandled).toBe(false);
        });
    });

    describe('6. Safe Client Facade', () => {
        it('blocks token access and destructive operations on context.client', async () => {
            let capturedClient: any;

            const plugin: Plugin = {
                name: 'facade-test',
                version: '1.0.0',
                onLoad: async (context) => {
                    capturedClient = context.client;
                },
                onUnload: vi.fn(),
            };

            const metadata: PluginManifest = {
                id: 'facade-test',
                name: 'facade-test',
                version: '1.0.0',
            };

            // Set a fake token on raw client
            (mockClient as any).token = 'secret-bot-token-12345';

            await pluginManager.registerPlugin(plugin, metadata, '/tmp/facade');

            // 1. Reading token returns undefined
            expect(capturedClient.token).toBeUndefined();

            // 2. Destructive operations throw
            expect(() => capturedClient.login('bad')).toThrow(/cannot invoke client\.login/);
            expect(() => capturedClient.destroy()).toThrow(/cannot invoke client\.destroy/);
        });
    });

    describe('7. Component State Store & Installation Operations', () => {
        it('enforces CAS versioning and observation coalescing in component state store', async () => {
            const store = new MemoryRuntimeComponentStateStore(5);

            // 1. Initial CAS set (expected null)
            const val1 = await store.compareAndSet(
                'comp-1',
                'cursor',
                null,
                new Uint8Array([1, 2, 3]),
            );
            expect(val1.version).toBe(1);

            // 2. Conflicting CAS set throws
            await expect(
                store.compareAndSet('comp-1', 'cursor', null, new Uint8Array([4, 5])),
            ).rejects.toThrow(/CAS conflict/);

            // 3. Valid CAS update
            const val2 = await store.compareAndSet('comp-1', 'cursor', 1, new Uint8Array([9, 9]));
            expect(val2.version).toBe(2);

            // 4. Observation coalescing
            await store.appendObservation({
                componentId: 'comp-1',
                bootId: 'boot-1',
                sequence: 1,
                epoch: 1,
                eventType: 'health_status',
                payload: { cpu: 10 },
                timestamp: new Date(),
                coalesceKey: 'health',
                required: false,
            });

            await store.appendObservation({
                componentId: 'comp-1',
                bootId: 'boot-1',
                sequence: 2,
                epoch: 1,
                eventType: 'health_status',
                payload: { cpu: 20 },
                timestamp: new Date(),
                coalesceKey: 'health', // Same coalesce key -> coalesces in place
                required: false,
            });

            expect(store.getObservationCount()).toBe(1);

            // 5. Overflow on required record throws
            const smallStore = new MemoryRuntimeComponentStateStore(1);
            await smallStore.appendObservation({
                componentId: 'comp-2',
                bootId: 'boot-1',
                sequence: 1,
                epoch: 1,
                eventType: 'config_ack',
                payload: {},
                timestamp: new Date(),
                required: true,
            });

            await expect(
                smallStore.appendObservation({
                    componentId: 'comp-2',
                    bootId: 'boot-1',
                    sequence: 2,
                    epoch: 1,
                    eventType: 'license_bound',
                    payload: {},
                    timestamp: new Date(),
                    required: true,
                }),
            ).rejects.toThrow(/Observation buffer overflow: cannot drop required record/);
        });

        it('performs snapshot, drain, and fenced leave in installation operations', async () => {
            const ops = new DefaultInstallationRuntimeOperations(5);

            // Snapshot
            const snapshot = await ops.snapshot({ guildId: 'guild-1', installationId: 'inst-1' });
            expect(snapshot.scope.guildId).toBe('guild-1');
            expect(snapshot.fenceEpoch).toBe(5);
            expect(snapshot.members).toHaveLength(1);
            expect(snapshot.members[0].role).toBe('owner');

            // Drain
            const drainResult = await ops.drain(
                { guildId: 'guild-1', installationId: 'inst-1' },
                'op-drain-1',
            );
            expect(drainResult.operationId).toBe('op-drain-1');

            // Fenced leave check
            await expect(
                ops.leaveApplication(
                    { guildId: 'guild-1', installationId: 'inst-1' },
                    'app-1',
                    'op-leave-1',
                    4, // Mismatched fence (current is 5)
                ),
            ).rejects.toThrow(/Fence check failed/);

            // Correct fence succeeds
            await expect(
                ops.leaveApplication(
                    { guildId: 'guild-1', installationId: 'inst-1' },
                    'app-1',
                    'op-leave-1',
                    5,
                ),
            ).resolves.toBeUndefined();
        });
    });
});
