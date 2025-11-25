// scripts/migrate-cache.js
// Migration script to transfer file-based cache to database
// This script is compatible with production environments (no TypeScript/tsx required)

import { readFile, readdir, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

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
            const expiresAt = new Date(cachedAt.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days TTL

            stmt.run(
                query,
                song.title,
                song.url,
                song.durationInSec,
                song.thumbnail || null,
                cachedAt.toISOString(),
                expiresAt.toISOString()
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
        const metaFiles = files.filter(f => f.endsWith('.meta.json'));

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
                const expiresAt = new Date(cachedAt.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days TTL

                stmt.run(
                    meta.videoId,
                    meta.title || meta.searchTerms[0] || 'Unknown',
                    meta.url,
                    meta.durationInSec || 0,
                    meta.thumbnail || null,
                    JSON.stringify(meta.searchTerms || []),
                    cachedAt.toISOString(),
                    expiresAt.toISOString()
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
        hasAudioMeta = files.some(f => f.endsWith('.meta.json'));
    } catch (e) {
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

async function runMigration() {
    // Skip migration in CI environments (build phase)
    if (process.env.CI) {
        console.log('[migration] Skipping migration in CI environment');
        return;
    }

    try {
        // Ensure database directory exists
        await mkdir(path.dirname(DB_PATH), { recursive: true });

        const db = new Database(DB_PATH);

        // Check if migration is needed
        const needed = await checkMigrationNeeded(db);
        if (!needed) {
            db.close();
            return;
        }

        console.log('[migration] Running migration...');

        // Wrap everything in a transaction
        const migrationTransaction = db.transaction(async () => {
            const searchMigrated = await migrateSearchCache(db, false); // Pass false to skip deletion
            const audioMigrated = await migrateAudioMetadata(db, false); // Pass false to skip deletion
            return { searchMigrated, audioMigrated };
        });

        const { searchMigrated, audioMigrated } = await migrationTransaction();

        console.log(`[migration] Migration complete! Total: ${searchMigrated} search + ${audioMigrated} audio entries`);

        // Only delete files after successful transaction commit
        console.log('[migration] Deleting old cache files...');
        try {
            if (await fileExists(SEARCH_CACHE_FILE)) {
                await unlink(SEARCH_CACHE_FILE);
            }

            try {
                const files = await readdir(AUDIO_METADATA_DIR);
                const metaFiles = files.filter(f => f.endsWith('.meta.json'));
                for (const file of metaFiles) {
                    await unlink(path.join(AUDIO_METADATA_DIR, file));
                }
            } catch (e) {
                // Ignore if dir doesn't exist
            }
            console.log('[migration] Cleanup complete');
        } catch (cleanupError) {
            console.warn(`[migration] Warning: Failed to clean up old files: ${cleanupError.message}`);
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
