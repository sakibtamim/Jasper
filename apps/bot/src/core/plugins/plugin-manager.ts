import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, NoSubscriberBehavior, AudioPlayerStatus } from "@discordjs/voice";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import logger from "../logger.js";
import workerPool from "../worker-pool.js";
import { Plugin, PluginContext } from "./plugin-interface.js";
import hookManager from "./hook-manager.js";
import { ScopedPluginStore } from "./plugin-store.js";
import { PluginStorage } from "./plugin-storage.js";
import coreDataAccessor from "./core-data-accessor.js";
import { getQueue } from "../audio/queue-manager.js";
import semver from "semver";

const execPromise = promisify(exec);

/**
 * Get audio duration in milliseconds using ffprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
    try {
        const { stdout } = await execPromise(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
        );
        const durationInSeconds = parseFloat(stdout.trim());
        return Math.ceil(durationInSeconds * 1000); // Convert to ms and round up
    } catch (error) {
        logger.warn(`[plugins] Failed to detect audio duration for ${filePath}: ${error}`);
        return 10000; // Default to 10 seconds if detection fails
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/core/plugins/plugin-manager.ts)
const PLUGINS_DIR = path.join(__dirname, "..", "..", "plugins");

// Read core version from package.json
const packageJsonPath = path.join(__dirname, "..", "..", "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const CORE_VERSION = packageJson.version;

export class PluginManager {
    private plugins: Map<string, { plugin: Plugin, context: PluginContext, metadata: any, pluginDir: string }>;
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
            storage: new PluginStorage("core"),
            logger: {
                debug: (msg: string) => logger.debug(`[plugins] ${msg}`),
                info: (msg: string) => logger.info(`[plugins] ${msg}`),
                warn: (msg: string) => logger.warn(`[plugins] ${msg}`),
                error: (msg: string) => logger.error(`[plugins] ${msg}`),
            },
            playAudio: async (params) => {
                const { voiceChannelId, guildId, audioPath, title, requesterId } = params;

                logger.debug(`[plugins] playAudio called for ${voiceChannelId}, checking paths...`);

                // Check if file exists
                if (!fs.existsSync(audioPath)) {
                    throw new Error(`Audio file not found: ${audioPath}`);
                }

                // Check if queue already exists
                const existingQueue = getQueue(voiceChannelId);

                if (existingQueue) {
                    logger.debug(`[plugins] Found existing queue for ${voiceChannelId}, using pause/resume with player switching`);

                    // 1. Pause main player if currently playing
                    const wasPlaying = existingQueue.player.state.status === AudioPlayerStatus.Playing;
                    if (wasPlaying) {
                        existingQueue.player.pause();
                        logger.info(`[plugins] Paused music for soundboard in ${voiceChannelId}`);
                    }

                    // 2. Create temporary player for soundboard
                    const tempPlayer = createAudioPlayer({
                        behaviors: { noSubscriber: NoSubscriberBehavior.Stop }
                    });

                    // 3. Switch subscription from main player to temp player
                    existingQueue.connection.subscribe(tempPlayer);
                    logger.info(`[plugins] Switched to temp player for soundboard in ${voiceChannelId}`);

                    // 4. Play soundboard on temp player
                    const resource = createAudioResource(fs.createReadStream(audioPath), {
                        inputType: StreamType.Arbitrary
                    });
                    tempPlayer.play(resource);

                    // 5. On soundboard finish: restore main player
                    tempPlayer.once('idle', () => {
                        // Re-subscribe main player to connection
                        existingQueue.connection.subscribe(existingQueue.player);
                        logger.info(`[plugins] Restored main player subscription in ${voiceChannelId}`);

                        // Resume if was playing
                        if (wasPlaying) {
                            existingQueue.player.unpause();
                            logger.info(`[plugins] Resumed music after soundboard in ${voiceChannelId}`);
                        }

                        // Cleanup temp player
                        tempPlayer.stop();
                    });

                    // 6. Error handling - ensure we restore main player
                    tempPlayer.on('error', (error) => {
                        logger.error(`[plugins] Soundboard error: ${error.message}`);
                        existingQueue.connection.subscribe(existingQueue.player);
                        if (wasPlaying) existingQueue.player.unpause();
                        tempPlayer.stop();
                    });

                    logger.debug(`[plugins] Returning early from playAudio for ${voiceChannelId}, no temp connection created`);
                    return;
                }

                // No queue - need to create temporary connection
                logger.info(`[plugins] No queue found, creating temporary connection for ${voiceChannelId}`);

                // Allocate a worker
                const worker = workerPool.allocateWorker(guildId, voiceChannelId);
                if (!worker) {
                    throw new Error("No workers available for audio playback");
                }

                try {
                    // Fetch the channel
                    const channel = await worker.client.channels.fetch(voiceChannelId);
                    if (!channel || !channel.isVoiceBased()) {
                        throw new Error("Invalid voice channel");
                    }

                    // Join voice channel
                    const connection = joinVoiceChannel({
                        channelId: voiceChannelId,
                        guildId: guildId,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                        group: worker.client.user!.id,
                        selfDeaf: true,
                    });

                    // Create player
                    const player = createAudioPlayer({
                        behaviors: { noSubscriber: NoSubscriberBehavior.Stop }
                    });
                    connection.subscribe(player);

                    // Wait 2s for connection to stabilize
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Get audio duration
                    const duration = await getAudioDuration(audioPath);
                    logger.info(`[plugins] Audio duration detected: ${duration}ms`);

                    // Validate timeout duration (minimum 5s)
                    const timeoutDuration = Math.max(60000, 5000); // Use 60s or minimum 5s
                    logger.debug(`[plugins] Using cleanup timeout: ${timeoutDuration}ms`);

                    // Play audio
                    const resource = createAudioResource(fs.createReadStream(audioPath), {
                        inputType: StreamType.Arbitrary
                    });
                    player.play(resource);

                    logger.info(`[plugins] Playing audio: ${title || audioPath}`);

                    // Auto-cleanup after 1 minute
                    setTimeout(() => {
                        connection.destroy();
                        workerPool.releaseWorker(voiceChannelId);
                        logger.info(`[plugins] Cleaned up temporary audio connection for ${voiceChannelId}`);
                    }, timeoutDuration);

                    // Error handling
                    player.on('error', (error) => {
                        logger.error(`[plugins] Audio player error: ${error.message}`);
                        connection.destroy();
                        workerPool.releaseWorker(voiceChannelId);
                    });

                } catch (error) {
                    workerPool.releaseWorker(voiceChannelId);
                    throw error;
                }
            }
        };
        logger.info("[plugins] PluginManager initialized");
    }

    /**
     * Get all registered plugins with their metadata
     */
    getPlugins() {
        return this.plugins;
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

        // Test plugins to disable in production by default
        const TEST_PLUGINS = [
            "advanced-hooks-test-plugin",
            "db-test-plugin",
            "dashboard-notes",
            "media-gallery"
        ];

        for (const entry of entries) {
            // Strict Mode: Only load directories or symlinks with jasper-plugin.json
            if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

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

                // 2. Check Enabled Status
                let isEnabled = await this.context.db.core.isPluginEnabled(metadata.id);

                // If not set in DB, determine default
                if (isEnabled === null) {
                    const isProduction = process.env.NODE_ENV === "production";
                    const isTestPlugin = TEST_PLUGINS.includes(metadata.id);

                    // In production, disable test plugins by default
                    if (isProduction && isTestPlugin) {
                        isEnabled = false;
                        logger.info(`[plugins] Auto-disabling test plugin in production: ${metadata.id}`);
                    } else {
                        isEnabled = true;
                    }

                    // Persist default state
                    await this.context.db.core.setPluginEnabled(metadata.id, isEnabled);
                }

                if (!isEnabled) {
                    logger.info(`[plugins] Skipping disabled plugin: ${metadata.id}`);
                    continue;
                }

                // 3. Check Version Compatibility
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

                await this.registerPlugin(plugin, metadata, pluginDir);
            } catch (error) {
                logger.error(`[plugins] Failed to load plugin ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Register and load a single plugin
     */
    async registerPlugin(plugin: Plugin, metadata: any, pluginDir: string): Promise<void> {
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
                    storage: new PluginStorage(metadata.id),
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
                this.plugins.set(plugin.name, { plugin, context: pluginContext, metadata, pluginDir });
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

    /**
     * Toggle plugin enabled state
     */
    async togglePlugin(pluginId: string, enabled: boolean): Promise<{ success: boolean; message?: string }> {
        if (!this.context) {
            return { success: false, message: "Plugin manager not initialized" };
        }

        try {
            // 1. Update database state
            await this.context.db.core.setPluginEnabled(pluginId, enabled);

            // 2. Load or Unload
            if (enabled) {
                // To load, we need to find the plugin directory and metadata
                // This is a bit inefficient as we scan all plugins, but safe
                const entries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });
                let found = false;

                for (const entry of entries) {
                    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

                    const pluginDir = path.join(PLUGINS_DIR, entry.name);
                    const metadataPath = path.join(pluginDir, "jasper-plugin.json");

                    if (!fs.existsSync(metadataPath)) continue;

                    const metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf-8"));
                    if (metadata.id === pluginId) {
                        // Found it, load it
                        const entryFile = metadata.entry || "index.js";
                        let pluginPath = path.join(pluginDir, entryFile);

                        if (!fs.existsSync(pluginPath) && entryFile.endsWith(".js")) {
                            const tsPath = pluginPath.replace(/\.js$/, ".ts");
                            if (fs.existsSync(tsPath)) pluginPath = tsPath;
                        }

                        if (!fs.existsSync(pluginPath)) {
                            return { success: false, message: "Plugin entry file not found" };
                        }

                        const fileUrl = pathToFileURL(pluginPath).href;
                        // Cache busting for reload
                        const pluginModule = await import(`${fileUrl}?t=${Date.now()}`);
                        const plugin: Plugin = pluginModule.default;

                        await this.registerPlugin(plugin, metadata, pluginDir);
                        found = true;
                        break;
                    }
                }

                if (!found) return { success: false, message: "Plugin not found on disk" };

            } else {
                // Disable: find plugin by name (which usually matches ID, but we should be careful)
                // We store plugins by name in the map, but we need to find it by ID
                let pluginName = "";
                for (const [name, data] of this.plugins.entries()) {
                    if (data.metadata.id === pluginId) {
                        pluginName = name;
                        break;
                    }
                }

                if (pluginName) {
                    await this.unloadPlugin(pluginName);
                } else {
                    // It might be already unloaded, which is fine
                    logger.info(`[plugins] Plugin ${pluginId} is already unloaded`);
                }
            }

            return { success: true };
        } catch (error) {
            logger.error(`[plugins] Failed to toggle plugin ${pluginId}: ${error}`);
            return { success: false, message: error instanceof Error ? error.message : String(error) };
        }
    }

    /**
     * Get all plugins with their status
     */
    async getPluginStatus(): Promise<Array<{ id: string; name: string; version: string; description: string; enabled: boolean; isTestPlugin: boolean }>> {
        if (!this.context) return [];

        const statusList: Array<{ id: string; name: string; version: string; description: string; enabled: boolean; isTestPlugin: boolean }> = [];
        const dbMeta = await this.context.db.core.getAllPluginMeta();
        const dbEnabledMap = new Map(dbMeta.map(m => [m.pluginId, m.enabled]));

        // Scan directory to get all available plugins
        if (fs.existsSync(PLUGINS_DIR)) {
            const entries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

                try {
                    const metadataPath = path.join(PLUGINS_DIR, entry.name, "jasper-plugin.json");
                    if (!fs.existsSync(metadataPath)) continue;

                    const metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf-8"));

                    // Determine enabled status
                    // 1. Check DB
                    // 2. If not in DB, check if it's currently loaded
                    // 3. If not loaded, check default logic (test plugins disabled in prod)

                    let enabled = false;
                    if (dbEnabledMap.has(metadata.id)) {
                        enabled = dbEnabledMap.get(metadata.id)!;
                    } else {
                        // Fallback to loaded status
                        enabled = Array.from(this.plugins.values()).some(p => p.metadata.id === metadata.id);
                    }

                    const isTestPlugin = [
                        "advanced-hooks-test-plugin",
                        "db-test-plugin",
                        "dashboard-notes",
                        "media-gallery"
                    ].includes(metadata.id);

                    statusList.push({
                        id: metadata.id,
                        name: metadata.name,
                        version: metadata.version,
                        description: metadata.description,
                        enabled,
                        isTestPlugin
                    });
                } catch (e) {
                    logger.warn(`[plugins] Failed to read metadata for ${entry.name}: ${e}`);
                }
            }
        }

        return statusList;
    }
}

const pluginManager = new PluginManager();
export default pluginManager;
