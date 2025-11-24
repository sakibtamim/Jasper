import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../logger.js';
import { DatabaseAdapter, PlayRecord, SongStats, UserStats } from './types.js';

export class SqliteAdapter implements DatabaseAdapter {
    private db: Database.Database | null = null;
    private dbPath: string;

    constructor() {
        // Ensure data directory exists
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.dbPath = path.join(dataDir, 'jasper.db');
    }

    async init(): Promise<void> {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');

            // Create tables
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS plays (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          song_title TEXT NOT NULL,
          song_url TEXT NOT NULL,
          duration INTEGER NOT NULL,
          played_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Create indexes for performance
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_plays_user_id ON plays(user_id);
        CREATE INDEX IF NOT EXISTS idx_plays_song_url ON plays(song_url);
        CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
      `);

            logger.info(`[db] SQLite database initialized at ${this.dbPath}`);
        } catch (error) {
            logger.error(`[db] Failed to initialize SQLite: ${error}`);
            throw error;
        }
    }

    async trackPlay(record: PlayRecord): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
      INSERT INTO plays (user_id, guild_id, song_title, song_url, duration, played_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            record.userId,
            record.guildId,
            record.songTitle,
            record.songUrl,
            record.duration,
            record.playedAt.toISOString()
        );
    }

    async getTopSongs(limit: number = 10): Promise<SongStats[]> {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
      SELECT 
        song_title as songTitle,
        song_url as songUrl,
        COUNT(*) as playCount,
        SUM(duration) as totalDuration,
        MAX(played_at) as lastPlayedAt
      FROM plays
      GROUP BY song_url
      ORDER BY playCount DESC
      LIMIT ?
    `);

        const rows = stmt.all(limit) as any[];
        return rows.map(row => ({
            ...row,
            lastPlayedAt: new Date(row.lastPlayedAt)
        }));
    }

    async getTopUsers(limit: number = 10): Promise<UserStats[]> {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
      SELECT 
        user_id as userId,
        COUNT(*) as playCount,
        SUM(duration) as totalDuration,
        MAX(played_at) as lastPlayedAt
      FROM plays
      GROUP BY user_id
      ORDER BY playCount DESC
      LIMIT ?
    `);

        const rows = stmt.all(limit) as any[];
        return rows.map(row => ({
            ...row,
            lastPlayedAt: new Date(row.lastPlayedAt)
        }));
    }

    async getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }> {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as totalPlays,
        COALESCE(SUM(duration), 0) as totalDuration
      FROM plays
    `);

        return stmt.get() as { totalPlays: number; totalDuration: number };
    }

    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
