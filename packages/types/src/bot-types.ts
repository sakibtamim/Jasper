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
