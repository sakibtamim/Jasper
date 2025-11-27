import pg from 'pg';
import logger from '../logger.js';
import { DatabaseAdapter, PlayRecord, SongStats, UserStats, User, Session } from './types.js';
import { decrypt } from '../../utils/encryption.js';
import { DATABASE_URL, ENCRYPTION_KEY, isProduction } from '../../config/env.js';

const { Pool } = pg;

export class PostgresAdapter implements DatabaseAdapter {
    private pool: pg.Pool | null = null;

    constructor() {
        // Connection string comes from DATABASE_URL env var
    }

    async init(): Promise<void> {
        try {
            this.pool = new Pool({
                connectionString: DATABASE_URL,
                ssl: isProduction ? { rejectUnauthorized: false } : undefined
            });

            // Test connection
            await this.pool.query('SELECT 1');

            // Create tables
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS plays (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          bot_name TEXT NOT NULL,
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

        CREATE TABLE IF NOT EXISTS cache_hits (
          id SERIAL PRIMARY KEY,
          entity_id TEXT NOT NULL,
          entity_name TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          hit_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          discriminator TEXT NOT NULL,
          avatar TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS plugin_storage (
          plugin_name TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (plugin_name, key)
        );
      `);

            // Create indexes
            await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_plays_user_id ON plays(user_id);
        CREATE INDEX IF NOT EXISTS idx_plays_song_url ON plays(song_url);
        CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
        CREATE INDEX IF NOT EXISTS idx_plays_channel_id ON plays(channel_id);
        CREATE INDEX IF NOT EXISTS idx_plays_bot_name ON plays(bot_name);
        CREATE INDEX IF NOT EXISTS idx_search_cache_query ON search_cache(query);
        CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_audio_metadata_video_id ON audio_metadata(video_id);
        CREATE INDEX IF NOT EXISTS idx_audio_metadata_expires_at ON audio_metadata(expires_at);
        CREATE INDEX IF NOT EXISTS idx_cache_hits_entity_id ON cache_hits(entity_id);
        CREATE INDEX IF NOT EXISTS idx_cache_hits_entity_type ON cache_hits(entity_type);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_plugin_storage_plugin_name ON plugin_storage(plugin_name);
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
            `INSERT INTO plays (user_id, guild_id, channel_id, bot_name, song_title, song_url, duration, played_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                record.userId,
                record.guildId,
                record.channelId,
                record.botName,
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

    async getTopChannels(limit: number = 10): Promise<import('./types.js').ChannelStats[]> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(
            `SELECT 
                guild_id as "guildId",
                '' as "guildName",
                channel_id as "channelId",
                '' as "channelName",
                COUNT(*)::int as "playCount"
            FROM plays
            GROUP BY channel_id, guild_id
            ORDER BY "playCount" DESC
            LIMIT $1`,
            [limit]
        );

        return result.rows as import('./types.js').ChannelStats[];
    }

    async getTopBots(limit: number = 10): Promise<import('./types.js').BotStats[]> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(
            `SELECT 
                bot_name as "botName",
                COUNT(*)::int as "playCount"
            FROM plays
            GROUP BY bot_name
            ORDER BY "playCount" DESC
            LIMIT $1`,
            [limit]
        );

        return result.rows as import('./types.js').BotStats[];
    }

    async trackCacheHit(entityId: string, entityName: string, entityType: 'user' | 'bot'): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');

        await this.pool.query(
            `INSERT INTO cache_hits (entity_id, entity_name, entity_type)
            VALUES ($1, $2, $3)`,
            [entityId, entityName, entityType]
        );
    }

    async getTopCacheHits(limit: number = 10): Promise<import('./types.js').CacheHitStats[]> {
        if (!this.pool) throw new Error('Database not initialized');

        const result = await this.pool.query(
            `SELECT 
                entity_id as "entityId",
                entity_name as "entityName",
                entity_type as "entityType",
                COUNT(*)::int as "cacheHits"
            FROM cache_hits
            GROUP BY entity_id, entity_name, entity_type
            ORDER BY "cacheHits" DESC
            LIMIT $1`,
            [limit]
        );

        return result.rows as import('./types.js').CacheHitStats[];
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    async upsertUser(user: User): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query(`
            INSERT INTO users (id, username, discriminator, avatar, access_token, refresh_token, expires_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                discriminator = EXCLUDED.discriminator,
                avatar = EXCLUDED.avatar,
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                expires_at = EXCLUDED.expires_at,
                updated_at = NOW()
        `, [
            user.id,
            user.username,
            user.discriminator,
            user.avatar,
            user.accessToken,
            user.refreshToken,
            user.expiresAt
        ]);
    }

    async createSession(session: Session): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query(`
            INSERT INTO sessions (id, user_id, expires_at, created_at)
            VALUES ($1, $2, $3, $4)
        `, [
            session.id,
            session.userId,
            session.expiresAt,
            session.createdAt
        ]);
    }

    async getSession(sessionId: string): Promise<Session | null> {
        if (!this.pool) throw new Error('Database not initialized');
        const result = await this.pool.query(`
            SELECT id, user_id as "userId", expires_at as "expiresAt", created_at as "createdAt"
            FROM sessions
            WHERE id = $1 AND expires_at > NOW()
        `, [sessionId]);

        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            ...row,
            expiresAt: new Date(row.expiresAt),
            createdAt: new Date(row.createdAt)
        };
    }

    async deleteSession(sessionId: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }

    async getUser(userId: string): Promise<User | null> {
        if (!this.pool) throw new Error('Database not initialized');
        const result = await this.pool.query(`
            SELECT 
                id, username, discriminator, avatar, 
                access_token as "accessToken", 
                refresh_token as "refreshToken", 
                expires_at as "expiresAt", 
                created_at as "createdAt", 
                updated_at as "updatedAt"
            FROM users
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) return null;
        const row = result.rows[0];

        return {
            id: row.id,
            username: row.username,
            discriminator: row.discriminator,
            avatar: row.avatar,
            accessToken: decrypt(row.accessToken, ENCRYPTION_KEY),
            refreshToken: decrypt(row.refreshToken, ENCRYPTION_KEY),
            expiresAt: new Date(row.expiresAt),
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    // DevTools methods
    async getAllUsers(limit: number = 50, offset: number = 0): Promise<{ users: User[], total: number }> {
        if (!this.pool) throw new Error('Database not initialized');

        const countResult = await this.pool.query('SELECT COUNT(*)::int as count FROM users');
        const total = countResult.rows[0].count;

        const result = await this.pool.query(`
            SELECT 
                id, username, discriminator, avatar, 
                access_token as "accessToken", 
                refresh_token as "refreshToken", 
                expires_at as "expiresAt", 
                created_at as "createdAt", 
                updated_at as "updatedAt"
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const users = result.rows.map(row => {
            let accessToken = row.accessToken;
            let refreshToken = row.refreshToken;
            try {
                accessToken = ENCRYPTION_KEY ? decrypt(row.accessToken, ENCRYPTION_KEY) : '[No Key]';
            } catch (e) {
                logger.warn(`[db-devtools] Failed to decrypt access token for user ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
                accessToken = '[Decryption Failed]';
            }
            try {
                refreshToken = ENCRYPTION_KEY ? decrypt(row.refreshToken, ENCRYPTION_KEY) : '[No Key]';
            } catch (e) {
                logger.warn(`[db-devtools] Failed to decrypt refresh token for user ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
                refreshToken = '[Decryption Failed]';
            }

            return {
                id: row.id,
                username: row.username,
                discriminator: row.discriminator,
                avatar: row.avatar,
                accessToken,
                refreshToken,
                expiresAt: new Date(row.expiresAt),
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt)
            }
        });

        return { users, total };
    }

    async deleteUser(userId: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    async getAllSessions(limit: number = 50, offset: number = 0): Promise<{ sessions: Session[], total: number }> {
        if (!this.pool) throw new Error('Database not initialized');

        const countResult = await this.pool.query('SELECT COUNT(*)::int as count FROM sessions');
        const total = countResult.rows[0].count;

        const result = await this.pool.query(`
            SELECT id, user_id as "userId", expires_at as "expiresAt", created_at as "createdAt"
            FROM sessions
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const sessions = result.rows.map(row => ({
            id: row.id,
            userId: row.userId,
            expiresAt: new Date(row.expiresAt),
            createdAt: new Date(row.createdAt)
        }));

        return { sessions, total };
    }

    async getAllCacheEntries(limit: number = 50, offset: number = 0): Promise<{ entries: import('./types.js').CachedSearchResult[], total: number }> {
        if (!this.pool) throw new Error('Database not initialized');

        const countResult = await this.pool.query('SELECT COUNT(*)::int as count FROM search_cache');
        const total = countResult.rows[0].count;

        const result = await this.pool.query(`
            SELECT query, song_title as "songTitle", song_url as "songUrl", duration, thumbnail, cached_at as "cachedAt", expires_at as "expiresAt"
            FROM search_cache
            ORDER BY cached_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const entries = result.rows.map(row => ({
            query: row.query,
            songTitle: row.songTitle,
            songUrl: row.songUrl,
            duration: row.duration,
            thumbnail: row.thumbnail,
            cachedAt: new Date(row.cachedAt),
            expiresAt: new Date(row.expiresAt)
        }));

        return { entries, total };
    }

    async deleteCacheEntry(query: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM search_cache WHERE query = $1', [query]);
    }

    async getAllAudioCacheEntries(limit: number = 50, offset: number = 0): Promise<{ entries: import('./types.js').AudioMetadata[], total: number }> {
        if (!this.pool) throw new Error('Database not initialized');

        const countResult = await this.pool.query('SELECT COUNT(*) as count FROM audio_metadata');
        const total = parseInt(countResult.rows[0].count, 10);

        const result = await this.pool.query(`
            SELECT video_id as "videoId", title, url, duration, thumbnail, search_terms as "searchTerms", cached_at as "cachedAt", expires_at as "expiresAt"
            FROM audio_metadata
            ORDER BY cached_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const entries = result.rows.map(row => ({
            videoId: row.videoId,
            title: row.title,
            url: row.url,
            duration: row.duration,
            thumbnail: row.thumbnail,
            searchTerms: row.searchTerms, // Postgres handles JSON automatically
            cachedAt: new Date(row.cachedAt),
            expiresAt: new Date(row.expiresAt)
        }));

        return { entries, total };
    }

    async deleteAudioCacheEntry(videoId: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM audio_metadata WHERE video_id = $1', [videoId]);
    }

    async updateAudioThumbnail(videoId: string, thumbnail: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('UPDATE audio_metadata SET thumbnail = $1 WHERE video_id = $2', [thumbnail, videoId]);
    }

    async deletePlaysForSong(songUrl: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM plays WHERE song_url = $1', [songUrl]);
    }

    async deletePlaysForUser(userId: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM plays WHERE user_id = $1', [userId]);
    }

    async deletePlaysForChannel(channelId: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM plays WHERE channel_id = $1', [channelId]);
    }

    async deletePlaysForBot(botName: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM plays WHERE bot_name = $1', [botName]);
    }

    // Plugin Repository Implementation
    async getPluginData(pluginName: string, key: string): Promise<any | null> {
        if (!this.pool) throw new Error('Database not initialized');
        const result = await this.pool.query(
            'SELECT value FROM plugin_storage WHERE plugin_name = $1 AND key = $2',
            [pluginName, key]
        );

        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        try {
            return JSON.parse(row.value);
        } catch {
            return row.value;
        }
    }

    async setPluginData(pluginName: string, key: string, value: any): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query(`
            INSERT INTO plugin_storage (plugin_name, key, value, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (plugin_name, key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = NOW()
        `, [pluginName, key, JSON.stringify(value)]);
    }

    async deletePluginData(pluginName: string, key: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM plugin_storage WHERE plugin_name = $1 AND key = $2', [pluginName, key]);
    }

    async clearPluginData(pluginName: string): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');
        await this.pool.query('DELETE FROM plugin_storage WHERE plugin_name = $1', [pluginName]);
    }
}
