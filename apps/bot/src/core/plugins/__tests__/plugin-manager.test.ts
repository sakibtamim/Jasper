import { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginManager } from '../plugin-manager.js';

// Mock dependencies
vi.mock('discord.js');
vi.mock('fastify');
vi.mock('../worker-pool.js', () => ({
    default: {
        getWorkers: vi.fn().mockReturnValue([]),
    },
}));
vi.mock('../hook-manager.js', () => ({
    default: {
        register: vi.fn(),
    },
}));
vi.mock('../core-data-accessor.js', () => ({
    default: {},
}));
vi.mock('../logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('PluginManager', () => {
    let pluginManager: PluginManager;
    let mockClient: Client;
    let mockServer: { register: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        pluginManager = new PluginManager();
        mockClient = new Client({ intents: [] });
        mockClient.commands = new Map() as unknown as Client['commands'];
        mockServer = {
            register: vi.fn(),
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize correctly', () => {
        pluginManager.init(mockClient, mockServer as unknown as import('fastify').FastifyInstance);
        // @ts-expect-error - testing private property
        expect(pluginManager.context).toBeDefined();
    });

    it('should register a plugin', async () => {
        pluginManager.init(mockClient, mockServer as unknown as import('fastify').FastifyInstance);

        const mockPlugin = {
            name: 'test-plugin',
            version: '1.0.0',
            onLoad: vi.fn(),
            onUnload: vi.fn(),
        };

        const mockMetadata = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
        };

        await pluginManager.registerPlugin(mockPlugin, mockMetadata, '/tmp/test-plugin');

        const plugins = pluginManager.getPlugins();
        expect(plugins.has('test-plugin')).toBe(true);
        expect(mockPlugin.onLoad).toHaveBeenCalled();
    });

    it('should not register the same plugin twice', async () => {
        pluginManager.init(mockClient, mockServer as unknown as import('fastify').FastifyInstance);

        const mockPlugin = {
            name: 'test-plugin',
            version: '1.0.0',
            onLoad: vi.fn(),
            onUnload: vi.fn(),
        };

        const mockMetadata = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
        };

        await pluginManager.registerPlugin(mockPlugin, mockMetadata, '/tmp/test-plugin');
        await pluginManager.registerPlugin(mockPlugin, mockMetadata, '/tmp/test-plugin');

        expect(mockPlugin.onLoad).toHaveBeenCalledTimes(1);
    });

    it('should unload a plugin', async () => {
        pluginManager.init(mockClient, mockServer as unknown as import('fastify').FastifyInstance);

        const mockPlugin = {
            name: 'test-plugin',
            version: '1.0.0',
            onLoad: vi.fn(),
            onUnload: vi.fn(),
        };

        const mockMetadata = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
        };

        await pluginManager.registerPlugin(mockPlugin, mockMetadata, '/tmp/test-plugin');
        await pluginManager.unloadPlugin('test-plugin');

        const plugins = pluginManager.getPlugins();
        expect(plugins.has('test-plugin')).toBe(false);
        expect(mockPlugin.onUnload).toHaveBeenCalled();
    });

    it('should automatically register declarative commands if not registered during onLoad', async () => {
        pluginManager.init(mockClient, mockServer as unknown as import('fastify').FastifyInstance);

        const mockExecute = vi.fn();
        const mockPlugin = {
            name: 'declarative-plugin',
            version: '1.0.0',
            commands: [
                {
                    data: { name: 'declarative-cmd', description: 'Declarative test command' },
                    execute: mockExecute,
                },
            ],
            onLoad: vi.fn(),
            onUnload: vi.fn(),
        };

        const mockMetadata = {
            id: 'declarative-plugin',
            name: 'Declarative Plugin',
            version: '1.0.0',
        };

        await pluginManager.registerPlugin(mockPlugin, mockMetadata, '/tmp/declarative-plugin');

        expect(mockClient.commands.has('declarative-cmd')).toBe(true);
        expect(mockClient.commands.get('declarative-cmd')?.execute).toBe(mockExecute);
    });

    it('should not overwrite commands already registered during onLoad', async () => {
        pluginManager.init(mockClient, mockServer as unknown as import('fastify').FastifyInstance);

        const liveExecute = vi.fn();
        const dummyExecute = vi.fn();

        const mockPlugin = {
            name: 'priority-plugin',
            version: '1.0.0',
            commands: [
                {
                    data: { name: 'priority-cmd', description: 'Dummy descriptor' },
                    execute: dummyExecute,
                },
            ],
            onLoad: vi.fn(async (ctx) => {
                ctx.registerCommand({
                    data: { name: 'priority-cmd', description: 'Live handler' },
                    execute: liveExecute,
                });
            }),
            onUnload: vi.fn(),
        };

        const mockMetadata = {
            id: 'priority-plugin',
            name: 'Priority Plugin',
            version: '1.0.0',
        };

        await pluginManager.registerPlugin(mockPlugin, mockMetadata, '/tmp/priority-plugin');

        expect(mockClient.commands.has('priority-cmd')).toBe(true);
        expect(mockClient.commands.get('priority-cmd')?.execute).toBe(liveExecute);
    });

    it('should roll back registered commands if plugin onLoad throws an error', async () => {
        pluginManager.init(mockClient, mockServer as unknown as import('fastify').FastifyInstance);

        const mockPlugin = {
            name: 'failing-plugin',
            version: '1.0.0',
            commands: [
                {
                    data: { name: 'failing-cmd', description: 'Should be rolled back' },
                    execute: vi.fn(),
                },
            ],
            onLoad: vi.fn(async (ctx) => {
                ctx.registerCommand({
                    data: { name: 'early-cmd', description: 'Registered before crash' },
                    execute: vi.fn(),
                });
                throw new Error('Plugin initialization failed unexpectedly');
            }),
            onUnload: vi.fn(),
        };

        const mockMetadata = {
            id: 'failing-plugin',
            name: 'Failing Plugin',
            version: '1.0.0',
        };

        await pluginManager.registerPlugin(mockPlugin, mockMetadata, '/tmp/failing-plugin');

        expect(mockClient.commands.has('early-cmd')).toBe(false);
        expect(mockClient.commands.has('failing-cmd')).toBe(false);
        expect(pluginManager.getPlugins().has('failing-plugin')).toBe(false);
    });
});
