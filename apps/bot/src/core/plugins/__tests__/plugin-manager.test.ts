import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginManager } from "../plugin-manager.js";
import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";

// Mock dependencies
vi.mock("discord.js");
vi.mock("fastify");
vi.mock("../worker-pool.js", () => ({
  default: {
    getWorkers: vi.fn().mockReturnValue([]),
  },
}));
vi.mock("../hook-manager.js", () => ({
  default: {
    register: vi.fn(),
  },
}));
vi.mock("../core-data-accessor.js", () => ({
  default: {},
}));
vi.mock("../logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("PluginManager", () => {
  let pluginManager: PluginManager;
  let mockClient: Client;
  let mockServer: FastifyInstance;

  beforeEach(() => {
    pluginManager = new PluginManager();
    mockClient = new Client({ intents: [] });
    mockClient.commands = new Map() as any;
    mockServer = {
      register: vi.fn().mockImplementation((plugin, opts) => {
        // Simulate plugin registration
        return plugin({}, opts);
      }),
    } as unknown as FastifyInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize correctly", () => {
    pluginManager.init(mockClient, mockServer);
    // @ts-ignore - accessing private property for testing
    expect(pluginManager.context).toBeDefined();
  });

  it("should register a plugin", async () => {
    pluginManager.init(mockClient, mockServer);

    const mockPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      onLoad: vi.fn(),
      onUnload: vi.fn(),
    };

    const mockMetadata = {
      id: "test-plugin",
      name: "Test Plugin",
      version: "1.0.0",
    };

    await pluginManager.registerPlugin(
      mockPlugin,
      mockMetadata,
      "/tmp/test-plugin",
    );

    const plugins = pluginManager.getPlugins();
    expect(plugins.has("test-plugin")).toBe(true);
    expect(mockPlugin.onLoad).toHaveBeenCalled();
    expect(mockServer.register).toHaveBeenCalled();
  });

  it("should not register the same plugin twice", async () => {
    pluginManager.init(mockClient, mockServer);

    const mockPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      onLoad: vi.fn(),
      onUnload: vi.fn(),
    };

    const mockMetadata = {
      id: "test-plugin",
      name: "Test Plugin",
      version: "1.0.0",
    };

    await pluginManager.registerPlugin(
      mockPlugin,
      mockMetadata,
      "/tmp/test-plugin",
    );
    await pluginManager.registerPlugin(
      mockPlugin,
      mockMetadata,
      "/tmp/test-plugin",
    );

    expect(mockPlugin.onLoad).toHaveBeenCalledTimes(1);
  });

  it("should unload a plugin", async () => {
    pluginManager.init(mockClient, mockServer);

    const mockPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      onLoad: vi.fn(),
      onUnload: vi.fn(),
    };

    const mockMetadata = {
      id: "test-plugin",
      name: "Test Plugin",
      version: "1.0.0",
    };

    await pluginManager.registerPlugin(
      mockPlugin,
      mockMetadata,
      "/tmp/test-plugin",
    );
    await pluginManager.unloadPlugin("test-plugin");

    const plugins = pluginManager.getPlugins();
    expect(plugins.has("test-plugin")).toBe(false);
    expect(mockPlugin.onUnload).toHaveBeenCalled();
  });
});
