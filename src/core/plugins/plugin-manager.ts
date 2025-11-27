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
import semver from "semver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/core/plugins/plugin-manager.ts)
const PLUGINS_DIR = path.join(__dirname, "..", "..", "plugins");

// Read core version from package.json
const packageJsonPath = path.join(__dirname, "..", "..", "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const CORE_VERSION = packageJson.version;

export class PluginManager {
    private plugins: Map<string, { plugin: Plugin, context: PluginContext }>;
    private pluginCommands: Map<string, string[]>; // Track commands registered by each plugin
    private context: PluginContext | null;

    constructor() {
        this.plugins = new Map();
        this.pluginCommands = new Map();
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
                // Base implementation - just registers to client
                // This will be wrapped by the scoped context to add tracking
                logger.info(`[plugins] Registering dynamic command: ${command.data?.name}`);
                if (client.commands.has(command.data.name)) {
                    logger.warn(`[plugins] Command "${command.data.name}" is being overwritten by a plugin.`);
                }
                client.commands.set(command.data.name, command);
            },
            on: (hook, callback) => hookManager.register(hook, callback),
            db: {
                // This will be overridden per-plugin in registerPlugin
                plugin: new ScopedPluginStore("unknown"),
                core: coreDataAccessor,
            },
            logger: {
                debug: (msg: string) => logger.debug(`[plugins] ${msg}`),
                info: (msg: string) => logger.info(`[plugins] ${msg}`),
                warn: (msg: string) => logger.warn(`[plugins] ${msg}`),
                error: (msg: string) => logger.error(`[plugins] ${msg}`),
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
                await fs.promises.mkdir(PLUGINS_DIR, { recursive: true });
            } catch (e) {
                logger.error(`[plugins] Failed to create plugins directory: ${e}`);
                return;
            }
        }

        const entries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });

        for (const entry of entries) {
            // Strict Mode: Only load directories with jasper-plugin.json
            if (!entry.isDirectory()) continue;

            const pluginDir = path.join(PLUGINS_DIR, entry.name);
            const metadataPath = path.join(pluginDir, "jasper-plugin.json");

            if (!fs.existsSync(metadataPath)) {
                logger.warn(`[plugins] Skipping directory ${entry.name}: Missing jasper-plugin.json`);
                continue;
            }

            try {
                const metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf-8"));

                // 1. Validate ID
                if (!metadata.id || !/^[a-z0-9-]+$/.test(metadata.id)) {
                    logger.error(`[plugins] Skipping plugin in ${entry.name}: Invalid or missing 'id'. Must be lowercase, alphanumeric, and dashes only.`);
                    continue;
                }

                // 2. Check Version Compatibility
                if (metadata.jasperVersion) {
                    if (!semver.satisfies(CORE_VERSION, metadata.jasperVersion)) {
                        logger.warn(`[plugins] ⚠️ Plugin '${metadata.name}' (${metadata.id}) requires Jasper version ${metadata.jasperVersion}, but core is ${CORE_VERSION}. Loading anyway, but issues may occur.`);
                    }
                }

                const entryFile = metadata.entry || "index.js"; // Default to index.js (or index.ts in dev)

                // Resolve entry file (handle .ts for dev environment)
                let pluginPath = path.join(pluginDir, entryFile);
                if (!fs.existsSync(pluginPath) && entryFile.endsWith(".js")) {
                    // Try .ts if .js missing (dev mode)
                    const tsPath = pluginPath.replace(/\.js$/, ".ts");
                    if (fs.existsSync(tsPath)) {
                        pluginPath = tsPath;
                    }
                }

                if (!fs.existsSync(pluginPath)) {
                    logger.error(`[plugins] Entry file ${entryFile} not found for plugin ${entry.name}`);
                    continue;
                }

                // Use pathToFileURL to support Windows paths and proper ESM importing
                const fileUrl = pathToFileURL(pluginPath).href;
                const pluginModule = await import(fileUrl);
                const plugin: Plugin = pluginModule.default;

                if (!plugin || !plugin.name || !plugin.onLoad) {
                    logger.warn(`[plugins] Plugin ${entry.name} is missing required exports.`);
                    continue;
                }

                // Verify metadata matches code (optional, but good for consistency)
                if (plugin.name !== metadata.name) {
                    logger.warn(`[plugins] Plugin name mismatch: ${plugin.name} (code) vs ${metadata.name} (json)`);
                }

                await this.registerPlugin(plugin, metadata);
            } catch (error) {
                logger.error(`[plugins] Failed to load plugin ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Register and load a single plugin
     */
    async registerPlugin(plugin: Plugin, metadata: any): Promise<void> {
        if (this.plugins.has(plugin.name)) {
            logger.warn(`[plugins] Plugin ${plugin.name} is already registered.`);
            return;
        }

        try {
            logger.info(`[plugins] Loading plugin: ${plugin.name} v${plugin.version}`);

            // Initialize command tracking for this plugin
            this.pluginCommands.set(plugin.name, []);

            // 3. Auto-enforced Web Route Namespacing
            // We register a new Fastify scope with the plugin's ID as the prefix.
            // All routes registered via context.server inside onLoad will be scoped.
            await this.context!.server.register(async (scopedServer) => {
                // Create a context specific to this plugin
                const pluginContext: PluginContext = {
                    ...this.context!,
                    server: scopedServer, // Override server with scoped instance
                    db: {
                        plugin: new ScopedPluginStore(metadata.id), // Use ID for DB namespace
                        core: coreDataAccessor
                    },
                    logger: {
                        debug: (msg: string) => logger.debug(`[${metadata.id}] ${msg}`),
                        info: (msg: string) => logger.info(`[${metadata.id}] ${msg}`),
                        warn: (msg: string) => logger.warn(`[${metadata.id}] ${msg}`),
                        error: (msg: string) => logger.error(`[${metadata.id}] ${msg}`),
                    },
                    // Override registerCommand to track commands
                    registerCommand: (command: any) => {
                        this.context!.registerCommand(command); // Call base implementation
                        const commands = this.pluginCommands.get(plugin.name) || [];
                        commands.push(command.data.name);
                        this.pluginCommands.set(plugin.name, commands);
                    }
                };

                await plugin.onLoad(pluginContext);
                this.plugins.set(plugin.name, { plugin, context: pluginContext });
                logger.info(`[plugins] Successfully loaded ${plugin.name}`);
            }, { prefix: `/api/plugins/${metadata.id}` });
        } catch (error) {
            logger.error(`[plugins] Failed to initialize plugin ${plugin.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Unload a plugin
     */
    async unloadPlugin(name: string): Promise<void> {
        const entry = this.plugins.get(name);
        if (!entry) return;

        try {
            await entry.plugin.onUnload(entry.context);

            // Unregister commands
            const commands = this.pluginCommands.get(name) || [];
            if (commands.length > 0 && this.context?.client) {
                logger.info(`[plugins] Unregistering commands for ${name}: ${commands.join(", ")}`);
                for (const cmdName of commands) {
                    this.context.client.commands.delete(cmdName);
                }
            }
            this.pluginCommands.delete(name);

            this.plugins.delete(name);
            logger.info(`[plugins] Unloaded plugin: ${name}`);
        } catch (error) {
            logger.error(`[plugins] Error unloading plugin ${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

const pluginManager = new PluginManager();
export default pluginManager;
