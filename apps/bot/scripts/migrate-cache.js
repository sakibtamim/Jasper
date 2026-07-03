// scripts/migrate-cache.js
// Migration script to transfer file-based cache to database
// This script is compatible with production environments (no TypeScript/tsx required)
import { mkdir, readFile, readdir, unlink } from 'fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_ROOT = path.join(path.dirname(__dirname), 'cache');
const SEARCH_CACHE_FILE = path.join(CACHE_ROOT, 'search', 'cache.json');
const AUDIO_METADATA_DIR = path.join(CACHE_ROOT, 'audio');
const DB_PATH = path.join(path.dirname(__dirname), 'data', 'jasper.db');

console.log('[migration] Starting cache migration...');

async function migrateSearchCache(db, deleteFiles = true) {
    try {
        const data = await readFile(SEARCH_CACHE_FILE, 'utf-8');
        const cache = JSON.parse(data);

        let migrated = 0;
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO search_cache (query, song_title, song_url, duration, thumbnail, cached_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const [query, entry] of Object.entries(cache)) {
            const { song, timestamp } = entry;
            const cachedAt = new Date(timestamp);
            const expiresAt = new Date(cachedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days TTL

            stmt.run(
                query,
                song.title,
                song.url,
                song.durationInSec,
                song.thumbnail || null,
                cachedAt.toISOString(),
                expiresAt.toISOString(),
            );
            migrated++;
        }

        console.log(`[migration] Migrated ${migrated} search cache entries`);

        // Delete the JSON file after successful migration if requested
        if (deleteFiles) {
            await unlink(SEARCH_CACHE_FILE);
            console.log(`[migration] Deleted ${SEARCH_CACHE_FILE}`);
        }

        return migrated;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('[migration] No search cache file found, skipping...');
            return 0;
        }
        throw error;
    }
}

async function migrateAudioMetadata(db, deleteFiles = true) {
    try {
        const files = await readdir(AUDIO_METADATA_DIR);
        const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

        if (metaFiles.length === 0) {
            console.log('[migration] No audio metadata files found, skipping...');
            return 0;
        }

        let migrated = 0;
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO audio_metadata (video_id, title, url, duration, thumbnail, search_terms, cached_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const metaFile of metaFiles) {
            try {
                const metaPath = path.join(AUDIO_METADATA_DIR, metaFile);
                const data = await readFile(metaPath, 'utf-8');
                const meta = JSON.parse(data);

                const cachedAt = new Date(meta.timestamp);
                const expiresAt = new Date(cachedAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days TTL

                stmt.run(
                    meta.videoId,
                    meta.title || meta.searchTerms[0] || 'Unknown',
                    meta.url,
                    meta.durationInSec || 0,
                    meta.thumbnail || null,
                    JSON.stringify(meta.searchTerms || []),
                    cachedAt.toISOString(),
                    expiresAt.toISOString(),
                );
                migrated++;

                // Delete JSON file after successful migration if requested
                if (deleteFiles) {
                    await unlink(metaPath);
                }
            } catch (err) {
                console.warn(`[migration] Failed to migrate ${metaFile}: ${err.message}`);
            }
        }

        console.log(`[migration] Migrated ${migrated} audio metadata entries`);
        if (deleteFiles) {
            console.log(`[migration] Deleted ${migrated} metadata JSON files`);
        }

        return migrated;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('[migration] No audio metadata directory found, skipping...');
            return 0;
        }
        throw error;
    }
}

async function checkMigrationNeeded(db) {
    // First check if we have any source files to migrate
    const hasSearchCache = await fileExists(SEARCH_CACHE_FILE);

    let hasAudioMeta = false;
    try {
        const files = await readdir(AUDIO_METADATA_DIR);
        hasAudioMeta = files.some((f) => f.endsWith('.meta.json'));
    } catch {
        // Directory might not exist
    }

    if (!hasSearchCache && !hasAudioMeta) {
        console.log('[migration] No source cache files found, nothing to migrate');
        return false;
    }

    // Check if there's any data in the DB cache tables
    const searchCount = db.prepare('SELECT COUNT(*) as count FROM search_cache').get().count;
    const audioCount = db.prepare('SELECT COUNT(*) as count FROM audio_metadata').get().count;

    if (searchCount > 0 || audioCount > 0) {
        console.log('[migration] Database cache already has data, skipping migration');
        return false;
    }

    return true;
}

async function fileExists(path) {
    try {
        await readFile(path);
        return true;
    } catch {
        return false;
    }
}

async function ensureSchema(db) {
    // Create tables if they don't exist (idempotent)
    db.exec(`
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

    // Migrate existing plays table if it has old schema (missing channel_id or bot_name)
    const playsInfo = db.prepare('PRAGMA table_info(plays)').all();
    const hasChannelId = playsInfo.some((col) => col.name === 'channel_id');
    const hasBotName = playsInfo.some((col) => col.name === 'bot_name');

    if (!hasChannelId || !hasBotName) {
        console.log('[migration] Migrating plays table schema...');

        // SQLite doesn't support DROP COLUMN, so we need to recreate the table
        db.exec(`
            -- Create new table with correct schema
            CREATE TABLE plays_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL DEFAULT '',
                bot_name TEXT NOT NULL DEFAULT 'Unknown',
                song_title TEXT NOT NULL,
                song_url TEXT NOT NULL,
                duration INTEGER NOT NULL,
                played_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Copy data from old table
            INSERT INTO plays_new (id, user_id, guild_id, song_title, song_url, duration, played_at)
            SELECT id, user_id, guild_id, song_title, song_url, duration, played_at
            FROM plays;

            -- Drop old table
            DROP TABLE plays;

            -- Rename new table
            ALTER TABLE plays_new RENAME TO plays;
        `);

        console.log('[migration] Plays table schema migrated successfully');
    }

    // Create indexes for performance
    db.exec(`
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
}

async function runMigration() {
    // Skip migration in CI environments (build phase)
    if (process.env.CI) {
        console.log('[migration] Skipping migration in CI environment');
        return;
    }

    try {
        // Ensure database directory exists
        await mkdir(path.dirname(DB_PATH), { recursive: true });

        const db = new DatabaseSync(DB_PATH);

        // Ensure schema exists before attempting migration
        ensureSchema(db);

        // Check if migration is needed
        const needed = await checkMigrationNeeded(db);
        if (!needed) {
            db.close();
            return;
        }

        console.log('[migration] Running migration...');

        // Run migrations (not in a transaction since they use async file operations)
        const searchMigrated = await migrateSearchCache(db, false);
        const audioMigrated = await migrateAudioMetadata(db, false);

        console.log(
            `[migration] Migration complete! Total: ${searchMigrated} search + ${audioMigrated} audio entries`,
        );

        // Only delete files after successful migration
        console.log('[migration] Deleting old cache files...');
        try {
            if (await fileExists(SEARCH_CACHE_FILE)) {
                await unlink(SEARCH_CACHE_FILE);
            }

            try {
                const files = await readdir(AUDIO_METADATA_DIR);
                const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
                await Promise.allSettled(
                    metaFiles.map((file) => unlink(path.join(AUDIO_METADATA_DIR, file))),
                );
            } catch {
                // Ignore if dir doesn't exist
            }
            console.log('[migration] Cleanup complete');
        } catch (cleanupError) {
            console.warn(
                `[migration] Warning: Failed to clean up old files: ${cleanupError.message}`,
            );
            // Don't fail the build just because cleanup failed, data is safe in DB
        }

        db.close();
    } catch (error) {
        console.error(`[migration] Migration failed: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run migration
runMigration();
