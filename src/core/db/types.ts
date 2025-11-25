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
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    id: string; // UUID
    userId: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface DatabaseAdapter {
    /**
     * Initialize the database connection and schema.
     */
    init(): Promise<void>;

    /**
     * Record a song play.
     */
    trackPlay(record: PlayRecord): Promise<void>;

    /**
     * Get top most played songs.
     */
    getTopSongs(limit?: number): Promise<SongStats[]>;

    /**
     * Get top users by play count.
     */
    getTopUsers(limit?: number): Promise<UserStats[]>;

    /**
     * Get top channels by play count.
     */
    getTopChannels(limit?: number): Promise<ChannelStats[]>;

    /**
     * Get top bots by play count.
     */
    getTopBots(limit?: number): Promise<BotStats[]>;

    /**
     * Get total stats (total plays, total duration).
     */
    getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }>;

    // Cache methods
    /**
     * Get a cached search result.
     */
    getCachedSearchResult(query: string): Promise<CachedSearchResult | null>;

    /**
     * Set a cached search result with TTL.
     */
    setCachedSearchResult(query: string, songTitle: string, songUrl: string, duration: number, thumbnail: string | undefined, ttlHours: number): Promise<void>;

    /**
     * Get audio metadata from cache.
     */
    getAudioMetadata(videoId: string): Promise<AudioMetadata | null>;

    /**
     * Set audio metadata in cache with TTL.
     */
    setAudioMetadata(videoId: string, title: string, url: string, duration: number, thumbnail: string | undefined, searchTerms: string[], ttlHours: number): Promise<void>;

    /**
     * Get a random cached song for radio feature.
     */
    getRandomCachedSong(): Promise<AudioMetadata | null>;

    /**
     * Cleanup expired cache entries.
     */
    cleanupExpiredCache(): Promise<void>;

    /**
     * Get cache statistics.
     */
    getCacheStats(): Promise<{ searchCacheSize: number; audioMetadataCount: number }>;

    /**
     * Track a cache hit.
     */
    trackCacheHit(entityId: string, entityName: string, entityType: 'user' | 'bot'): Promise<void>;

    /**
     * Get top entities by cache hits.
     */
    getTopCacheHits(limit?: number): Promise<CacheHitStats[]>;

    /**
     * Close the database connection.
     */
    close(): Promise<void>;

    // Auth methods
    upsertUser(user: User): Promise<void>;
    createSession(session: Session): Promise<void>;
    getSession(sessionId: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<void>;
}
