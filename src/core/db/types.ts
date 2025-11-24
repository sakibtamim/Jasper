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

    /**
     * Close the database connection.
     */
    close(): Promise<void>;
}
