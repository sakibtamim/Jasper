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
});
