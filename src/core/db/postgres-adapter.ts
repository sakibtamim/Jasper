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
      `);

            // Create indexes
            await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_plays_user_id ON plays(user_id);
        CREATE INDEX IF NOT EXISTS idx_plays_song_url ON plays(song_url);
        CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
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

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}
