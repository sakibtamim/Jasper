import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import { WorkerState, Queue, Song, SongStats, UserStats } from "./bot-types.js";

// --- Hook Data Types ---

export interface QueueCreateData {
    queue: Queue;
    worker: WorkerState;
}

export interface SongPlayData {
    queue: Queue;
    song: Song;
}

export type HookName =
    | 'QUEUE_CREATE'      // Fired when a bot joins a channel and creates a queue
    | 'PRE_MUSIC_PLAY'    // Fired before a song starts playing
    | 'POST_MUSIC_PLAY'   // Fired after a song starts playing
    | 'MUSIC_QUEUE_ADD'   // Fired when a song is added to queue
    | 'SERVER_READY'      // Fired when web server is ready
    | 'WORKER_ASSIGNED'   // Fired when a worker is assigned to a guild
    | 'VOICE_STATE_UPDATE'; // Fired when a voice state changes

export interface ServerReadyData {
    server: FastifyInstance;
}

export interface WorkerAssignedData {
    worker: WorkerState;
    guildId: string;
    voiceChannelId: string;
}

export interface VoiceStateUpdateData {
    oldState: import("discord.js").VoiceState;
    newState: import("discord.js").VoiceState;
    client: Client;
}

// Generic Hook Callback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HookCallback<T = any> = (data: T) => void | Promise<void>;

// --- Database Interfaces ---

export interface IPluginStorage {
    save(filename: string, data: Buffer): Promise<string>;
    get(filename: string): Promise<Buffer>;
    delete(filename: string): Promise<void>;
    list(): Promise<string[]>;
    resolve(uri: string): { fsPath: string; webUrl: string };
}

export interface PluginStore {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(key: string): Promise<any | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export interface CoreDataAccessor {
    getTopSongs(limit?: number): Promise<SongStats[]>;
    getTopUsers(limit?: number): Promise<UserStats[]>;
    getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }>;

    // Plugin Meta (Read-only for plugins, but accessible to system)
    isPluginEnabled(pluginId: string): Promise<boolean | null>;
    setPluginEnabled(pluginId: string, enabled: boolean): Promise<void>;
    getAllPluginMeta(): Promise<Array<{ pluginId: string, enabled: boolean }>>;
}

export interface SlashCommandDefinition {
    data: {
        name: string;
        description: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options?: any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    };
    execute: (interaction: import("discord.js").ChatInputCommandInteraction) => void | Promise<void>;
}

// --- Plugin Context ---

export interface PluginContext {
    client: Client; // Controller client
    workers: WorkerState[]; // Access to worker pool
    server: FastifyInstance; // Access to web server

    // Scoped logger for the plugin
    logger: {
        debug: (msg: string) => void;
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error: (msg: string) => void;
    };

    // Database access
    db: {
        plugin: PluginStore; // RW access to plugin's own data
        core: CoreDataAccessor; // RO access to core data
    };

    // File Storage
    storage: IPluginStorage;

    // Hook subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on<T = any>(hook: HookName, handler: HookCallback<T>): void;

    // Command registration
    registerCommand(command: SlashCommandDefinition): void;

    // Audio playback (for plugins that need to play audio files)
    playAudio(params: {
        voiceChannelId: string;
        guildId: string;
        audioPath: string;  // Absolute path to audio file
        title?: string;     // Display name for the audio
        requesterId: string; // User who triggered this
    }): Promise<void>;
}

// --- Plugin Definition ---

export interface Plugin {
    name: string;
    version: string;
    description?: string;
    onLoad: (context: PluginContext) => Promise<void>;
    onUnload: (context: PluginContext) => Promise<void>;
}
