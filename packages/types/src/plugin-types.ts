import { Client, ClientUser } from 'discord.js';
import { FastifyInstance } from 'fastify';

import {
    AuthenticatedPrincipal,
    GuildScope,
    PluginAudioEnqueueService,
    PrincipalType,
    Queue,
    RuntimeIdentity,
    RuntimeProfile,
    Song,
    SongStats,
    UserStats,
    WorkerState,
} from './bot-types.js';

export const JASPER_PLUGIN_SDK_VERSION = '1.0.0';

// --- Capabilities ---

export type PluginCapability =
    | 'audio:play'
    | 'audio:enqueue'
    | 'storage:read'
    | 'storage:write'
    | 'routes:register'
    | 'commands:register'
    | 'installation:runtime'
    | 'component:state'
    | 'hooks:subscribe'
    | 'tasks:schedule'
    | string;

// --- Manifest Types ---

export interface PluginWebWidgetConfig {
    id: string;
    slot: string;
    component: string;
    order: number;
}

export interface PluginWebPageConfig {
    id: string;
    path: string;
    component: string;
    title: string;
}

export interface PluginWebNavItemConfig {
    id: string;
    label: string;
    icon: string;
    href: string;
}

export interface PluginWebConfig {
    entry: string;
    widgets?: PluginWebWidgetConfig[];
    pages?: PluginWebPageConfig[];
    navItems?: PluginWebNavItemConfig[];
}

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    sdkVersion?: string;
    jasperVersion?: string; // backwards compatibility alias for sdkVersion
    description?: string;
    entry?: string;
    capabilities?: PluginCapability[];
    runtimeProfiles?: ('self-hosted' | 'hosted')[];
    web?: PluginWebConfig;
}

// --- Disposal & Lifecycle Handle ---

export interface DisposalHandle {
    dispose: () => void | Promise<void>;
}

// --- Safe Discord Client Facade ---

export interface SafePluginClient {
    readonly user: ClientUser | null;
    readonly isReady: () => boolean;
    readonly options: {
        readonly intents: import('discord.js').BitFieldResolvable<
            import('discord.js').GatewayIntentsString,
            number
        >;
    };
    channels: {
        fetch: (
            id: string,
            options?: import('discord.js').BaseFetchOptions,
        ) => Promise<import('discord.js').Channel | null>;
    };
    guilds: {
        fetch: (
            id: string | import('discord.js').FetchGuildOptions,
        ) => Promise<import('discord.js').Guild | null>;
    };
    users: {
        fetch: (
            id: string,
            options?: import('discord.js').BaseFetchOptions,
        ) => Promise<import('discord.js').User | null>;
    };
    on(event: string, listener: (...args: any[]) => void): DisposalHandle | SafePluginClient;
    off(event: string, listener: (...args: any[]) => void): SafePluginClient;
    removeListener(event: string, listener: (...args: any[]) => void): SafePluginClient;
}

// --- Worker Public State (Token-Free) ---

export interface WorkerPublicState {
    name: string;
    role: 'controller' | 'worker';
    isReady: boolean;
    busy: boolean;
    guildId: string | null;
    voiceChannelId: string | null;
}

// --- Route Definition with Schema & Default-Deny ---

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ALL';

export interface PluginRequestContext {
    principal: AuthenticatedPrincipal;
    guild?: GuildScope;
    requestId: string;
}

export type PluginRouteAccess =
    | { kind: 'public' }
    | {
          kind: 'authorized';
          policyAction: string;
          requiredRole?: ('owner' | 'admin' | 'member')[];
          allowedPrincipals?: PrincipalType[];
      };

export interface JsonSchemaBundle {
    body?: Record<string, unknown>;
    querystring?: Record<string, unknown>;
    params?: Record<string, unknown>;
    response?: Record<number | string, Record<string, unknown>>;
}

export interface PluginRouteDefinition<TReq = unknown, TRes = unknown> {
    method: HttpMethod;
    path: string;
    access: PluginRouteAccess;
    guildRequired?: boolean;
    schema: JsonSchemaBundle;
    handler: (context: PluginRequestContext, request: TReq) => Promise<TRes> | TRes;
}

// --- Health Contributor ---

export interface PluginHealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: Record<string, unknown>;
}

export type PluginHealthContributor = () => Promise<PluginHealthStatus> | PluginHealthStatus;

// --- Installation Runtime Operations (MVP Design §5.5) ---

export interface ApplicationMembershipSnapshot {
    scope: GuildScope;
    applicationId: string;
    fenceEpoch: number;
    members: Array<{ userId: string; role: string }>;
    timestamp: Date;
}

export interface DrainResult {
    operationId: string;
    drainedQueues: number;
    releasedWorkers: number;
    completedAt: Date;
}

export interface InstallationRuntimeOperations {
    snapshot(scope: GuildScope): Promise<ApplicationMembershipSnapshot>;
    drain(scope: GuildScope, operationId: string): Promise<DrainResult>;
    leaveApplication(
        scope: GuildScope,
        applicationId: string,
        operationId: string,
        expectedFence: number,
    ): Promise<void>;
}

// --- Runtime Component State Store (MVP Design §5.5) ---

export interface VersionedValue {
    version: number;
    value: Uint8Array;
    updatedAt: Date;
}

export interface FencedObservation {
    componentId: string;
    bootId: string;
    sequence: number;
    epoch: number;
    eventType: string;
    payload: Record<string, unknown>;
    timestamp: Date;
    coalesceKey?: string;
    required?: boolean;
}

export interface RuntimeComponentStateStore {
    get(componentId: string, key: string): Promise<VersionedValue | null>;
    compareAndSet(
        componentId: string,
        key: string,
        expectedVersion: number | null,
        value: Uint8Array,
    ): Promise<VersionedValue>;
    appendObservation(record: FencedObservation): Promise<void>;
    claimUnacknowledged(
        componentId: string,
        claimant: RuntimeIdentity,
        limit: number,
        leaseMs: number,
    ): Promise<readonly FencedObservation[]>;
    acknowledgeObservation(
        recordBootId: string,
        throughSequence: number,
        claimant: RuntimeIdentity,
    ): Promise<void>;
}

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
    | 'QUEUE_CREATE' // Fired when a bot joins a channel and creates a queue
    | 'PRE_MUSIC_PLAY' // Fired before a song starts playing
    | 'POST_MUSIC_PLAY' // Fired after a song starts playing
    | 'MUSIC_QUEUE_ADD' // Fired when a song is added to queue
    | 'SERVER_READY' // Fired when web server is ready
    | 'WORKER_ASSIGNED' // Fired when a worker is assigned to a guild
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
    oldState: import('discord.js').VoiceState;
    newState: import('discord.js').VoiceState;
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
    forGuild?: (guildId: string) => IPluginStorage;
}

export interface PluginStore {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(key: string): Promise<any | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    forGuild?: (guildId: string) => PluginStore;
}

export interface CoreDataAccessor {
    getTopSongs(limit?: number): Promise<SongStats[]>;
    getTopUsers(limit?: number): Promise<UserStats[]>;
    getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }>;

    // Plugin Meta (Read-only for plugins, but accessible to system)
    isPluginEnabled(pluginId: string): Promise<boolean | null>;
    setPluginEnabled(pluginId: string, enabled: boolean): Promise<void>;
    getAllPluginMeta(): Promise<Array<{ pluginId: string; enabled: boolean }>>;
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
    execute: (
        interaction: import('discord.js').ChatInputCommandInteraction,
    ) => void | Promise<void>;
    autocomplete?: (
        interaction: import('discord.js').AutocompleteInteraction,
    ) => void | Promise<void>;
}

// --- Plugin Router Interface ---
// Plugins receive this instead of a raw FastifyInstance.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginRouteHandler = (req: any, reply: any) => Promise<any> | void;

export interface IPluginRouter {
    registerRoute<TReq = unknown, TRes = unknown>(
        definition: PluginRouteDefinition<TReq, TRes>,
    ): DisposalHandle;
    get(path: string, handler: PluginRouteHandler): IPluginRouter;
    post(path: string, handler: PluginRouteHandler): IPluginRouter;
    put(path: string, handler: PluginRouteHandler): IPluginRouter;
    delete(path: string, handler: PluginRouteHandler): IPluginRouter;
    patch(path: string, handler: PluginRouteHandler): IPluginRouter;
    options(path: string, handler: PluginRouteHandler): IPluginRouter;
    all(path: string, handler: PluginRouteHandler): IPluginRouter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register(pluginFn: any, opts?: any): Promise<void>;
    deactivate(): void;
    isActive(): boolean;
}

// --- Plugin Context ---

export interface PluginContext {
    client: SafePluginClient; // Safe facade over Discord client (no raw token)
    rawClient?: Client; // Internal/self-hosted fallback
    workers: WorkerPublicState[]; // Token-free worker public state
    server: IPluginRouter; // Scoped plugin router (subset of Fastify)
    manifest?: Readonly<PluginManifest>;

    // Scoped logger for the plugin
    logger: {
        debug: (msg: string) => void;
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error: (msg: string) => void;
    };

    // Database access
    db: {
        plugin: PluginStore & { forGuild: (guildId: string) => PluginStore };
        core: CoreDataAccessor;
    };

    // File Storage
    storage: IPluginStorage & { forGuild: (guildId: string) => IPluginStorage };

    // Hook subscription returning DisposalHandle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on<T = any>(hook: HookName, handler: HookCallback<T>): DisposalHandle;

    // Command registration returning DisposalHandle
    registerCommand(command: SlashCommandDefinition): DisposalHandle;

    // Audio playback (for plugins that need to play audio files)
    playAudio(params: {
        voiceChannelId: string;
        guildId: string;
        audioPath: string; // Absolute path to audio file
        title?: string; // Display name for the audio
        requesterId: string; // User who triggered this
        channelId?: string; // Text channel to send messages to
    }): Promise<void>;

    // Stable Audio Enqueue & Seek Service (HJ-OSS-13)
    audio: PluginAudioEnqueueService;

    // Schedule background tasks (automatically cleaned up on unload) returning DisposalHandle
    scheduleTask(intervalMs: number, task: () => void | Promise<void>): DisposalHandle;

    // Health reporting
    registerHealthContributor?: (contributor: PluginHealthContributor) => DisposalHandle;

    // Narrow hosted adapter operations
    installationOperations?: InstallationRuntimeOperations;
    componentState?: RuntimeComponentStateStore;

    // Capability verification
    hasCapability?: (capability: PluginCapability) => boolean;
}

// --- Plugin Definition ---

export interface Plugin {
    name: string;
    version: string;
    description?: string;
    commands?: SlashCommandDefinition[];
    onLoad: (context: PluginContext) => Promise<void>;
    onUnload: (context: PluginContext) => Promise<void>;
}

// --- Deterministic Artifacts & Trust Policy (HJ-OSS-12) ---

export interface PluginArtifactFileEntry {
    path: string;
    sha256: string;
    size: number;
}

export interface PluginArtifactManifest {
    id: string;
    name: string;
    version: string;
    sdkVersion: string;
    entry: string;
    capabilities: PluginCapability[];
    archiveSha256: string;
    files: PluginArtifactFileEntry[];
    createdAt: string;
    signer?: string;
    signature?: string;
    web?: PluginWebConfig;
    sbom?: {
        format: string;
        dependencies?: Record<string, string>;
    };
}

export interface PluginPackageResult {
    pluginId: string;
    version: string;
    archiveBuffer: Buffer;
    archiveSha256: string;
    manifest: PluginArtifactManifest;
    fileCount: number;
    totalBytes: number;
}

export interface PackagePluginOptions {
    pluginDir: string;
    outDir?: string;
    filterDevFiles?: boolean;
    signer?: string;
    signature?: string;
    signFn?: (manifest: PluginArtifactManifest, archiveBuffer: Buffer) => Promise<string> | string;
    sbom?: {
        format: string;
        dependencies?: Record<string, string>;
    };
    fixedDate?: Date;
}

export type PluginSignatureVerifier = (
    manifest: PluginArtifactManifest,
    archiveBuffer: Buffer,
) => Promise<boolean> | boolean;

export interface PluginTrustPolicy {
    profile: RuntimeProfile;
    allowBrowserUploads?: boolean;
    allowlistPluginIds?: readonly string[];
    trustedSigners?: readonly string[];
    requireSignatures?: boolean;
    signatureVerifier?: PluginSignatureVerifier;
}

export interface PluginIntegrityVerificationResult {
    valid: boolean;
    pluginId?: string;
    version?: string;
    archiveSha256?: string;
    errors: string[];
    manifest?: PluginArtifactManifest;
}

export interface ProductionPluginReleaseMetadata {
    releaseVersion: string;
    generatedAt: string;
    inventory: Array<{
        id: string;
        name: string;
        version: string;
        archiveSha256: string;
        status: 'production' | 'preview';
    }>;
    excludedPlugins: string[];
    manifestDigest: string;
    signature?: string;
    signer?: string;
}
