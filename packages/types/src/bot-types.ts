import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Client,
    Message,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    SlashCommandBuilder,
    TextBasedChannel,
} from 'discord.js';

// --- Runtime Profile & Identity Types ---

export type RuntimeProfile = 'self-hosted' | 'hosted';

/** Safe public identity metadata (never carries credentials) */
export interface BotIdentityInfo {
    name: string;
    role: 'controller' | 'worker';
}

/** Internal bot identity credentials used during startup login */
export interface BotCredentials extends BotIdentityInfo {
    token: string;
}

/** @deprecated Use BotCredentials for internal config or BotIdentityInfo for public metadata */
export type BotIdentityConfig = BotCredentials;

// --- Guild Installation & Access Policy Types ---

export type InstallationState = 'provisioning' | 'active' | 'degraded' | 'suspended' | 'deleting';

export interface GuildInstallationContext {
    guildId: string;
    installationId: string;
    state: InstallationState;
    admissionRevision: number;
    admissionExpiresAt?: Date;
    configRevision: number;
    enabledWorkerIds: ReadonlySet<string>;
    enabledPluginIds: ReadonlySet<string>;
    jasperWeight: number;
}

export interface GuildScope {
    guildId: string;
    installationId: string;
}

export interface GuildAccessPolicy {
    resolve(guildId: string): Promise<GuildInstallationContext | null>;
    mayStartWork(context: GuildInstallationContext): boolean;
}

// --- Capability Decision Port & Types (HJ-OSS-17) ---

export interface CapabilityContext {
    guildId: string;
    installationId?: string;
    installation?: GuildInstallationContext;
    userId?: string;
    metadata?: Record<string, unknown>;
}

export interface CapabilityDecision {
    allowed: boolean;
    reason?: string;
    validUntil?: Date;
}

export type CapabilityDecisionResult = CapabilityDecision;

export interface CapabilityDecisionPort {
    decide(
        context: CapabilityContext | GuildInstallationContext,
        capabilityId: string,
    ): Promise<CapabilityDecision>;
}

// --- Plugin Audio Enqueue Service Types (HJ-OSS-13) ---

export interface EnqueueAudioTrack {
    title: string;
    url: string;
    durationInSec?: number;
    thumbnail?: string;
    sourceType?: 'youtube' | 'attachment' | 'direct';
    gain?: number;
    initialSeek?: number;
    requestedBy?: string;
    requesterId?: string;
}

export interface EnqueueAudioOptions {
    loopTrack?: boolean;
    loopQueue?: boolean;
    shuffle?: boolean;
    gain?: number;
    installationId?: string;
}

export interface AudioSeekResult {
    success: boolean;
    position: number;
    track?: Song | null;
}

export interface PluginAudioEnqueueService {
    /**
     * Enqueue one or more audio tracks into active or new voice queue.
     * Supports Discord interaction context for auto-replying/deferring.
     */
    enqueue(
        interaction: ChatInputCommandInteraction,
        tracks: EnqueueAudioTrack[],
        sourceName?: string,
        options?: EnqueueAudioOptions,
    ): Promise<void>;

    /**
     * Alias for enqueue to support legacy / convenience usage.
     */
    enqueueSongs(
        interaction: ChatInputCommandInteraction,
        tracks: EnqueueAudioTrack[],
        sourceName?: string,
        options?: EnqueueAudioOptions,
    ): Promise<void>;

    /**
     * Seek current playback position.
     * When given an interaction, validates voice channel and replies to user.
     * When given voiceChannelId and position, performs programmatic seek.
     */
    seek(interaction: ChatInputCommandInteraction): Promise<void>;
    seek(voiceChannelId: string, position: number | string): Promise<AudioSeekResult>;
    seek(
        target: ChatInputCommandInteraction | string,
        position?: number | string,
    ): Promise<AudioSeekResult | void>;

    /**
     * Get active queue for voice channel.
     */
    getQueue(voiceChannelId: string): Queue | undefined;
}

// --- Worker Pool & Voice Lease Types ---

export type VoiceLeaseState = 'acquiring' | 'active' | 'retained' | 'releasing';

export interface VoiceLease {
    state: VoiceLeaseState;
    installationId: string;
    guildId: string;
    workerId: string;
    voiceChannelId: string;
    queueId?: string;
    generation: number;
    acquiredAt: Date;
    lastActivityAt: Date;
}

export interface WorkerState {
    name: string;
    client: Client;
    role: 'controller' | 'worker';
    leases: Map<string, VoiceLease>;
    busy: boolean;
    guildId: string | null;
    voiceChannelId: string | null;
}

// --- Queue Manager Types ---

export interface Song {
    title: string;
    url: string;
    durationInSec: number;
    requestedBy: string;
    requesterId?: string;
    thumbnail?: string;
    fromCache?: boolean;
    startTime?: number;
    sourceType?: 'youtube' | 'attachment' | 'direct';
    gain?: number;
    initialSeek?: number;
}

export interface Queue {
    voiceChannelId: string;
    guildId: string;
    textChannel: TextBasedChannel | null;
    connection: VoiceConnection;
    player: AudioPlayer;
    songs: Song[];
    nowPlaying: Song | null;
    autoplay: boolean;
    worker: WorkerState;
    idleTimeout: NodeJS.Timeout | null;
    stopping: boolean;
    playingMessage?: Message;
    isAutoPaused?: boolean;
    isRadio?: boolean;
    streamProcess?: import('child_process').ChildProcess | null;
    loopTrack?: boolean;
    loopQueue?: boolean;
    skipping?: boolean;
    gain?: number;
    seeking?: boolean;
}

// --- Database Types (Shared) ---

export interface SongStats {
    songTitle: string;
    songUrl: string;
    playCount: number;
    totalDuration: number;
    lastPlayedAt: Date;
    thumbnail?: string;
}

export interface UserStats {
    userId: string;
    playCount: number;
    totalDuration: number;
    lastPlayedAt: Date;
}

export interface Command {
    data: SlashCommandBuilder | { toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody };
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

// --- Storage Interfaces (Installation-Scoped & Shared) ---

export interface StoredAsset {
    key: string;
    size: number;
    mimeType: string;
    updatedAt: Date;
    metadata?: Record<string, string>;
}

export interface AssetPutOptions {
    mimeType?: string;
    metadata?: Record<string, string>;
}

export interface TenantAssetStore {
    put(
        installationId: string,
        path: string,
        data: Buffer | Uint8Array | NodeJS.ReadableStream,
        options?: AssetPutOptions,
    ): Promise<StoredAsset>;
    get(installationId: string, path: string): Promise<Buffer | null>;
    getStream(installationId: string, path: string): Promise<NodeJS.ReadableStream | null>;
    delete(installationId: string, path: string): Promise<boolean>;
    list(installationId: string, prefix?: string): Promise<StoredAsset[]>;
    stat(installationId: string, path: string): Promise<StoredAsset | null>;
    resolve(installationId: string, path: string): { fsPath?: string; uri: string };
}

export interface PluginAssetStore {
    put(
        pluginId: string,
        installationId: string,
        path: string,
        data: Buffer | Uint8Array | NodeJS.ReadableStream,
        options?: AssetPutOptions,
    ): Promise<StoredAsset>;
    get(pluginId: string, installationId: string, path: string): Promise<Buffer | null>;
    getStream(
        pluginId: string,
        installationId: string,
        path: string,
    ): Promise<NodeJS.ReadableStream | null>;
    delete(pluginId: string, installationId: string, path: string): Promise<boolean>;
    list(pluginId: string, installationId: string, prefix?: string): Promise<StoredAsset[]>;
    stat(pluginId: string, installationId: string, path: string): Promise<StoredAsset | null>;
    resolve(
        pluginId: string,
        installationId: string,
        path: string,
    ): { fsPath?: string; uri: string };
}

export interface SharedMediaCache {
    put(
        cacheKey: string,
        data: Buffer | Uint8Array | NodeJS.ReadableStream,
        options?: AssetPutOptions,
    ): Promise<StoredAsset>;
    get(cacheKey: string): Promise<Buffer | null>;
    getStream(cacheKey: string): Promise<NodeJS.ReadableStream | null>;
    delete(cacheKey: string): Promise<boolean>;
    has(cacheKey: string): Promise<boolean>;
    stat(cacheKey: string): Promise<StoredAsset | null>;
    prune(olderThan: Date): Promise<number>;
}

export interface StorageProvider {
    readonly tenantAssets: TenantAssetStore;
    readonly pluginAssets: PluginAssetStore;
    readonly sharedCache: SharedMediaCache;
}

// --- Command Publisher Types (HJ-OSS-06) ---

export type CommandPublishStrategy = 'dry-run' | 'guild' | 'global';

export interface CommandManifest {
    schemaVersion: string;
    environment: string;
    releaseVersion: string;
    generatedAt: string;
    strategy: CommandPublishStrategy;
    applicationId: string;
    guildId?: string;
    digest: string;
    commandCount: number;
    commands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
}

export interface PublishResult {
    success: boolean;
    manifest: CommandManifest;
    deployedCount: number;
    strategy: CommandPublishStrategy;
    target: 'global' | `guild:${string}` | 'dry-run';
    error?: string;
}
