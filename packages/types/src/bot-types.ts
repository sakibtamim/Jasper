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

// --- Worker Pool Types ---

export interface WorkerState {
    name: string;
    client: Client;
    role: 'controller' | 'worker';
    token: string;
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
