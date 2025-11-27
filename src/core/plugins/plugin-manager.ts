import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import logger from "../logger.js";
import workerPool from "../worker-pool.js";
import { Plugin, PluginContext } from "./plugin-interface.js";
import hookManager from "./hook-manager.js";
import { ScopedPluginStore } from "./plugin-store.js";
import coreDataAccessor from "./core-data-accessor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/core/plugins/plugin-manager.ts)
const PLUGINS_DIR = path.join(__dirname, "..", "..", "plugins");

export class PluginManager {
    private plugins: Map<string, Plugin>;
    private context: PluginContext | null;

    constructor() {
        this.plugins = new Map();
        this.context = null;
    }

    /**
     * Initialize the Plugin Manager with core dependencies
     */
    init(client: Client, server: FastifyInstance): void {
        this.context = {
            client,
            workers: workerPool.getWorkers(),
            server,
            registerCommand: (command: any) => {
                // Dynamic command registration (Phase 1: Basic logging)
                logger.info(`[plugins] Registering dynamic command: ${command.data?.name}`);
                client.commands.set(command.data.name, command);
            },
            on: (hook, callback) => hookManager.register(hook, callback),
            db: {
                // This will be overridden per-plugin in registerPlugin
                plugin: new ScopedPluginStore("unknown"),
                core: coreDataAccessor,
            }
        };
        logger.info("[plugins] PluginManager initialized");
    }

    /**
     * Load all plugins from the plugins directory
     */
    async loadPlugins(): Promise<void> {
        if (!this.context) {
            logger.error("[plugins] Cannot load plugins: Manager not initialized");
            return;
        }

        if (!fs.existsSync(PLUGINS_DIR)) {
            logger.warn(`[plugins] Plugins directory not found at ${PLUGINS_DIR}, creating it...`);
            try {
                fs.mkdirSync(PLUGINS_DIR, { recursive: true });
            } catch (e) {
                logger.error(`[plugins] Failed to create plugins directory: ${e}`);
                return;
            }
        }

        const entries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });

        for (const entry of entries) {
            let pluginPath: string | null = null;

            if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) && !entry.name.endsWith(".d.ts")) {
                pluginPath = path.join(PLUGINS_DIR, entry.name);
            } else if (entry.isDirectory()) {
                // Check for index.ts or index.js
                const indexTs = path.join(PLUGINS_DIR, entry.name, "index.ts");
                const indexJs = path.join(PLUGINS_DIR, entry.name, "index.js");

                if (fs.existsSync(indexTs)) {
                    pluginPath = indexTs;
                } else if (fs.existsSync(indexJs)) {
                    pluginPath = indexJs;
                }
            }

            if (!pluginPath) continue;

            try {
                // Use pathToFileURL to support Windows paths and proper ESM importing
                const fileUrl = pathToFileURL(pluginPath).href;
                const pluginModule = await import(fileUrl);
                const plugin: Plugin = pluginModule.default;

                if (!plugin || !plugin.name || !plugin.onLoad) {
                    logger.warn(`[plugins] Plugin file ${entry.name} is missing required exports.`);
                    continue;
                }

                await this.registerPlugin(plugin);
            } catch (error) {
                logger.error(`[plugins] Failed to load plugin ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Register and load a single plugin
     */
    async registerPlugin(plugin: Plugin): Promise<void> {
        if (this.plugins.has(plugin.name)) {
            logger.warn(`[plugins] Plugin ${plugin.name} is already registered.`);
            return;
        }

        try {
            logger.info(`[plugins] Loading plugin: ${plugin.name} v${plugin.version}`);

            // Create a context specific to this plugin
            const pluginContext: PluginContext = {
                ...this.context!,
                db: {
                    plugin: new ScopedPluginStore(plugin.name),
                    core: coreDataAccessor
                }
            };

            await plugin.onLoad(pluginContext);
            this.plugins.set(plugin.name, plugin);
            logger.info(`[plugins] Successfully loaded ${plugin.name}`);
        } catch (error) {
            logger.error(`[plugins] Failed to initialize plugin ${plugin.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Unload a plugin
     */
    async unloadPlugin(name: string): Promise<void> {
        const plugin = this.plugins.get(name);
        if (!plugin) return;

        try {
            await plugin.onUnload(this.context!);
            this.plugins.delete(name);
            logger.info(`[plugins] Unloaded plugin: ${name}`);
        } catch (error) {
            logger.error(`[plugins] Error unloading plugin ${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

const pluginManager = new PluginManager();
export default pluginManager;
