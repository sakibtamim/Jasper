import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import { WorkerState } from "../worker-pool.js";
import { Queue, Song } from "../audio/queue-manager.js";
import { SongStats, UserStats } from "../db/types.js";

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
    | 'SERVER_READY';     // Fired when web server is ready

// Generic Hook Callback
export type HookCallback<T = any> = (data: T) => void | Promise<void>;

// --- Database Interfaces (Phase 2 Placeholder) ---

export interface PluginStore {
    get(key: string): Promise<any | null>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export interface CoreDataAccessor {
    getTopSongs(limit?: number): Promise<SongStats[]>;
    getTopUsers(limit?: number): Promise<UserStats[]>;
    getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }>;
}

// --- Plugin Context ---

export interface PluginContext {
    client: Client; // Controller client
    workers: WorkerState[]; // Access to worker pool
    server: FastifyInstance; // Access to web server

    // Helper to register commands dynamically
    registerCommand: (command: any) => void;

    // Hook System
    on: <T>(hook: HookName, callback: HookCallback<T>) => void;

    // Database Access (Phase 2)
    db: {
        plugin: PluginStore; // RW access to plugin's own data
        core: CoreDataAccessor; // RO access to core data
    };
}

// --- Plugin Definition ---

export interface Plugin {
    name: string;
    version: string;
    description?: string;
    onLoad: (context: PluginContext) => Promise<void>;
    onUnload: (context: PluginContext) => Promise<void>;
}
