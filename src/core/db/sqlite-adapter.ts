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
          channel_id TEXT NOT NULL,
          bot_name TEXT NOT NULL,
          song_title TEXT NOT NULL,
          song_url TEXT NOT NULL,
          duration INTEGER NOT NULL,
          played_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS search_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT NOT NULL UNIQUE,
          song_title TEXT NOT NULL,
          song_url TEXT NOT NULL,
          duration INTEGER NOT NULL,
          thumbnail TEXT,
          cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audio_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          video_id TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          duration INTEGER NOT NULL,
          thumbnail TEXT,
          search_terms TEXT NOT NULL,
          cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cache_hits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_id TEXT NOT NULL,
          entity_name TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          hit_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for performance
      this.db.exec(`
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
      INSERT INTO plays (user_id, guild_id, channel_id, bot_name, song_title, song_url, duration, played_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.userId,
      record.guildId,
      record.channelId,
      record.botName,
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

    interface SongStatsRow {
      songTitle: string;
      songUrl: string;
      playCount: number;
      totalDuration: number;
      lastPlayedAt: string;
    }

    const rows = stmt.all(limit) as SongStatsRow[];
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

    interface UserStatsRow {
      userId: string;
      playCount: number;
      totalDuration: number;
      lastPlayedAt: string;
    }

    const rows = stmt.all(limit) as UserStatsRow[];
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

  async getCachedSearchResult(query: string): Promise<import('./types.js').CachedSearchResult | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT query, song_title as songTitle, song_url as songUrl, duration, thumbnail, cached_at as cachedAt, expires_at as expiresAt
      FROM search_cache
      WHERE query = ? AND expires_at > datetime('now')
    `);

    const row = stmt.get(query) as { query: string; songTitle: string; songUrl: string; duration: number; thumbnail?: string; cachedAt: string; expiresAt: string } | undefined;
    if (!row) return null;

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
    if (!this.db) throw new Error('Database not initialized');

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO search_cache (query, song_title, song_url, duration, thumbnail, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(query, songTitle, songUrl, duration, thumbnail, expiresAt);
  }

  async getAudioMetadata(videoId: string): Promise<import('./types.js').AudioMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT video_id as videoId, title, url, duration, thumbnail, search_terms as searchTerms, cached_at as cachedAt, expires_at as expiresAt
      FROM audio_metadata
      WHERE video_id = ? AND expires_at > datetime('now')
    `);

    const row = stmt.get(videoId) as { videoId: string; title: string; url: string; duration: number; thumbnail?: string; searchTerms: string; cachedAt: string; expiresAt: string } | undefined;
    if (!row) return null;

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
    if (!this.db) throw new Error('Database not initialized');

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO audio_metadata (video_id, title, url, duration, thumbnail, search_terms, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(videoId, title, url, duration, thumbnail, JSON.stringify(searchTerms), expiresAt);
  }

  async getRandomCachedSong(): Promise<import('./types.js').AudioMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT video_id as videoId, title, url, duration, thumbnail, search_terms as searchTerms, cached_at as cachedAt, expires_at as expiresAt
      FROM audio_metadata
      WHERE expires_at > datetime('now')
      ORDER BY RANDOM()
      LIMIT 1
    `);

    const row = stmt.get() as { videoId: string; title: string; url: string; duration: number; thumbnail?: string; searchTerms: string; cachedAt: string; expiresAt: string } | undefined;
    if (!row) return null;

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
    if (!this.db) throw new Error('Database not initialized');

    const searchStmt = this.db.prepare(`DELETE FROM search_cache WHERE expires_at <= datetime('now')`);
    const audioStmt = this.db.prepare(`DELETE FROM audio_metadata WHERE expires_at <= datetime('now')`);

    const searchDeleted = searchStmt.run().changes;
    const audioDeleted = audioStmt.run().changes;

    if (searchDeleted > 0 || audioDeleted > 0) {
      logger.info(`[db] Cleaned up ${searchDeleted} expired search cache entries and ${audioDeleted} expired audio metadata entries`);
    }
  }

  async getCacheStats(): Promise<{ searchCacheSize: number; audioMetadataCount: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const searchStmt = this.db.prepare(`SELECT COUNT(*) as count FROM search_cache WHERE expires_at > datetime('now')`);
    const audioStmt = this.db.prepare(`SELECT COUNT(*) as count FROM audio_metadata WHERE expires_at > datetime('now')`);

    const searchCount = (searchStmt.get() as { count: number }).count;
    const audioCount = (audioStmt.get() as { count: number }).count;

    return {
      searchCacheSize: searchCount,
      audioMetadataCount: audioCount,
    };
  }

  async getTopChannels(limit: number = 10): Promise<import('./types.js').ChannelStats[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT 
        guild_id as guildId,
        '' as guildName,
        channel_id as channelId,
        '' as channelName,
        COUNT(*) as playCount
      FROM plays
      GROUP BY channel_id, guild_id
      ORDER BY playCount DESC
      LIMIT ?
    `);

    return stmt.all(limit) as import('./types.js').ChannelStats[];
  }

  async getTopBots(limit: number = 10): Promise<import('./types.js').BotStats[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT 
        bot_name as botName,
        COUNT(*) as playCount
      FROM plays
      GROUP BY bot_name
      ORDER BY playCount DESC
      LIMIT ?
    `);

    return stmt.all(limit) as import('./types.js').BotStats[];
  }

  async trackCacheHit(entityId: string, entityName: string, entityType: 'user' | 'bot'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO cache_hits (entity_id, entity_name, entity_type)
      VALUES (?, ?, ?)
    `);

    stmt.run(entityId, entityName, entityType);
  }

  async getTopCacheHits(limit: number = 10): Promise<import('./types.js').CacheHitStats[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT 
        entity_id as entityId,
        entity_name as entityName,
        entity_type as entityType,
        COUNT(*) as cacheHits
      FROM cache_hits
      GROUP BY entity_id, entity_type
      ORDER BY cacheHits DESC
      LIMIT ?
    `);

    return stmt.all(limit) as import('./types.js').CacheHitStats[];
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
