import pg from 'pg';
import logger from '../logger.js';
import { DatabaseAdapter, PlayRecord, SongStats, UserStats } from './types.js';

const { Pool } = pg;

export class PostgresAdapter implements DatabaseAdapter {
    private pool: pg.Pool | null = null;

    constructor() {
        // Connection string should be in DATABASE_URL env var
    }

    async init(): Promise<void> {
        try {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
            });

            // Test connection
            await this.pool.query('SELECT 1');

            // Create tables
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS plays (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          song_title TEXT NOT NULL,
          song_url TEXT NOT NULL,
          duration INTEGER NOT NULL,
          played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS search_cache (
          id SERIAL PRIMARY KEY,
          query TEXT NOT NULL UNIQUE,
          song_title TEXT NOT NULL,
          song_url TEXT NOT NULL,
          duration INTEGER NOT NULL,
          thumbnail TEXT,
          cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audio_metadata (
          id SERIAL PRIMARY KEY,
          video_id TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          duration INTEGER NOT NULL,
          thumbnail TEXT,
          search_terms TEXT NOT NULL,
          cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `);

            // Create indexes
            await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_plays_user_id ON plays(user_id);
        CREATE INDEX IF NOT EXISTS idx_plays_song_url ON plays(song_url);
        CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
        CREATE INDEX IF NOT EXISTS idx_search_cache_query ON search_cache(query);
        CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_audio_metadata_video_id ON audio_metadata(video_id);
        CREATE INDEX IF NOT EXISTS idx_audio_metadata_expires_at ON audio_metadata(expires_at);
      `);

            logger.info('[db] Postgres database initialized');
        } catch (error) {
            logger.error(`[db] Failed to initialize Postgres: ${error}`);
            throw error;
        }
    }

    async trackPlay(record: PlayRecord): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');

        await this.pool.query(
            `INSERT INTO plays (user_id, guild_id, song_title, song_url, duration, played_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                record.userId,
                record.guildId,
                record.songTitle,
                record.songUrl,
                record.duration,
                record.playedAt
            ]
        );
    }

    async getTopSongs(limit: number = 10): Promise<SongStats[]> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(`
      SELECT 
        song_title as "songTitle",
        song_url as "songUrl",
        COUNT(*)::int as "playCount",
        SUM(duration)::int as "totalDuration",
        MAX(played_at) as "lastPlayedAt"
      FROM plays
      GROUP BY song_url, song_title
      ORDER BY "playCount" DESC
      LIMIT $1
    `, [limit]);

        return result.rows.map(row => ({
            ...row,
            lastPlayedAt: new Date(row.lastPlayedAt)
        }));
    }

    async getTopUsers(limit: number = 10): Promise<UserStats[]> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(`
      SELECT 
        user_id as "userId",
        COUNT(*)::int as "playCount",
        SUM(duration)::int as "totalDuration",
        MAX(played_at) as "lastPlayedAt"
      FROM plays
      GROUP BY user_id
      ORDER BY "playCount" DESC
      LIMIT $1
    `, [limit]);

        return result.rows.map(row => ({
            ...row,
            lastPlayedAt: new Date(row.lastPlayedAt)
        }));
    }

    async getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(`
      SELECT 
        COUNT(*)::int as "totalPlays",
        COALESCE(SUM(duration), 0)::int as "totalDuration"
      FROM plays
    `);

        return result.rows[0];
    }

    async getCachedSearchResult(query: string): Promise<import('./types.js').CachedSearchResult | null> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(`
            SELECT query, song_title as "songTitle", song_url as "songUrl", duration, thumbnail, cached_at as "cachedAt", expires_at as "expiresAt"
            FROM search_cache
            WHERE query = $1 AND expires_at > NOW()
        `, [query]);

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            query: row.query,
            songTitle: row.songTitle,
            songUrl: row.songUrl,
            duration: row.duration,
            thumbnail: row.thumbnail,
            cachedAt: new Date(row.cachedAt),
            expiresAt: new Date(row.expiresAt),
        };
    }

    async setCachedSearchResult(query: string, songTitle: string, songUrl: string, duration: number, thumbnail: string | undefined, ttlHours: number): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');

        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

        await this.pool.query(`
            INSERT INTO search_cache (query, song_title, song_url, duration, thumbnail, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (query) DO UPDATE
            SET song_title = $2, song_url = $3, duration = $4, thumbnail = $5, expires_at = $6, cached_at = NOW()
        `, [query, songTitle, songUrl, duration, thumbnail, expiresAt]);
    }

    async getAudioMetadata(videoId: string): Promise<import('./types.js').AudioMetadata | null> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(`
            SELECT video_id as "videoId", title, url, duration, thumbnail, search_terms as "searchTerms", cached_at as "cachedAt", expires_at as "expiresAt"
            FROM audio_metadata
            WHERE video_id = $1 AND expires_at > NOW()
        `, [videoId]);

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            videoId: row.videoId,
            title: row.title,
            url: row.url,
            duration: row.duration,
            thumbnail: row.thumbnail,
            searchTerms: JSON.parse(row.searchTerms),
            cachedAt: new Date(row.cachedAt),
            expiresAt: new Date(row.expiresAt),
        };
    }

    async setAudioMetadata(videoId: string, title: string, url: string, duration: number, thumbnail: string | undefined, searchTerms: string[], ttlHours: number): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');

        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

        await this.pool.query(`
            INSERT INTO audio_metadata (video_id, title, url, duration, thumbnail, search_terms, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (video_id) DO UPDATE
            SET title = $2, url = $3, duration = $4, thumbnail = $5, search_terms = $6, expires_at = $7, cached_at = NOW()
        `, [videoId, title, url, duration, thumbnail, JSON.stringify(searchTerms), expiresAt]);
    }

    async getRandomCachedSong(): Promise<import('./types.js').AudioMetadata | null> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(`
            SELECT video_id as "videoId", title, url, duration, thumbnail, search_terms as "searchTerms", cached_at as "cachedAt", expires_at as "expiresAt"
            FROM audio_metadata
            WHERE expires_at > NOW()
            ORDER BY RANDOM()
            LIMIT 1
        `);

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            videoId: row.videoId,
            title: row.title,
            url: row.url,
            duration: row.duration,
            thumbnail: row.thumbnail,
            searchTerms: JSON.parse(row.searchTerms),
            cachedAt: new Date(row.cachedAt),
            expiresAt: new Date(row.expiresAt),
        };
    }

    async cleanupExpiredCache(): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');

        const searchResult = await this.pool.query(`DELETE FROM search_cache WHERE expires_at <= NOW()`);
        const audioResult = await this.pool.query(`DELETE FROM audio_metadata WHERE expires_at <= NOW()`);

        const searchDeleted = searchResult.rowCount || 0;
        const audioDeleted = audioResult.rowCount || 0;

        if (searchDeleted > 0 || audioDeleted > 0) {
            logger.info(`[db] Cleaned up ${searchDeleted} expired search cache entries and ${audioDeleted} expired audio metadata entries`);
        }
    }

    async getCacheStats(): Promise<{ searchCacheSize: number; audioMetadataCount: number }> {
        if (!this.pool) throw new Error('Database not initialized');

        const searchResult = await this.pool.query(`SELECT COUNT(*)::int as count FROM search_cache WHERE expires_at > NOW()`);
        const audioResult = await this.pool.query(`SELECT COUNT(*)::int as count FROM audio_metadata WHERE expires_at > NOW()`);

        return {
            searchCacheSize: searchResult.rows[0].count,
            audioMetadataCount: audioResult.rows[0].count,
        };
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}
