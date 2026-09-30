import { calculateChecksum } from './checksum.js';
import { Migration, MigrationContext } from './types.js';

// --- MIGRATION 001: Baseline Schema ---

const M001_NAME = '001_baseline_schema';
const M001_SQL_SQLITE = `
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

CREATE INDEX IF NOT EXISTS idx_plays_user_id ON plays(user_id);
CREATE INDEX IF NOT EXISTS idx_plays_song_url ON plays(song_url);
CREATE INDEX IF NOT EXISTS idx_plays_guild_id ON plays(guild_id);
CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_audio_metadata_expires_at ON audio_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_hits_entity ON cache_hits(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`;

const M001_SQL_POSTGRES = `
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

CREATE TABLE IF NOT EXISTS plugin_storage (
  plugin_name TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plugin_name, key)
);

CREATE TABLE IF NOT EXISTS plugin_meta (
  plugin_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yt_dlp_cookies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plays_user_id ON plays(user_id);
CREATE INDEX IF NOT EXISTS idx_plays_song_url ON plays(song_url);
CREATE INDEX IF NOT EXISTS idx_plays_guild_id ON plays(guild_id);
CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_audio_metadata_expires_at ON audio_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_hits_entity ON cache_hits(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`;

// --- MIGRATION 002: Add Thumbnail Column to Plays ---

const M002_NAME = '002_add_thumbnail_column';
const M002_SQL_SQLITE = `ALTER TABLE plays ADD COLUMN thumbnail TEXT;`;
const M002_SQL_POSTGRES = `ALTER TABLE plays ADD COLUMN IF NOT EXISTS thumbnail TEXT;`;

// --- MIGRATION 003: Installation ID & Schema Parity ---

const M003_NAME = '003_installation_id_and_parity';
const M003_SQL_SQLITE = `
ALTER TABLE plays ADD COLUMN installation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_plays_installation_id ON plays(installation_id);
CREATE INDEX IF NOT EXISTS idx_plays_guild_installation ON plays(guild_id, installation_id);

CREATE TABLE IF NOT EXISTS plugin_storage_scoped (
  plugin_name TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  installation_id TEXT NOT NULL DEFAULT 'default',
  PRIMARY KEY (plugin_name, key, installation_id)
);
INSERT OR IGNORE INTO plugin_storage_scoped (plugin_name, key, value, updated_at, installation_id)
SELECT plugin_name, key, value, updated_at, 'default' FROM plugin_storage;
DROP TABLE plugin_storage;
ALTER TABLE plugin_storage_scoped RENAME TO plugin_storage;
CREATE INDEX IF NOT EXISTS idx_plugin_storage_scope ON plugin_storage(installation_id, plugin_name, key);
`;

const M003_SQL_POSTGRES = `
ALTER TABLE plays ADD COLUMN IF NOT EXISTS installation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_plays_installation_id ON plays(installation_id);
CREATE INDEX IF NOT EXISTS idx_plays_guild_installation ON plays(guild_id, installation_id);

ALTER TABLE plugin_storage ADD COLUMN IF NOT EXISTS installation_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE plugin_storage DROP CONSTRAINT IF EXISTS plugin_storage_pkey;
ALTER TABLE plugin_storage ADD PRIMARY KEY (plugin_name, key, installation_id);
CREATE INDEX IF NOT EXISTS idx_plugin_storage_scope ON plugin_storage(installation_id, plugin_name, key);
`;

export const migrations: Migration[] = [
    {
        version: 1,
        name: M001_NAME,
        description: 'Initialize baseline tables and indexes',
        checksum: calculateChecksum(M001_NAME, M001_SQL_SQLITE, M001_SQL_POSTGRES),
        sql: {
            sqlite: M001_SQL_SQLITE,
            postgres: M001_SQL_POSTGRES,
        },
        up: async (ctx: MigrationContext) => {
            if (ctx.dialect === 'sqlite') {
                ctx.sqlite!.exec(M001_SQL_SQLITE);
            } else {
                await ctx.postgres!.query(M001_SQL_POSTGRES);
            }
        },
    },
    {
        version: 2,
        name: M002_NAME,
        description: 'Add thumbnail column to plays table',
        checksum: calculateChecksum(M002_NAME, M002_SQL_SQLITE, M002_SQL_POSTGRES),
        sql: {
            sqlite: M002_SQL_SQLITE,
            postgres: M002_SQL_POSTGRES,
        },
        up: async (ctx: MigrationContext) => {
            if (ctx.dialect === 'sqlite') {
                const tableInfo = ctx.sqlite!.prepare('PRAGMA table_info(plays)').all() as {
                    name: string;
                }[];
                if (!tableInfo.some((col) => col.name === 'thumbnail')) {
                    ctx.sqlite!.exec(M002_SQL_SQLITE);
                }
            } else {
                await ctx.postgres!.query(M002_SQL_POSTGRES);
            }
        },
    },
    {
        version: 3,
        name: M003_NAME,
        description: 'Add installation_id to plays and plugin_storage with schema parity',
        checksum: calculateChecksum(M003_NAME, M003_SQL_SQLITE, M003_SQL_POSTGRES),
        sql: {
            sqlite: M003_SQL_SQLITE,
            postgres: M003_SQL_POSTGRES,
        },
        up: async (ctx: MigrationContext) => {
            if (ctx.dialect === 'sqlite') {
                const playsInfo = ctx.sqlite!.prepare('PRAGMA table_info(plays)').all() as {
                    name: string;
                }[];
                if (!playsInfo.some((col) => col.name === 'installation_id')) {
                    ctx.sqlite!.exec('ALTER TABLE plays ADD COLUMN installation_id TEXT;');
                }
                ctx.sqlite!.exec(`
                    CREATE INDEX IF NOT EXISTS idx_plays_installation_id ON plays(installation_id);
                    CREATE INDEX IF NOT EXISTS idx_plays_guild_installation ON plays(guild_id, installation_id);
                `);

                const storageInfo = ctx
                    .sqlite!.prepare('PRAGMA table_info(plugin_storage)')
                    .all() as { name: string }[];
                if (!storageInfo.some((col) => col.name === 'installation_id')) {
                    ctx.sqlite!.exec(`
                        CREATE TABLE IF NOT EXISTS plugin_storage_scoped (
                            plugin_name TEXT NOT NULL,
                            key TEXT NOT NULL,
                            value TEXT,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            installation_id TEXT NOT NULL DEFAULT 'default',
                            PRIMARY KEY (plugin_name, key, installation_id)
                        );
                        INSERT OR IGNORE INTO plugin_storage_scoped (plugin_name, key, value, updated_at, installation_id)
                        SELECT plugin_name, key, value, updated_at, 'default' FROM plugin_storage;
                        DROP TABLE plugin_storage;
                        ALTER TABLE plugin_storage_scoped RENAME TO plugin_storage;
                        CREATE INDEX IF NOT EXISTS idx_plugin_storage_scope ON plugin_storage(installation_id, plugin_name, key);
                    `);
                }
            } else {
                await ctx.postgres!.query(M003_SQL_POSTGRES);
            }
        },
    },
];
