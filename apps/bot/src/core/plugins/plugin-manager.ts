import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client, REST, Routes } from "discord.js";
import { FastifyInstance } from "fastify";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";
import logger from "../logger.js";
import workerPool from "../worker-pool.js";
import { Plugin, PluginContext } from "@jasper/types";
import hookManager from "./hook-manager.js";
import { ScopedPluginStore } from "./plugin-store.js";
import { PluginStorage } from "./plugin-storage.js";
import coreDataAccessor from "./core-data-accessor.js";
import { getQueue } from "../audio/queue-manager.js";
import semver from "semver";
import { TEST_PLUGINS } from "../../config/plugins.js";
import { getEntryMessage } from "../../config/afr-config.js";
import {
  DISCORD_CLIENT_ID,
  GUILD_ID,
  DISCORD_TOKEN,
} from "../../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/core/plugins/plugin-manager.ts)
const PLUGINS_DIR = path.join(__dirname, "..", "..", "plugins");

// Read core version from package.json
const packageJsonPath = path.join(__dirname, "..", "..", "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const CORE_VERSION = packageJson.version;

export class PluginManager {
  private plugins: Map<
    string,
    { plugin: Plugin; context: PluginContext; metadata: any; pluginDir: string }
  >;
  private pluginCommands: Map<string, string[]>; // Track commands registered by each plugin
  private pluginIntervals: Map<string, Set<NodeJS.Timeout>>; // Track intervals registered by each plugin
  private context: PluginContext | null;

  private soundboardQueues: Map<
    string,
    {
      queue: Array<{
        audioPath: string;
        title?: string;
        requesterId: string;
        resolve: () => void;
        reject: (err: any) => void;
      }>;
      processing: boolean;
      connection?: import("@discordjs/voice").VoiceConnection;
      timeout?: NodeJS.Timeout;
      textChannelId?: string;
      ownsConnection?: boolean; // Track if we created the connection or borrowed it from music queue
    }
  >;

  constructor() {
    this.plugins = new Map();
    this.pluginCommands = new Map();
    this.pluginIntervals = new Map();
    this.soundboardQueues = new Map();
    this.context = null;
  }

  /**
   * Process the soundboard queue for a specific voice channel
   */
  private async processSoundboardQueue(
    voiceChannelId: string,
    guildId: string,
  ) {
    const queueData = this.soundboardQueues.get(voiceChannelId);
    if (!queueData || queueData.queue.length === 0) {
      // Queue empty, set cleanup timeout
      if (queueData && queueData.connection) {
        logger.debug(
          `[plugins] Queue empty for ${voiceChannelId}, setting cleanup timeout`,
        );
        if (queueData.timeout) clearTimeout(queueData.timeout);

        queueData.timeout = setTimeout(() => {
          logger.info(
            `[plugins] Cleaning up idle soundboard connection for ${voiceChannelId}`,
          );

          // Only destroy connection if we own it (not borrowed from music queue)
          if (
            queueData.ownsConnection &&
            queueData.connection &&
            queueData.connection.state.status !==
              VoiceConnectionStatus.Destroyed
          ) {
            queueData.connection.destroy();
            // Only release worker if we owned the connection
            workerPool.releaseWorker(voiceChannelId);
          }

          this.soundboardQueues.delete(voiceChannelId);
        }, 60000); // 1 minute idle timeout
      }
      queueData!.processing = false;
      return;
    }

    queueData.processing = true;
    if (queueData.timeout) {
      clearTimeout(queueData.timeout);
      queueData.timeout = undefined;
    }

    const item = queueData.queue.shift()!;
    const { audioPath, resolve, reject } = item;

    try {
      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Check for existing music queue
      const existingQueue = getQueue(voiceChannelId);
      let player: import("@discordjs/voice").AudioPlayer;
      let connection: import("@discordjs/voice").VoiceConnection;

      if (existingQueue) {
        // Use existing connection (borrowed from music queue)
        connection = existingQueue.connection;
        queueData.connection = connection;
        queueData.ownsConnection = false; // We're borrowing this connection

        // Pause main player
        const wasPlaying =
          existingQueue.player.state.status === AudioPlayerStatus.Playing;
        if (wasPlaying) existingQueue.player.pause();

        // Create temp player
        player = createAudioPlayer({
          behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
        });
        connection.subscribe(player);

        logger.info(
          `[plugins] Playing soundboard clip over music in ${voiceChannelId}`,
        );

        // Play
        const resource = createAudioResource(fs.createReadStream(audioPath), {
          inputType: StreamType.Arbitrary,
        });
        player.play(resource);

        await new Promise<void>((res, rej) => {
          player.once("idle", () => {
            connection.subscribe(existingQueue.player);
            if (wasPlaying) existingQueue.player.unpause();
            player.stop();
            res();
          });
          player.once("error", (err) => {
            connection.subscribe(existingQueue.player);
            if (wasPlaying) existingQueue.player.unpause();
            player.stop();
            rej(err);
          });
        });
      } else {
        // No music queue, manage our own connection
        if (
          !queueData.connection ||
          queueData.connection.state.status === VoiceConnectionStatus.Destroyed
        ) {
          // Allocate worker
          const worker = workerPool.allocateWorker(guildId, voiceChannelId);
          if (!worker) throw new Error("No workers available");

          const channel = await worker.client.channels.fetch(voiceChannelId);
          if (!channel || !channel.isVoiceBased())
            throw new Error("Invalid voice channel");

          connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
            group: worker.client.user!.id,
            selfDeaf: true,
          });
          queueData.connection = connection;
          queueData.ownsConnection = true; // We created this connection

          // Wait for connection to be ready
          try {
            await entersState(connection, VoiceConnectionStatus.Ready, 5000);

            // Send Welcome Message
            if (queueData.textChannelId) {
              try {
                const textChannel = await worker.client.channels.fetch(
                  queueData.textChannelId,
                );
                if (
                  textChannel &&
                  textChannel.isTextBased() &&
                  "send" in textChannel
                ) {
                  const message = getEntryMessage(worker.name);
                  await textChannel.send(message);
                }
              } catch (err) {
                logger.warn(`[plugins] Failed to send welcome message: ${err}`);
              }
            }
          } catch (error) {
            logger.error(
              `[plugins] Connection failed to become ready: ${error}`,
            );
            connection.destroy();
            throw error;
          }
        } else {
          connection = queueData.connection;
        }

        player = createAudioPlayer({
          behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
        });
        connection.subscribe(player);

        const resource = createAudioResource(fs.createReadStream(audioPath), {
          inputType: StreamType.Arbitrary,
        });
        player.play(resource);

        logger.info(`[plugins] Playing soundboard clip in ${voiceChannelId}`);

        await new Promise<void>((res, rej) => {
          player.once("idle", () => {
            player.stop();
            res();
          });
          player.once("error", (err) => {
            player.stop();
            rej(err);
          });
        });
      }

      resolve();
    } catch (error) {
      logger.error(`[plugins] Error playing soundboard clip: ${error}`);
      reject(error);
    } finally {
      // Process next item
      this.processSoundboardQueue(voiceChannelId, guildId);
    }
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
        logger.info(
          `[plugins] Registering dynamic command: ${command.data?.name}`,
        );
        if (client.commands.has(command.data.name)) {
          logger.warn(
            `[plugins] Command "${command.data.name}" is being overwritten by a plugin.`,
          );
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
        const {
          voiceChannelId,
          guildId,
          audioPath,
          title,
          requesterId,
          channelId,
        } = params;

        if (!this.soundboardQueues.has(voiceChannelId)) {
          this.soundboardQueues.set(voiceChannelId, {
            queue: [],
            processing: false,
            textChannelId: channelId,
          });
        } else if (channelId) {
          // Update text channel if provided
          const q = this.soundboardQueues.get(voiceChannelId)!;
          q.textChannelId = channelId;
        }

        const queueData = this.soundboardQueues.get(voiceChannelId)!;

        return new Promise<void>((resolve, reject) => {
          queueData.queue.push({
            audioPath,
            title,
            requesterId,
            resolve,
            reject,
          });
          if (!queueData.processing) {
            this.processSoundboardQueue(voiceChannelId, guildId);
          }
        });
      },
      scheduleTask: (intervalMs, task) => {
        // Base implementation - overridden by scoped context
        logger.warn(
          "[plugins] scheduleTask called on base context. This should not happen.",
        );
      },
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
      logger.warn(
        `[plugins] Plugins directory not found at ${PLUGINS_DIR}, creating it...`,
      );
      try {
        await fs.promises.mkdir(PLUGINS_DIR, { recursive: true });
      } catch (e) {
        logger.error(`[plugins] Failed to create plugins directory: ${e}`);
        return;
      }
    }

    const entries = await fs.promises.readdir(PLUGINS_DIR, {
      withFileTypes: true,
    });

    // Test plugins to disable in production by default
    // TEST_PLUGINS imported from config

    for (const entry of entries) {
      // Strict Mode: Only load directories or symlinks with jasper-plugin.json
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

      const pluginDir = path.join(PLUGINS_DIR, entry.name);
      const metadataPath = path.join(pluginDir, "jasper-plugin.json");

      if (!fs.existsSync(metadataPath)) {
        logger.warn(
          `[plugins] Skipping directory ${entry.name}: Missing jasper-plugin.json`,
        );
        continue;
      }

      try {
        const metadata = JSON.parse(
          await fs.promises.readFile(metadataPath, "utf-8"),
        );

        // 1. Validate ID
        if (!metadata.id || !/^[a-z0-9-]+$/.test(metadata.id)) {
          logger.error(
            `[plugins] Skipping plugin in ${entry.name}: Invalid or missing 'id'. Must be lowercase, alphanumeric, and dashes only.`,
          );
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
            logger.info(
              `[plugins] Auto-disabling test plugin in production: ${metadata.id}`,
            );
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
            logger.warn(
              `[plugins] ⚠️ Plugin '${metadata.name}' (${metadata.id}) requires Jasper version ${metadata.jasperVersion}, but core is ${CORE_VERSION}. Loading anyway, but issues may occur.`,
            );
          }
        }

        const entryFile = metadata.entry || "index.js"; // Default to index.js (or index.ts in dev)

        // Resolve entry file (handle .ts for dev environment, .js for prod)
        let pluginPath = path.join(pluginDir, entryFile);
        if (!fs.existsSync(pluginPath)) {
          if (entryFile.endsWith(".js")) {
            // Try .ts if .js missing (dev mode)
            const tsPath = pluginPath.replace(/\.js$/, ".ts");
            if (fs.existsSync(tsPath)) {
              pluginPath = tsPath;
            }
          } else if (entryFile.endsWith(".ts")) {
            // Try .js if .ts missing (prod mode)
            const jsPath = pluginPath.replace(/\.ts$/, ".js");
            if (fs.existsSync(jsPath)) {
              pluginPath = jsPath;
            }
          }
        }

        if (!fs.existsSync(pluginPath)) {
          logger.error(
            `[plugins] Entry file ${entryFile} not found for plugin ${entry.name}`,
          );
          continue;
        }

        // Use pathToFileURL to support Windows paths and proper ESM importing
        const fileUrl = pathToFileURL(pluginPath).href;
        const pluginModule = await import(fileUrl);
        const plugin: Plugin = pluginModule.default;

        if (!plugin || !plugin.name || !plugin.onLoad) {
          logger.warn(
            `[plugins] Plugin ${entry.name} is missing required exports.`,
          );
          continue;
        }

        // Verify metadata matches code (optional, but good for consistency)
        if (plugin.name !== metadata.name) {
          logger.warn(
            `[plugins] Plugin name mismatch: ${plugin.name} (code) vs ${metadata.name} (json)`,
          );
        }

        await this.registerPlugin(plugin, metadata, pluginDir);
      } catch (error) {
        logger.error(
          `[plugins] Failed to load plugin ${entry.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Register and load a single plugin
   */
  async registerPlugin(
    plugin: Plugin,
    metadata: any,
    pluginDir: string,
  ): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      logger.warn(`[plugins] Plugin ${plugin.name} is already registered.`);
      return;
    }

    try {
      logger.info(
        `[plugins] Loading plugin: ${plugin.name} v${plugin.version}`,
      );

      // Initialize command tracking for this plugin
      this.pluginCommands.set(plugin.name, []);

      // 3. Auto-enforced Web Route Namespacing
      // We register a new Fastify scope with the plugin's ID as the prefix.
      // All routes registered via context.server inside onLoad will be scoped.
      await this.context!.server.register(
        async (scopedServer) => {
          // Create a context specific to this plugin
          const pluginContext: PluginContext = {
            ...this.context!,
            server: scopedServer, // Override server with scoped instance
            db: {
              plugin: new ScopedPluginStore(metadata.id), // Use ID for DB namespace
              core: coreDataAccessor,
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
            },
            scheduleTask: (intervalMs, task) => {
              if (intervalMs <= 0) {
                throw new Error("Interval must be positive");
              }

              const interval = setInterval(async () => {
                try {
                  await task();
                } catch (error) {
                  logger.error(
                    `[plugin:${metadata.id}] Scheduled task failed: ${error}`,
                  );
                }
              }, intervalMs);

              if (!this.pluginIntervals.has(plugin.name)) {
                this.pluginIntervals.set(plugin.name, new Set());
              }
              this.pluginIntervals.get(plugin.name)!.add(interval);
              logger.debug(
                `[plugin:${metadata.id}] Scheduled task with interval ${intervalMs}ms`,
              );
            },
          };

          await plugin.onLoad(pluginContext);
          this.plugins.set(plugin.name, {
            plugin,
            context: pluginContext,
            metadata,
            pluginDir,
          });
          logger.info(`[plugins] Successfully loaded ${plugin.name}`);
        },
        { prefix: `/api/plugins/${metadata.id}` },
      );
    } catch (error) {
      logger.error(
        `[plugins] Failed to initialize plugin ${plugin.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
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
        logger.info(
          `[plugins] Unregistering commands for ${name}: ${commands.join(", ")}`,
        );
        for (const cmdName of commands) {
          this.context.client.commands.delete(cmdName);
        }
      }
      this.pluginCommands.delete(name);

      // Clear intervals
      const intervals = this.pluginIntervals.get(name);
      if (intervals) {
        logger.info(
          `[plugins] Clearing ${intervals.size} scheduled tasks for ${name}`,
        );
        for (const interval of intervals) {
          clearInterval(interval);
        }
        this.pluginIntervals.delete(name);
      }

      this.plugins.delete(name);
      logger.info(`[plugins] Unloaded plugin: ${name}`);
    } catch (error) {
      logger.error(
        `[plugins] Error unloading plugin ${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Toggle plugin enabled state
   */
  async togglePlugin(
    pluginId: string,
    enabled: boolean,
  ): Promise<{ success: boolean; message?: string }> {
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
        const entries = await fs.promises.readdir(PLUGINS_DIR, {
          withFileTypes: true,
        });
        let found = false;

        for (const entry of entries) {
          if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

          const pluginDir = path.join(PLUGINS_DIR, entry.name);
          const metadataPath = path.join(pluginDir, "jasper-plugin.json");

          if (!fs.existsSync(metadataPath)) continue;

          const metadata = JSON.parse(
            await fs.promises.readFile(metadataPath, "utf-8"),
          );
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

            // Deploy commands to Discord after loading plugin
            await this.deployCommands();

            break;
          }
        }

        if (!found)
          return { success: false, message: "Plugin not found on disk" };
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
          // Deploy commands to Discord after unloading plugin
          await this.deployCommands();
        } else {
          // It might be already unloaded, which is fine
          logger.info(`[plugins] Plugin ${pluginId} is already unloaded`);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error(`[plugins] Failed to toggle plugin ${pluginId}: ${error}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deploy all registered commands to Discord
   * Called after loading/unloading plugins to update slash commands
   */
  async deployCommands(): Promise<void> {
    if (!this.context || !DISCORD_CLIENT_ID || !GUILD_ID) {
      logger.warn(
        "[plugins] Skipping command deployment: Missing client context or Discord credentials",
      );
      return;
    }

    try {
      logger.info("[plugins] Deploying commands to Discord...");
      const commandsData = this.context.client.commands.map((cmd: any) => {
        // Handle both Builders (toJSON) and plain objects
        return typeof cmd.data.toJSON === "function"
          ? cmd.data.toJSON()
          : cmd.data;
      });

      const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

      await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, GUILD_ID),
        { body: commandsData },
      );
      logger.info(
        `[plugins] Successfully deployed ${commandsData.length} commands.`,
      );
    } catch (error) {
      logger.error(`[plugins] Failed to deploy commands: ${error}`);
    }
  }

  /**
   * Get all plugins with their status
   */
  async getPluginStatus(): Promise<
    Array<{
      id: string;
      name: string;
      version: string;
      description: string;
      enabled: boolean;
      isTestPlugin: boolean;
    }>
  > {
    if (!this.context) return [];

    const statusList: Array<{
      id: string;
      name: string;
      version: string;
      description: string;
      enabled: boolean;
      isTestPlugin: boolean;
    }> = [];
    const dbMeta = await this.context.db.core.getAllPluginMeta();
    const dbEnabledMap = new Map(dbMeta.map((m) => [m.pluginId, m.enabled]));

    // Scan directory to get all available plugins
    if (fs.existsSync(PLUGINS_DIR)) {
      const entries = await fs.promises.readdir(PLUGINS_DIR, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

        try {
          const metadataPath = path.join(
            PLUGINS_DIR,
            entry.name,
            "jasper-plugin.json",
          );
          if (!fs.existsSync(metadataPath)) continue;

          const metadata = JSON.parse(
            await fs.promises.readFile(metadataPath, "utf-8"),
          );

          // Determine enabled status
          // 1. Check DB
          // 2. If not in DB, check if it's currently loaded
          // 3. If not loaded, check default logic (test plugins disabled in prod)

          let enabled = false;
          if (dbEnabledMap.has(metadata.id)) {
            enabled = dbEnabledMap.get(metadata.id)!;
          } else {
            // Fallback to loaded status
            enabled = Array.from(this.plugins.values()).some(
              (p) => p.metadata.id === metadata.id,
            );
          }

          const isTestPlugin = TEST_PLUGINS.includes(metadata.id);

          statusList.push({
            id: metadata.id,
            name: metadata.name,
            version: metadata.version,
            description: metadata.description,
            enabled,
            isTestPlugin,
          });
        } catch (e) {
          logger.warn(
            `[plugins] Failed to read metadata for ${entry.name}: ${e}`,
          );
        }
      }
    }

    return statusList;
  }
}

const pluginManager = new PluginManager();
export default pluginManager;
