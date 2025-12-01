import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../logger.js';
import { DatabaseAdapter, PlayRecord, SongStats, UserStats, User, Session, YtDlpCookie } from './types.js';
import { decrypt, encrypt } from '../../utils/encryption.js';
import { ENCRYPTION_KEY } from '../../config/env.js';

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
          thumbnail TEXT,
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

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          discriminator TEXT NOT NULL,
          avatar TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );


        CREATE TABLE IF NOT EXISTS plugin_storage (
          plugin_name TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (plugin_name, key)
        );

        CREATE TABLE IF NOT EXISTS plugin_meta (
          plugin_id TEXT PRIMARY KEY,
          enabled BOOLEAN NOT NULL DEFAULT 1,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS yt_dlp_cookies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          success_count INTEGER NOT NULL DEFAULT 0,
          failure_count INTEGER NOT NULL DEFAULT 0,
          last_used DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Migration: Add thumbnail column if it doesn't exist
      const tableInfo = this.db.pragma('table_info(plays)') as { name: string }[];
      const hasThumbnail = tableInfo.some(col => col.name === 'thumbnail');
      if (!hasThumbnail) {
        this.db.exec('ALTER TABLE plays ADD COLUMN thumbnail TEXT');
        logger.info('[db] Added thumbnail column to plays table');
      }

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
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_plugin_storage_plugin_name ON plugin_storage(plugin_name);
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
      INSERT INTO plays (user_id, guild_id, channel_id, bot_name, song_title, song_url, duration, thumbnail, played_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.userId,
      record.guildId,
      record.channelId,
      record.botName,
      record.songTitle,
      record.songUrl,
      record.duration,
      record.thumbnail || null,
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
        MAX(played_at) as lastPlayedAt,
        MAX(thumbnail) as thumbnail
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
      thumbnail?: string;
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
      GROUP BY entity_id, entity_name, entity_type
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

  async upsertUser(user: User): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, discriminator, avatar, access_token, refresh_token, expires_at, updated_at)
      VALUES (@id, @username, @discriminator, @avatar, @accessToken, @refreshToken, @expiresAt, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        discriminator = excluded.discriminator,
        avatar = excluded.avatar,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        updated_at = datetime('now')
    `);
    stmt.run({
      ...user,
      avatar: user.avatar || null,
      expiresAt: user.expiresAt.toISOString()
    });
  }

  async createSession(session: Session): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (@id, @userId, @expiresAt, @createdAt)
    `);
    stmt.run({
      ...session,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString()
    });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`
      SELECT 
        id, 
        user_id as userId, 
        expires_at as expiresAt, 
        created_at as createdAt
      FROM sessions
      WHERE id = ? AND expires_at > datetime('now')
    `);

    interface SessionRow {
      id: string;
      userId: string;
      expiresAt: string;
      createdAt: string;
    }

    const row = stmt.get(sessionId) as SessionRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt)
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`
      SELECT 
        id, username, discriminator, avatar, 
        access_token as accessToken, 
        refresh_token as refreshToken, 
        expires_at as expiresAt, 
        created_at as createdAt, 
        updated_at as updatedAt
      FROM users
      WHERE id = ?
    `);

    interface UserRow {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      createdAt: string;
      updatedAt: string;
    }

    const row = stmt.get(userId) as UserRow | undefined;
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      discriminator: row.discriminator,
      avatar: row.avatar || undefined,
      accessToken: decrypt(row.accessToken, ENCRYPTION_KEY),
      refreshToken: decrypt(row.refreshToken, ENCRYPTION_KEY),
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  // DevTools methods
  async getAllUsers(limit: number = 50, offset: number = 0): Promise<{ users: User[], total: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const total = (countStmt.get() as { count: number }).count;

    const stmt = this.db.prepare(`
      SELECT 
        id, username, discriminator, avatar, 
        access_token as accessToken, 
        refresh_token as refreshToken, 
        expires_at as expiresAt, 
        created_at as createdAt, 
        updated_at as updatedAt
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    interface UserRow {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      createdAt: string;
      updatedAt: string;
    }

    const rows = stmt.all(limit, offset) as UserRow[];

    const users = rows.map(row => {
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
        avatar: row.avatar || undefined,
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
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(userId);
  }

  async getAllSessions(limit: number = 50, offset: number = 0): Promise<{ sessions: Session[], total: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions');
    const total = (countStmt.get() as { count: number }).count;

    const stmt = this.db.prepare(`
      SELECT id, user_id as userId, expires_at as expiresAt, created_at as createdAt
      FROM sessions
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    interface SessionRow {
      id: string;
      userId: string;
      expiresAt: string;
      createdAt: string;
    }

    const rows = stmt.all(limit, offset) as SessionRow[];
    const sessions = rows.map(row => ({
      id: row.id,
      userId: row.userId,
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt)
    }));

    return { sessions, total };
  }

  async getAllCacheEntries(limit: number = 50, offset: number = 0): Promise<{ entries: import('./types.js').CachedSearchResult[], total: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM search_cache');
    const total = (countStmt.get() as { count: number }).count;

    const stmt = this.db.prepare(`
      SELECT query, song_title as songTitle, song_url as songUrl, duration, thumbnail, cached_at as cachedAt, expires_at as expiresAt
      FROM search_cache
      ORDER BY cached_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    const entries = rows.map(row => ({
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
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM search_cache WHERE query = ?');
    stmt.run(query);
  }

  async getAllAudioCacheEntries(limit: number = 50, offset: number = 0): Promise<{ entries: import('./types.js').AudioMetadata[], total: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM audio_metadata');
    const total = (countStmt.get() as { count: number }).count;

    const stmt = this.db.prepare(`
      SELECT video_id as videoId, title, url, duration, thumbnail, search_terms as searchTerms, cached_at as cachedAt, expires_at as expiresAt
      FROM audio_metadata
      ORDER BY cached_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    const entries = rows.map(row => ({
      videoId: row.videoId,
      title: row.title,
      url: row.url,
      duration: row.duration,
      thumbnail: row.thumbnail,
      searchTerms: JSON.parse(row.searchTerms),
      cachedAt: new Date(row.cachedAt),
      expiresAt: new Date(row.expiresAt)
    }));

    return { entries, total };
  }

  async deleteAudioCacheEntry(videoId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM audio_metadata WHERE video_id = ?');
    stmt.run(videoId);
  }

  async updateAudioThumbnail(videoId: string, thumbnail: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('UPDATE audio_metadata SET thumbnail = ? WHERE video_id = ?');
    stmt.run(thumbnail, videoId);
  }

  async deletePlaysForSong(songUrl: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM plays WHERE song_url = ?');
    stmt.run(songUrl);
  }

  async deletePlaysForUser(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM plays WHERE user_id = ?');
    stmt.run(userId);
  }

  async deletePlaysForChannel(channelId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM plays WHERE channel_id = ?');
    stmt.run(channelId);
  }

  async deletePlaysForBot(botName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM plays WHERE bot_name = ?');
    stmt.run(botName);
  }

  // Plugin Repository Implementation
  async getPluginData(pluginName: string, key: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT value FROM plugin_storage WHERE plugin_name = ? AND key = ?');
    const row = stmt.get(pluginName, key) as { value: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  async setPluginData(pluginName: string, key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`
      INSERT INTO plugin_storage (plugin_name, key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(plugin_name, key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(pluginName, key, JSON.stringify(value));
  }

  async deletePluginData(pluginName: string, key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM plugin_storage WHERE plugin_name = ? AND key = ?');
    stmt.run(pluginName, key);
  }

  async clearPluginData(pluginName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM plugin_storage WHERE plugin_name = ?');
    stmt.run(pluginName);
  }

  // Plugin Meta Implementation
  async isPluginEnabled(pluginId: string): Promise<boolean | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT enabled FROM plugin_meta WHERE plugin_id = ?');
    const row = stmt.get(pluginId) as { enabled: number } | undefined;
    if (!row) return null;
    return row.enabled === 1;
  }

  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`
      INSERT INTO plugin_meta (plugin_id, enabled, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(plugin_id) DO UPDATE SET
        enabled = excluded.enabled,
        updated_at = excluded.updated_at
    `);
    stmt.run(pluginId, enabled ? 1 : 0);
  }

  async getAllPluginMeta(): Promise<Array<{ pluginId: string, enabled: boolean }>> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT plugin_id, enabled FROM plugin_meta');
    const rows = stmt.all() as { plugin_id: string, enabled: number }[];
    return rows.map(row => ({
      pluginId: row.plugin_id,
      enabled: row.enabled === 1
    }));
  }


  // Cookie Repository Implementation
  async addCookie(name: string, content: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const encryptedContent = encrypt(content, ENCRYPTION_KEY);
    const stmt = this.db.prepare(`
      INSERT INTO yt_dlp_cookies (name, content, updated_at)
      VALUES (?, ?, datetime('now'))
    `);
    stmt.run(name, encryptedContent);
  }

  async getCookies(): Promise<YtDlpCookie[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM yt_dlp_cookies ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      content: decrypt(row.content, ENCRYPTION_KEY),
      isActive: row.is_active === 1,
      successCount: row.success_count,
      failureCount: row.failure_count,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getCookie(id: number): Promise<YtDlpCookie | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM yt_dlp_cookies WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      content: decrypt(row.content, ENCRYPTION_KEY),
      isActive: row.is_active === 1,
      successCount: row.success_count,
      failureCount: row.failure_count,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async updateCookie(id: number, updates: Partial<Omit<YtDlpCookie, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sets: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name);
    }
    if (updates.content !== undefined) {
      sets.push('content = ?');
      values.push(encrypt(updates.content, ENCRYPTION_KEY));
    }
    if (updates.isActive !== undefined) {
      sets.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.successCount !== undefined) {
      sets.push('success_count = ?');
      values.push(updates.successCount);
    }
    if (updates.failureCount !== undefined) {
      sets.push('failure_count = ?');
      values.push(updates.failureCount);
    }
    if (updates.lastUsed !== undefined) {
      sets.push('last_used = ?');
      values.push(updates.lastUsed.toISOString());
    }

    if (sets.length === 0) return;

    sets.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = this.db.prepare(`UPDATE yt_dlp_cookies SET ${sets.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  async deleteCookie(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM yt_dlp_cookies WHERE id = ?');
    stmt.run(id);
  }

  async rotateCookieStats(id: number, success: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(`
      UPDATE yt_dlp_cookies 
      SET 
        success_count = success_count + ?,
        failure_count = failure_count + ?,
        last_used = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(success ? 1 : 0, success ? 0 : 1, id);
  }

  async getBestCookie(): Promise<YtDlpCookie | null> {
    if (!this.db) throw new Error('Database not initialized');
    // Prioritize active cookies with high success rate and low failure count
    // Randomize slightly to avoid thundering herd on one cookie
    const stmt = this.db.prepare(`
      SELECT * FROM yt_dlp_cookies 
      WHERE is_active = 1 
      ORDER BY (CAST(success_count AS FLOAT) / (success_count + failure_count + 1)) DESC, last_used ASC
      LIMIT 1
    `);
    const row = stmt.get() as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      content: decrypt(row.content, ENCRYPTION_KEY),
      isActive: row.is_active === 1,
      successCount: row.success_count,
      failureCount: row.failure_count,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

