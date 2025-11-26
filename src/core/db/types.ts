export interface PlayRecord {
    id?: number; // Auto-increment
    userId: string;
    guildId: string;
    channelId: string; // NEW
    botName: string; // NEW
    songTitle: string;
    songUrl: string;
    duration: number;
    thumbnail?: string;
    playedAt: Date;
}

export interface UserStats {
    userId: string;
    playCount: number;
    totalDuration: number;
    lastPlayedAt: Date;
}

export interface SongStats {
    songTitle: string;
    songUrl: string;
    playCount: number;
    totalDuration: number;
    lastPlayedAt: Date;
    thumbnail?: string;
}

export interface CachedSearchResult {
    query: string;
    songTitle: string;
    songUrl: string;
    duration: number;
    thumbnail?: string;
    cachedAt: Date;
    expiresAt: Date;
}

export interface AudioMetadata {
    videoId: string;
    title: string;
    url: string;
    duration: number;
    thumbnail?: string;
    searchTerms: string[];
    cachedAt: Date;
    expiresAt: Date;
}

export interface ChannelStats {
    guildId: string;
    guildName: string;
    channelId: string;
    channelName: string;
    playCount: number;
}

export interface BotStats {
    botName: string;
    playCount: number;
}

export interface CacheHitStats {
    entityId: string; // userId or botName
    entityName: string; // username or botName
    cacheHits: number;
    entityType: 'user' | 'bot';
}

export interface User {
    id: string; // Discord ID
    username: string;
    discriminator: string;
    avatar?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Session {
    id: string; // UUID
    userId: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface IStatsRepository {
    trackPlay(record: PlayRecord): Promise<void>;
    getTopSongs(limit?: number): Promise<SongStats[]>;
    getTopUsers(limit?: number): Promise<UserStats[]>;
    getTopChannels(limit?: number): Promise<ChannelStats[]>;
    getTopBots(limit?: number): Promise<BotStats[]>;
    getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }>;
}

export interface ICacheRepository {
    getCachedSearchResult(query: string): Promise<CachedSearchResult | null>;
    setCachedSearchResult(query: string, songTitle: string, songUrl: string, duration: number, thumbnail: string | undefined, ttlHours: number): Promise<void>;
    getAudioMetadata(videoId: string): Promise<AudioMetadata | null>;
    setAudioMetadata(videoId: string, title: string, url: string, duration: number, thumbnail: string | undefined, searchTerms: string[], ttlHours: number): Promise<void>;
    getRandomCachedSong(): Promise<AudioMetadata | null>;
    cleanupExpiredCache(): Promise<void>;
    getCacheStats(): Promise<{ searchCacheSize: number; audioMetadataCount: number }>;
    trackCacheHit(entityId: string, entityName: string, entityType: 'user' | 'bot'): Promise<void>;
    getTopCacheHits(limit?: number): Promise<CacheHitStats[]>;
}

export interface IAuthRepository {
    upsertUser(user: User): Promise<void>;
    createSession(session: Session): Promise<void>;
    getSession(sessionId: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<void>;
    getUser(userId: string): Promise<User | null>;
}

export interface IDevToolsRepository {
    getAllUsers(limit?: number, offset?: number): Promise<{ users: User[], total: number }>;
    deleteUser(userId: string): Promise<void>;
    getAllSessions(limit?: number, offset?: number): Promise<{ sessions: Session[], total: number }>;
    getAllCacheEntries(limit?: number, offset?: number): Promise<{ entries: CachedSearchResult[], total: number }>;
    deleteCacheEntry(query: string): Promise<void>;
    getAllAudioCacheEntries(limit?: number, offset?: number): Promise<{ entries: AudioMetadata[], total: number }>;
    deleteAudioCacheEntry(videoId: string): Promise<void>;
    updateAudioThumbnail(videoId: string, thumbnail: string): Promise<void>;
    deletePlaysForSong(songUrl: string): Promise<void>;
    deletePlaysForUser(userId: string): Promise<void>;
    deletePlaysForChannel(channelId: string): Promise<void>;
    deletePlaysForBot(botName: string): Promise<void>;
}

export interface DatabaseAdapter extends IStatsRepository, ICacheRepository, IAuthRepository, IDevToolsRepository {
    init(): Promise<void>;
    close(): Promise<void>;
}
