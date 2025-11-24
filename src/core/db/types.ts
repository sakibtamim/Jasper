export interface PlayRecord {
    id?: number; // Auto-increment
    userId: string;
    guildId: string;
    songTitle: string;
    songUrl: string;
    duration: number;
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
     * Close the database connection.
     */
    close(): Promise<void>;
}
