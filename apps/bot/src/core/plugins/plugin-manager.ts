import {
    AudioPlayerStatus,
    NoSubscriberBehavior,
    StreamType,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
} from '@discordjs/voice';
import {
    Command,
    DisposalHandle,
    IPluginRouter,
    Plugin,
    PluginCapability,
    PluginContext,
    PluginHealthContributor,
    PluginHealthStatus,
    PluginManifest,
    PluginRouteDefinition,
    SlashCommandDefinition,
    WorkerPublicState,
} from '@jasper/types';
import { Client, REST, Routes } from 'discord.js';
import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'url';

import { getEntryMessage } from '../../config/afr-config.js';
import { DISCORD_CLIENT_ID, DISCORD_TOKEN, GUILD_ID, RUNTIME_PROFILE } from '../../config/env.js';
import { TEST_PLUGINS } from '../../config/plugins.js';
import { PluginAudioService } from '../audio/plugin-audio-service.js';
import { getQueue } from '../audio/queue-manager.js';
import db from '../db/index.js';
import logger from '../logger.js';
import workerPool from '../worker-pool.js';
import coreDataAccessor from './core-data-accessor.js';
import { DynamicPluginRouter } from './dynamic-plugin-router.js';
import hookManager from './hook-manager.js';
import { DefaultInstallationRuntimeOperations } from './installation-operations.js';
import { isCapabilityDeclared, validatePluginManifest } from './plugin-manifest.js';
import { PluginStorage } from './plugin-storage.js';
import { ScopedPluginStore } from './plugin-store.js';
import { MemoryRuntimeComponentStateStore } from './runtime-component-store.js';
import { createSafeClientFacade } from './safe-client-facade.js';

export { DynamicPluginRouter } from './dynamic-plugin-router.js';

interface RequestLike {
    params?: Record<string, string>;
    [key: string]: unknown;
}

interface ReplyLike {
    sent?: boolean;
    code: (statusCode: number) => ReplyLike;
    status?: (statusCode: number) => ReplyLike;
    send: (payload: unknown) => void;
    [key: string]: unknown;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/core/plugins/plugin-manager.ts)
export const PLUGINS_DIR = path.join(__dirname, '..', '..', 'plugins');

// Read core version from package.json
const packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const CORE_VERSION: string = packageJson.version;

export class PluginManager {
    private plugins: Map<
        string,
        {
            plugin: Plugin;
            context: PluginContext;
            metadata: PluginManifest;
            pluginDir: string;
            router: DynamicPluginRouter;
        }
    >;
    private pluginCommands: Map<string, string[]>; // Track commands registered by each plugin
    private pluginIntervals: Map<string, Set<NodeJS.Timeout>>; // Track intervals registered by each plugin
    private pluginRouters: Map<string, DynamicPluginRouter>; // O(1) plugin-id → router lookup
    private pluginDisposalHandles: Map<string, DisposalHandle[]>; // Track all disposal handles per plugin
    private coreCommands: Set<string>; // Core commands that cannot be overwritten
    private registeredCommands: Map<string, string>; // commandName -> pluginName
    private healthContributors: Map<string, PluginHealthContributor[]>; // pluginName -> contributors
    private context: PluginContext | null;
    private rawClient: Client | null;
    private componentStore: MemoryRuntimeComponentStateStore;
    private installationOps: DefaultInstallationRuntimeOperations;

    private soundboardQueues: Map<
        string,
        {
            queue: Array<{
                audioPath: string;
                title?: string;
                requesterId: string;
                resolve: () => void;
                reject: (err: unknown) => void;
            }>;
            processing: boolean;
            connection?: import('@discordjs/voice').VoiceConnection;
            timeout?: NodeJS.Timeout;
            textChannelId?: string;
            ownsConnection?: boolean; // Track if we created the connection or borrowed it from music queue
        }
    >;

    constructor() {
        this.plugins = new Map();
        this.pluginCommands = new Map();
        this.pluginIntervals = new Map();
        this.pluginRouters = new Map();
        this.pluginDisposalHandles = new Map();
        this.coreCommands = new Set();
        this.registeredCommands = new Map();
        this.healthContributors = new Map();
        this.soundboardQueues = new Map();
        this.context = null;
        this.rawClient = null;
        this.componentStore = new MemoryRuntimeComponentStateStore();
        this.installationOps = new DefaultInstallationRuntimeOperations();
    }

    /**
     * Handle incoming dynamic routed requests (O(1) lookup by plugin ID)
     */
    async handleDynamicRoute(
        pluginId: string,
        method: string,
        pathStr: string,
        req: unknown,
        reply: unknown,
    ): Promise<boolean> {
        const router = this.pluginRouters.get(pluginId);
        if (router) {
            return await router.handle(method, pathStr, req as RequestLike, reply as ReplyLike);
        }
        return false;
    }

    /**
     * Process the soundboard queue for a specific voice channel
     */
    private async processSoundboardQueue(voiceChannelId: string, guildId: string) {
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
                        queueData.connection.state.status !== VoiceConnectionStatus.Destroyed
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
            let player: import('@discordjs/voice').AudioPlayer;
            let connection: import('@discordjs/voice').VoiceConnection;

            if (existingQueue) {
                // Use existing connection (borrowed from music queue)
                connection = existingQueue.connection;
                queueData.connection = connection;
                queueData.ownsConnection = false; // We're borrowing this connection

                // Pause main player
                const wasPlaying = existingQueue.player.state.status === AudioPlayerStatus.Playing;
                if (wasPlaying) existingQueue.player.pause();

                // Create temp player
                player = createAudioPlayer({
                    behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
                });
                connection.subscribe(player);

                logger.info(`[plugins] Playing soundboard clip over music in ${voiceChannelId}`);

                // Play
                const resource = createAudioResource(fs.createReadStream(audioPath), {
                    inputType: StreamType.Arbitrary,
                });
                player.play(resource);

                await new Promise<void>((res, rej) => {
                    player.once('idle', () => {
                        connection.subscribe(existingQueue.player);
                        if (wasPlaying) existingQueue.player.unpause();
                        player.stop();
                        res();
                    });
                    player.once('error', (err) => {
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
                    if (!worker) throw new Error('No workers available');

                    const channel = await worker.client.channels.fetch(voiceChannelId);
                    if (!channel || !channel.isVoiceBased())
                        throw new Error('Invalid voice channel');

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
                                    'send' in textChannel
                                ) {
                                    const message = getEntryMessage(worker.name);
                                    await textChannel.send(message);
                                }
                            } catch (err) {
                                logger.warn(`[plugins] Failed to send welcome message: ${err}`);
                            }
                        }
                    } catch (error) {
                        logger.error(`[plugins] Connection failed to become ready: ${error}`);
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
                    player.once('idle', () => {
                        player.stop();
                        res();
                    });
                    player.once('error', (err) => {
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
        this.rawClient = client;

        // Capture core commands so no plugin can overwrite them (HJ-OSS-10)
        if (client && client.commands) {
            this.coreCommands = new Set(Array.from(client.commands.keys()));
        }

        const safeClient = createSafeClientFacade(client, 'core');

        this.context = {
            client: safeClient,
            rawClient: client,
            workers: this.getPublicWorkers(),
            server: server as unknown as IPluginRouter,
            registerCommand: (command: SlashCommandDefinition) => {
                if (this.coreCommands.has(command.data.name)) {
                    throw new Error(
                        `[plugins] Command collision rejected: Command '/${command.data.name}' collides with a core command and cannot be overwritten.`,
                    );
                }
                client.commands.set(command.data.name, command as unknown as Command);
                return {
                    dispose: () => {
                        client.commands.delete(command.data.name);
                    },
                };
            },
            on: (hook, callback) => hookManager.register(hook, callback),
            db: {
                plugin: new ScopedPluginStore('unknown'),
                core: coreDataAccessor,
            },
            storage: new PluginStorage('core'),
            logger: {
                debug: (msg: string) => logger.debug(`[plugins] ${msg}`),
                info: (msg: string) => logger.info(`[plugins] ${msg}`),
                warn: (msg: string) => logger.warn(`[plugins] ${msg}`),
                error: (msg: string) => logger.error(`[plugins] ${msg}`),
            },
            playAudio: async (params) => {
                const { voiceChannelId, guildId, audioPath, title, requesterId, channelId } =
                    params;

                if (!this.soundboardQueues.has(voiceChannelId)) {
                    this.soundboardQueues.set(voiceChannelId, {
                        queue: [],
                        processing: false,
                        textChannelId: channelId,
                    });
                } else if (channelId) {
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
            audio: new PluginAudioService('core'),
            scheduleTask: (intervalMs, task) => {
                if (intervalMs <= 0) {
                    throw new Error('Interval must be positive');
                }
                const interval = setInterval(async () => {
                    try {
                        await task();
                    } catch (error) {
                        logger.error(`[plugins:core] Scheduled task failed: ${error}`);
                    }
                }, intervalMs);
                return {
                    dispose: () => clearInterval(interval),
                };
            },
            hasCapability: () => true,
        };
        logger.info('[plugins] PluginManager initialized');
    }

    /**
     * Build token-free public worker states for plugins
     */
    private getPublicWorkers(): WorkerPublicState[] {
        return workerPool.getWorkers().map((w) => ({
            name: w.name,
            role: w.role,
            isReady: Boolean(w.client?.isReady?.()),
            busy: w.busy,
            guildId: w.guildId,
            voiceChannelId: w.voiceChannelId,
        }));
    }

    /**
     * Get all registered plugins with their metadata
     */
    getPlugins() {
        return this.plugins;
    }

    /**
     * Get core command names that are protected against collision
     */
    getCoreCommands(): Set<string> {
        return new Set(this.coreCommands);
    }

    /**
     * Load all plugins from the plugins directory
     */
    async loadPlugins(): Promise<void> {
        if (!this.context) {
            logger.error('[plugins] Cannot load plugins: Manager not initialized');
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

        const entries = await fs.promises.readdir(PLUGINS_DIR, {
            withFileTypes: true,
        });

        // 0. Startup Validation: Catch DB vs Filesystem Mismatches
        const dbPlugins = await this.context.db.core.getAllPluginMeta();
        const validPluginDirs = new Set(
            entries
                .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
                .map((entry) => path.join(PLUGINS_DIR, entry.name, 'jasper-plugin.json'))
                .filter((p) => fs.existsSync(p))
                .map((p) => {
                    try {
                        return JSON.parse(fs.readFileSync(p, 'utf-8')).id;
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean),
        );

        for (const dbPlugin of dbPlugins) {
            if (!validPluginDirs.has(dbPlugin.pluginId)) {
                logger.warn(
                    `[plugins] Mismatch Detected: Plugin '${dbPlugin.pluginId}' is in the database but missing from the filesystem. Cleaning up database entry.`,
                );
                await db.deletePluginMeta(dbPlugin.pluginId);
            }
        }

        for (const entry of entries) {
            // Strict Mode: Only load directories or symlinks with jasper-plugin.json
            if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

            const pluginDir = path.join(PLUGINS_DIR, entry.name);
            const metadataPath = path.join(pluginDir, 'jasper-plugin.json');

            if (!fs.existsSync(metadataPath)) {
                logger.warn(
                    `[plugins] Skipping directory ${entry.name}: Missing jasper-plugin.json`,
                );
                continue;
            }

            try {
                const rawMetadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));
                const isStrict = RUNTIME_PROFILE === 'hosted';

                // 1. Validate Manifest Schema & Compatibility (HJ-OSS-10)
                const validation = validatePluginManifest(rawMetadata, CORE_VERSION, isStrict);
                if (!validation.valid || !validation.manifest) {
                    const err = `Invalid plugin manifest in ${entry.name}: ${validation.errors.join('; ')}`;
                    logger.error(`[plugins] ${err}`);
                    if (isStrict) {
                        throw new Error(err);
                    }
                    continue;
                }

                const metadata = validation.manifest;

                // 2. Check Enabled Status
                let isEnabled = await this.context.db.core.isPluginEnabled(metadata.id);

                if (isEnabled === null) {
                    const isProduction = process.env.NODE_ENV === 'production';
                    const isTestPlugin = TEST_PLUGINS.includes(metadata.id);

                    if (isProduction && isTestPlugin) {
                        isEnabled = false;
                        logger.info(
                            `[plugins] Auto-disabling test plugin in production: ${metadata.id}`,
                        );
                    } else {
                        isEnabled = true;
                    }

                    await this.context.db.core.setPluginEnabled(metadata.id, isEnabled);
                }

                if (!isEnabled) {
                    logger.info(`[plugins] Skipping disabled plugin: ${metadata.id}`);
                    continue;
                }

                const entryFile = metadata.entry || 'index.js';
                const resolvedPluginDir = path.resolve(pluginDir);
                let pluginPath = path.resolve(pluginDir, entryFile);

                if (
                    !pluginPath.startsWith(resolvedPluginDir + path.sep) &&
                    pluginPath !== resolvedPluginDir
                ) {
                    logger.error(
                        `[plugins] Directory traversal attempt detected in plugin ${entry.name}: ${entryFile}`,
                    );
                    continue;
                }

                if (!fs.existsSync(pluginPath)) {
                    if (entryFile.endsWith('.js')) {
                        const tsPath = pluginPath.replace(/\.js$/, '.ts');
                        if (fs.existsSync(tsPath)) {
                            pluginPath = tsPath;
                        }
                    } else if (entryFile.endsWith('.ts')) {
                        const jsPath = pluginPath.replace(/\.ts$/, '.js');
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

                const fileUrl = pathToFileURL(pluginPath).href;
                const pluginModule = await import(fileUrl);
                const plugin: Plugin = pluginModule.default;

                if (!plugin || !plugin.name || !plugin.onLoad) {
                    logger.warn(`[plugins] Plugin ${entry.name} is missing required exports.`);
                    continue;
                }

                if (plugin.name !== metadata.name && plugin.name !== metadata.id) {
                    logger.warn(
                        `[plugins] Plugin name mismatch: ${plugin.name} (code) vs ${metadata.name} (json)`,
                    );
                }

                await this.registerPlugin(plugin, metadata, pluginDir);
            } catch (error) {
                logger.error(
                    `[plugins] Failed to load plugin ${entry.name}: ${error instanceof Error ? error.message : String(error)}`,
                );
                if (RUNTIME_PROFILE === 'hosted') {
                    throw error;
                }
            }
        }
    }

    /**
     * Register and load a single plugin
     */
    async registerPlugin(
        plugin: Plugin,
        metadata: PluginManifest,
        pluginDir: string,
    ): Promise<void> {
        if (this.plugins.has(plugin.name)) {
            logger.warn(`[plugins] Plugin ${plugin.name} is already registered.`);
            return;
        }

        // Validate manifest schema
        const isStrict = RUNTIME_PROFILE === 'hosted';
        const validation = validatePluginManifest(metadata, CORE_VERSION, isStrict);
        if (!validation.valid || !validation.manifest) {
            throw new Error(
                `Plugin '${plugin.name}' manifest validation failed: ${validation.errors.join('; ')}`,
            );
        }

        try {
            logger.info(`[plugins] Loading plugin: ${plugin.name} v${plugin.version}`);

            // Initialize command tracking and disposal handles for this plugin
            this.pluginCommands.set(plugin.name, []);
            this.pluginDisposalHandles.set(plugin.name, []);

            const disposalList = this.pluginDisposalHandles.get(plugin.name)!;
            const router = new DynamicPluginRouter(metadata.id);

            // Capability helper
            const checkCapability = (cap: PluginCapability): boolean => {
                return isCapabilityDeclared(metadata, cap);
            };

            const assertCapability = (cap: PluginCapability): void => {
                if (!checkCapability(cap)) {
                    throw new Error(
                        `[plugins:${metadata.id}] Capability denied: Plugin does not declare capability '${cap}' in its manifest.`,
                    );
                }
            };

            // Wrapped router to enforce capability and track route disposal
            const originalRegisterRoute = router.registerRoute.bind(router);
            router.registerRoute = <TReq = unknown, TRes = unknown>(
                definition: PluginRouteDefinition<TReq, TRes>,
            ): DisposalHandle => {
                assertCapability('routes:register');
                const handle = originalRegisterRoute(definition);
                disposalList.push(handle);
                return handle;
            };

            // Wrap Discord Client with token-free SafeClientFacade
            const safeClient = createSafeClientFacade(
                this.rawClient || (this.context?.client as unknown as Client),
                metadata.id,
            );

            // Create a scoped context specific to this plugin
            const pluginContext: PluginContext = {
                client: safeClient,
                rawClient: this.rawClient ?? undefined,
                workers: this.getPublicWorkers(),
                server: router,
                manifest: Object.freeze({ ...metadata }),
                db: {
                    plugin: new ScopedPluginStore(metadata.id),
                    core: coreDataAccessor,
                },
                storage: new PluginStorage(metadata.id),
                audio: new PluginAudioService(metadata.id),
                logger: {
                    debug: (msg: string) => logger.debug(`[${metadata.id}] ${msg}`),
                    info: (msg: string) => logger.info(`[${metadata.id}] ${msg}`),
                    warn: (msg: string) => logger.warn(`[${metadata.id}] ${msg}`),
                    error: (msg: string) => logger.error(`[${metadata.id}] ${msg}`),
                },
                hasCapability: (cap: PluginCapability) => checkCapability(cap),

                // Register slash command with collision prevention & disposal handle (HJ-OSS-10)
                registerCommand: (command: SlashCommandDefinition): DisposalHandle => {
                    assertCapability('commands:register');

                    const cmdName = command.data?.name;
                    if (!cmdName) {
                        throw new Error(`[plugins:${metadata.id}] Command data name is required`);
                    }

                    // 1. Prevent collision with core commands
                    if (this.coreCommands.has(cmdName)) {
                        throw new Error(
                            `[plugins:${metadata.id}] Command collision rejected: Command '/${cmdName}' collides with a core bot command and cannot be overwritten.`,
                        );
                    }

                    // 2. Prevent collision with other plugins
                    const existingOwner = this.registeredCommands.get(cmdName);
                    if (existingOwner && existingOwner !== plugin.name) {
                        throw new Error(
                            `[plugins:${metadata.id}] Command collision rejected: Command '/${cmdName}' is already registered by plugin '${existingOwner}'.`,
                        );
                    }

                    const discordClient =
                        this.rawClient || (this.context?.client as unknown as Client);
                    if (discordClient?.commands) {
                        discordClient.commands.set(cmdName, command as unknown as Command);
                    }

                    this.registeredCommands.set(cmdName, plugin.name);
                    const commands = this.pluginCommands.get(plugin.name) || [];
                    if (!commands.includes(cmdName)) {
                        commands.push(cmdName);
                        this.pluginCommands.set(plugin.name, commands);
                    }

                    const handle: DisposalHandle = {
                        dispose: () => {
                            if (discordClient?.commands) {
                                discordClient.commands.delete(cmdName);
                            }
                            this.registeredCommands.delete(cmdName);
                            const updated = (this.pluginCommands.get(plugin.name) || []).filter(
                                (c) => c !== cmdName,
                            );
                            this.pluginCommands.set(plugin.name, updated);
                            logger.debug(`[plugins:${metadata.id}] Disposed command '/${cmdName}'`);
                        },
                    };

                    disposalList.push(handle);
                    return handle;
                },

                // Hook registration with capability check & disposal handle (HJ-OSS-10)
                on: (hook, callback): DisposalHandle => {
                    assertCapability('hooks:subscribe');
                    const handle = hookManager.register(hook, callback);
                    disposalList.push(handle);
                    return handle;
                },

                // Schedule background tasks with capability check & disposal handle (HJ-OSS-10)
                scheduleTask: (intervalMs, task): DisposalHandle => {
                    assertCapability('tasks:schedule');
                    if (intervalMs <= 0) {
                        throw new Error('Interval must be positive');
                    }

                    const interval = setInterval(async () => {
                        try {
                            await task();
                        } catch (error) {
                            logger.error(`[plugin:${metadata.id}] Scheduled task failed: ${error}`);
                        }
                    }, intervalMs);

                    if (!this.pluginIntervals.has(plugin.name)) {
                        this.pluginIntervals.set(plugin.name, new Set());
                    }
                    this.pluginIntervals.get(plugin.name)!.add(interval);

                    const handle: DisposalHandle = {
                        dispose: () => {
                            clearInterval(interval);
                            this.pluginIntervals.get(plugin.name)?.delete(interval);
                            logger.debug(`[plugin:${metadata.id}] Disposed scheduled task`);
                        },
                    };

                    disposalList.push(handle);
                    logger.debug(
                        `[plugin:${metadata.id}] Scheduled task with interval ${intervalMs}ms`,
                    );
                    return handle;
                },

                // Audio playback with capability check (HJ-OSS-10)
                playAudio: async (params) => {
                    assertCapability('audio:play');
                    const { voiceChannelId, guildId, audioPath, title, requesterId, channelId } =
                        params;

                    if (!this.soundboardQueues.has(voiceChannelId)) {
                        this.soundboardQueues.set(voiceChannelId, {
                            queue: [],
                            processing: false,
                            textChannelId: channelId,
                        });
                    } else if (channelId) {
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

                // Health contributor registration (HJ-OSS-10)
                registerHealthContributor: (
                    contributor: PluginHealthContributor,
                ): DisposalHandle => {
                    if (!this.healthContributors.has(plugin.name)) {
                        this.healthContributors.set(plugin.name, []);
                    }
                    this.healthContributors.get(plugin.name)!.push(contributor);

                    const handle: DisposalHandle = {
                        dispose: () => {
                            const list = this.healthContributors.get(plugin.name);
                            if (list) {
                                const idx = list.indexOf(contributor);
                                if (idx !== -1) list.splice(idx, 1);
                            }
                        },
                    };
                    disposalList.push(handle);
                    return handle;
                },
            };

            // Optional narrow hosted capabilities
            if (checkCapability('component:state')) {
                pluginContext.componentState = this.componentStore;
            }
            if (checkCapability('installation:runtime')) {
                pluginContext.installationOperations = this.installationOps;
            }

            await plugin.onLoad(pluginContext);

            // Automatically register any declarative commands provided by the plugin
            // that were NOT already registered during onLoad
            if (Array.isArray(plugin.commands)) {
                const registeredCommands = this.pluginCommands.get(plugin.name) || [];
                for (const cmd of plugin.commands) {
                    const cmdName = cmd.data?.name;
                    if (
                        cmdName &&
                        !registeredCommands.includes(cmdName) &&
                        typeof cmd.execute === 'function'
                    ) {
                        pluginContext.registerCommand(cmd);
                    }
                }
            }
            this.plugins.set(plugin.name, {
                plugin,
                context: pluginContext,
                metadata,
                pluginDir,
                router,
            });
            this.pluginRouters.set(metadata.id, router);
            logger.info(`[plugins] Successfully loaded ${plugin.name}`);
        } catch (error) {
            // Roll back any commands registered before or during failure
            const commands = this.pluginCommands.get(plugin.name) || [];
            if (commands.length > 0) {
                logger.warn(
                    `[plugins] Rolling back commands for failed plugin ${plugin.name}: ${commands.join(', ')}`,
                );
                const client = this.rawClient || (this.context?.client as unknown as Client);
                for (const cmdName of commands) {
                    if (client?.commands) {
                        client.commands.delete(cmdName);
                    }
                    this.registeredCommands.delete(cmdName);
                }
            }
            this.pluginCommands.delete(plugin.name);

            // Clean up any intervals registered before or during failure
            const intervals = this.pluginIntervals.get(plugin.name);
            if (intervals) {
                for (const interval of intervals) {
                    clearInterval(interval);
                }
                this.pluginIntervals.delete(plugin.name);
            }

            logger.error(
                `[plugins] Failed to initialize plugin ${plugin.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
            // Cleanup partial registrations if load failed
            await this.unloadPlugin(plugin.name);
            throw error;
        }
    }

    /**
     * Unload a plugin deterministically (HJ-OSS-10).
     * Deactivates all routes, unregisters commands, clears intervals, disposes hooks,
     * and ensures no stale handlers can execute.
     */
    async unloadPlugin(name: string): Promise<void> {
        const entry = this.plugins.get(name);

        try {
            if (entry) {
                try {
                    await entry.plugin.onUnload(entry.context);
                } catch (e) {
                    logger.error(
                        `[plugins] Error in onUnload for ${name}: ${e instanceof Error ? e.message : String(e)}`,
                    );
                }

                // 1. Deactivate router so all routes reject immediately
                entry.router.deactivate();

                // 2. Remove router from active routing map
                if (entry.metadata?.id) {
                    this.pluginRouters.delete(entry.metadata.id);
                }
            }

            // 3. Dispose all tracked handles (hooks, tasks, commands, health)
            const handles = this.pluginDisposalHandles.get(name) || [];
            for (const handle of handles) {
                try {
                    await handle.dispose();
                } catch (e) {
                    logger.warn(`[plugins] Error disposing handle for ${name}: ${e}`);
                }
            }
            this.pluginDisposalHandles.delete(name);

            // 4. Fallback cleanup: ensure commands are removed from client
            const commands = this.pluginCommands.get(name) || [];
            const discordClient = this.rawClient || (this.context?.client as unknown as Client);
            if (commands.length > 0 && discordClient?.commands) {
                logger.info(`[plugins] Unregistering commands for ${name}: ${commands.join(', ')}`);
                for (const cmdName of commands) {
                    discordClient.commands.delete(cmdName);
                    this.registeredCommands.delete(cmdName);
                }
            }
            this.pluginCommands.delete(name);

            // 5. Clear intervals
            const intervals = this.pluginIntervals.get(name);
            if (intervals) {
                logger.info(`[plugins] Clearing ${intervals.size} scheduled tasks for ${name}`);
                for (const interval of intervals) {
                    clearInterval(interval);
                }
                this.pluginIntervals.delete(name);
            }

            // 6. Clear health contributors
            this.healthContributors.delete(name);

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
            return { success: false, message: 'Plugin manager not initialized' };
        }

        try {
            await this.context.db.core.setPluginEnabled(pluginId, enabled);

            if (enabled) {
                const entries = await fs.promises.readdir(PLUGINS_DIR, {
                    withFileTypes: true,
                });
                let found = false;

                for (const entry of entries) {
                    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

                    const pluginDir = path.join(PLUGINS_DIR, entry.name);
                    const metadataPath = path.join(pluginDir, 'jasper-plugin.json');

                    if (!fs.existsSync(metadataPath)) continue;

                    const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));
                    if (metadata.id === pluginId) {
                        const entryFile = metadata.entry || 'index.js';
                        const resolvedPluginDir = path.resolve(pluginDir);
                        let pluginPath = path.resolve(pluginDir, entryFile);

                        if (
                            !pluginPath.startsWith(resolvedPluginDir + path.sep) &&
                            pluginPath !== resolvedPluginDir
                        ) {
                            return { success: false, message: 'Invalid plugin entry path' };
                        }

                        if (!fs.existsSync(pluginPath)) {
                            if (entryFile.endsWith('.js')) {
                                const tsPath = pluginPath.replace(/\.js$/, '.ts');
                                if (fs.existsSync(tsPath)) pluginPath = tsPath;
                            } else if (entryFile.endsWith('.ts')) {
                                const jsPath = pluginPath.replace(/\.ts$/, '.js');
                                if (fs.existsSync(jsPath)) pluginPath = jsPath;
                            }
                        }

                        if (!fs.existsSync(pluginPath)) {
                            return { success: false, message: 'Plugin entry file not found' };
                        }

                        const fileUrl = pathToFileURL(pluginPath).href;
                        const pluginModule = await import(`${fileUrl}?t=${Date.now()}`);
                        const plugin: Plugin = pluginModule.default;

                        await this.registerPlugin(plugin, metadata, pluginDir);
                        found = true;

                        await this.deployCommands();
                        break;
                    }
                }

                if (!found) return { success: false, message: 'Plugin not found on disk' };
            } else {
                let pluginName = '';
                for (const [name, data] of this.plugins.entries()) {
                    if (data.metadata.id === pluginId) {
                        pluginName = name;
                        break;
                    }
                }

                if (pluginName) {
                    await this.unloadPlugin(pluginName);
                    await this.deployCommands();
                } else {
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
     */
    async deployCommands(): Promise<void> {
        const discordClient = this.rawClient || (this.context?.client as unknown as Client);
        if (!discordClient || !DISCORD_CLIENT_ID || !GUILD_ID) {
            logger.warn(
                '[plugins] Skipping command deployment: Missing client context or Discord credentials',
            );
            return;
        }

        try {
            logger.info('[plugins] Deploying commands to Discord...');
            const commandsData = discordClient.commands.map((cmd: Command) => {
                return typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data;
            });

            const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

            await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, GUILD_ID), {
                body: commandsData,
            });
            logger.info(`[plugins] Successfully deployed ${commandsData.length} commands.`);
        } catch (error) {
            logger.error(`[plugins] Failed to deploy commands: ${error}`);
        }
    }

    /**
     * Get aggregate health status for a registered plugin
     */
    async getPluginHealth(name: string): Promise<PluginHealthStatus> {
        const contributors = this.healthContributors.get(name);
        if (!contributors || contributors.length === 0) {
            return { status: 'healthy' };
        }

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        const details: Record<string, unknown> = {};

        for (let i = 0; i < contributors.length; i++) {
            try {
                const res = await contributors[i]();
                details[`contributor_${i}`] = res;
                if (res.status === 'unhealthy') {
                    overallStatus = 'unhealthy';
                } else if (res.status === 'degraded' && overallStatus !== 'unhealthy') {
                    overallStatus = 'degraded';
                }
            } catch (err) {
                details[`contributor_${i}`] = {
                    status: 'unhealthy',
                    error: err instanceof Error ? err.message : String(err),
                };
                overallStatus = 'unhealthy';
            }
        }

        return { status: overallStatus, details };
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

        if (fs.existsSync(PLUGINS_DIR)) {
            const entries = await fs.promises.readdir(PLUGINS_DIR, {
                withFileTypes: true,
            });

            for (const entry of entries) {
                if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

                try {
                    const metadataPath = path.join(PLUGINS_DIR, entry.name, 'jasper-plugin.json');
                    if (!fs.existsSync(metadataPath)) continue;

                    const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));

                    let enabled = false;
                    if (dbEnabledMap.has(metadata.id)) {
                        enabled = dbEnabledMap.get(metadata.id)!;
                    } else {
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
                    logger.warn(`[plugins] Failed to read metadata for ${entry.name}: ${e}`);
                }
            }
        }

        return statusList;
    }
}

const pluginManager = new PluginManager();
export default pluginManager;
