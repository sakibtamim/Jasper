import fs from 'fs/promises';
import path from 'path';
import { Readable, PassThrough } from 'stream';
import { createWriteStream, createReadStream } from 'fs';
import { spawn } from 'child_process';
import logger from './logger.js';
import { Song } from './audio/queue-manager.js';
import { getYtDlpPath } from './audio/stream-handler.js';
import { getBaseYtDlpArgs } from '../utils/yt-dlp-helper.js';




// Cache configuration from environment
export const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true';
export const CACHE_SEARCH_TTL_HOURS = parseInt(process.env.CACHE_SEARCH_TTL_HOURS || '168', 10); // 7 days
export const CACHE_AUDIO_TTL_HOURS = parseInt(process.env.CACHE_AUDIO_TTL_HOURS || '72', 10); // 3 days
export const CACHE_CLEANUP_INTERVAL_HOURS = parseInt(process.env.CACHE_CLEANUP_INTERVAL_HOURS || '1', 10);

// Cache directories
// Cache directories
const CACHE_ROOT = path.join(process.cwd(), 'cache');
const CACHE_SEARCH_DIR = path.join(CACHE_ROOT, 'search');
const CACHE_AUDIO_DIR = path.join(CACHE_ROOT, 'audio');
const SEARCH_CACHE_FILE = path.join(CACHE_SEARCH_DIR, 'cache.json');

interface CachedSearchResult {
    song: Omit<Song, 'requestedBy'> & { requestedBy?: string };
    timestamp: number;
}

interface AudioMetadata {
    videoId: string;
    searchTerms: string[];
    timestamp: number;
    // Extended metadata for efficient retrieval
    title?: string;
    durationInSec?: number;
    url?: string;
    thumbnail?: string;
    requestedBy?: string;
}

export interface CacheStats {
    searchCacheSize: number;
    audioCacheFiles: number;
    audioCacheSizeMB: number;
}

/**
 * Abstracted cache storage interface for future extensibility
 * This allows easy migration to database or cloud storage backends
 */
export interface ICacheStorage {
    // Search result caching
    getCachedSearchResult(query: string): Promise<Song | null>;
    setCachedSearchResult(query: string, song: Song): Promise<void>;

    // Audio file caching
    getCachedAudioStream(videoId: string): Promise<Readable | null>;
    cacheAudioStream(url: string, videoId: string, searchTerms: string[]): Promise<Readable>;

    // Cleanup and stats
    cleanupExpiredCache(): Promise<void>;
    getCacheStats(): Promise<CacheStats>;

    // Radio feature
    getRandomCachedSong(): Promise<Song | null>;
}

/**
 * File-based cache storage implementation (MVP)
 * Future: DatabaseCacheStorage, S3CacheStorage, etc.
 */
class FileCacheStorage implements ICacheStorage {
    private searchCache: Map<string, CachedSearchResult> = new Map();
    private searchCacheLoaded = false;

    /**
     * Load search cache from disk into memory
     */
    private async loadSearchCache(): Promise<void> {
        if (this.searchCacheLoaded) return;

        try {
            const data = await fs.readFile(SEARCH_CACHE_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            this.searchCache = new Map(Object.entries(parsed));
            this.searchCacheLoaded = true;
            logger.info(`[cache] Loaded ${this.searchCache.size} search results from disk`);
        } catch (error) {
            // File doesn't exist or is corrupted, start fresh
            this.searchCache = new Map();
            this.searchCacheLoaded = true;
        }
    }

    /**
     * Save search cache to disk asynchronously (non-blocking)
     */
    private async saveSearchCache(): Promise<void> {
        try {
            const obj = Object.fromEntries(this.searchCache);
            const data = JSON.stringify(obj, null, 2);
            // Async write - don't block
            await fs.writeFile(SEARCH_CACHE_FILE, data, 'utf-8');
        } catch (error) {
            logger.error(`[cache] Failed to save search cache: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getCachedSearchResult(query: string): Promise<Song | null> {
        await this.loadSearchCache();

        const cached = this.searchCache.get(query);
        if (!cached) return null;

        // Check if expired
        const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
        if (ageHours > CACHE_SEARCH_TTL_HOURS) {
            this.searchCache.delete(query);
            this.saveSearchCache(); // Async, fire and forget
            return null;
        }

        logger.info(`[cache] Search hit for: ${query}`);
        return {
            ...cached.song,
            requestedBy: cached.song.requestedBy || "Unknown",
            fromCache: true
        };
    }

    async setCachedSearchResult(query: string, song: Song): Promise<void> {
        await this.loadSearchCache();

        // Create a copy and remove requestedBy if it is "Unknown" to save space/cleanup JSON
        const songToCache = { ...song };
        if (songToCache.requestedBy === "Unknown") {
            delete (songToCache as any).requestedBy;
        }
        // Don't cache the fromCache flag itself
        delete songToCache.fromCache;

        this.searchCache.set(query, {
            song: songToCache,
            timestamp: Date.now(),
        });

        // Async write - don't block the response
        this.saveSearchCache();
        logger.info(`[cache] Cached search result for: ${query}`);
    }

    async getCachedAudioStream(videoId: string): Promise<Readable | null> {
        const audioPath = path.join(CACHE_AUDIO_DIR, `${videoId}.webm`);
        const metaPath = path.join(CACHE_AUDIO_DIR, `${videoId}.meta.json`);

        try {
            // Check if files exist
            await fs.access(audioPath);
            await fs.access(metaPath);

            // Check if expired
            const metaData = await fs.readFile(metaPath, 'utf-8');
            const meta: AudioMetadata = JSON.parse(metaData);
            const ageHours = (Date.now() - meta.timestamp) / (1000 * 60 * 60);

            if (ageHours > CACHE_AUDIO_TTL_HOURS) {
                // Expired, delete files
                await fs.unlink(audioPath).catch((err) => logger.warn(`[cache] Failed to delete expired audio ${audioPath}: ${err.message}`));
                await fs.unlink(metaPath).catch((err) => logger.warn(`[cache] Failed to delete expired meta ${metaPath}: ${err.message}`));
                return null;
            }

            // Return read stream
            logger.info(`[cache] Audio cache hit for video: ${videoId}`);
            return createReadStream(audioPath);
        } catch (error) {
            logger.warn(`[cache] Failed to read cached audio ${videoId}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    async cacheAudioStream(url: string, videoId: string, searchTerms: string[]): Promise<Readable> {
        logger.info(`[cache] Audio cache miss, downloading: ${url}`);

        const audioPath = path.join(CACHE_AUDIO_DIR, `${videoId}.webm`);
        const metaPath = path.join(CACHE_AUDIO_DIR, `${videoId}.meta.json`);

        // Create a PassThrough stream for immediate playback
        const passThrough = new PassThrough();

        // Spawn yt-dlp process
        const ytDlpPath = getYtDlpPath();
        const args = [
            ...getBaseYtDlpArgs(),
            '-f', 'bestaudio',
            '-o', '-',
            '-q',
            url
        ];
        const ytDlpProcess = spawn(ytDlpPath, args);

        ytDlpProcess.stderr!.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) logger.warn(`[cache] yt-dlp stderr: ${msg}`);
        });

        // Create write stream to cache file
        const fileStream = createWriteStream(audioPath);

        // Track size for logging without buffering entire file in memory
        let totalBytes = 0;
        let hasError = false;

        ytDlpProcess.stdout!.on('data', (chunk: Buffer) => {
            // Write to cache file (async)
            fileStream.write(chunk);

            // Buffer for immediate playback
            totalBytes += chunk.length;
            passThrough.write(chunk);
        });

        ytDlpProcess.stdout!.on('end', () => {
            fileStream.end();
            passThrough.end();
        });

        // Handle process exit to check for errors
        ytDlpProcess.on('close', async (code) => {
            if (code !== 0 && !hasError) {
                // Non-zero exit code indicates failure
                logger.error(`[cache] yt-dlp exited with code ${code} for: ${url}`);
                hasError = true;

                // Cleanup partial files
                try {
                    await fs.unlink(audioPath).catch(() => { });
                    await fs.unlink(metaPath).catch(() => { });
                    logger.info(`[cache] Cleaned up partial files for failed download: ${videoId}`);
                } catch (cleanupErr) {
                    logger.warn(`[cache] Failed to cleanup partial files ${videoId}: ${cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)}`);
                }
            } else if (code === 0 && !hasError) {
                // Success: save metadata
                const meta: AudioMetadata = {
                    videoId,
                    searchTerms,
                    timestamp: Date.now(),
                    // Save extended metadata if available (passed via searchTerms or we could pass a Song object)
                    // Since we only pass searchTerms here, we might need to update the signature or infer
                    // For now, we'll try to use the first search term as title if it looks like one
                    title: searchTerms[0],
                    url: url,
                };
                try {
                    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
                    logger.info(`[cache] Cached audio for video: ${videoId} (${(totalBytes / 1024 / 1024).toFixed(2)}MB)`);
                } catch (metaErr) {
                    logger.error(`[cache] Failed to write metadata for ${videoId}: ${metaErr instanceof Error ? metaErr.message : String(metaErr)}`);
                    // Cleanup audio file if metadata write fails
                    await fs.unlink(audioPath).catch(() => { });
                }
            }
        });

        ytDlpProcess.on('error', async (err) => {
            logger.error(`[cache] yt-dlp error during caching: ${err.message}`);
            hasError = true;
            passThrough.destroy(err);
            fileStream.destroy();

            // Cleanup partial file to prevent orphans
            await fs.unlink(audioPath).catch(() => { });
        });

        // Return stream immediately (async write happens in background)
        return passThrough;
    }

    async cleanupExpiredCache(): Promise<void> {
        logger.info('[cache] Running cleanup...');

        let deletedFiles = 0;
        let freedBytes = 0;

        try {
            // Cleanup expired search results
            await this.loadSearchCache();
            const initialSize = this.searchCache.size;
            for (const [query, cached] of this.searchCache.entries()) {
                const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
                if (ageHours > CACHE_SEARCH_TTL_HOURS) {
                    this.searchCache.delete(query);
                }
            }
            if (this.searchCache.size < initialSize) {
                await this.saveSearchCache();
                logger.info(`[cache] Removed ${initialSize - this.searchCache.size} expired search results`);
            }

            // Cleanup expired audio files
            const files = await fs.readdir(CACHE_AUDIO_DIR);
            for (const file of files) {
                if (!file.endsWith('.meta.json')) continue;

                const metaPath = path.join(CACHE_AUDIO_DIR, file);
                const audioPath = path.join(CACHE_AUDIO_DIR, file.replace('.meta.json', '.webm'));

                try {
                    const metaData = await fs.readFile(metaPath, 'utf-8');
                    const meta: AudioMetadata = JSON.parse(metaData);
                    const ageHours = (Date.now() - meta.timestamp) / (1000 * 60 * 60);

                    if (ageHours > CACHE_AUDIO_TTL_HOURS) {
                        const stats = await fs.stat(audioPath);
                        freedBytes += stats.size;

                        await fs.unlink(audioPath).catch((err) => logger.warn(`[cache] Failed to delete expired audio ${audioPath}: ${err.message}`));
                        await fs.unlink(metaPath).catch((err) => logger.warn(`[cache] Failed to delete expired meta ${metaPath}: ${err.message}`));
                        deletedFiles++;
                    }
                } catch {
                    // Corrupted metadata or missing audio file, delete both
                    await fs.unlink(audioPath).catch((err) => logger.warn(`[cache] Failed to delete corrupted audio ${audioPath}: ${err.message}`));
                    await fs.unlink(metaPath).catch((err) => logger.warn(`[cache] Failed to delete corrupted meta ${metaPath}: ${err.message}`));
                }
            }

            if (deletedFiles > 0) {
                logger.info(`[cache] Cleaned up ${deletedFiles} expired files (${(freedBytes / 1024 / 1024).toFixed(2)}MB freed)`);
            }
        } catch (error) {
            logger.error(`[cache] Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getCacheStats(): Promise<CacheStats> {
        await this.loadSearchCache();

        let audioCacheFiles = 0;
        let audioCacheSizeMB = 0;

        try {
            const files = await fs.readdir(CACHE_AUDIO_DIR);
            for (const file of files) {
                if (file.endsWith('.webm')) {
                    const filePath = path.join(CACHE_AUDIO_DIR, file);
                    const stats = await fs.stat(filePath);
                    audioCacheFiles++;
                    audioCacheSizeMB += stats.size / 1024 / 1024;
                }
            }
        } catch {
            // Directory doesn't exist yet
        }

        return {
            searchCacheSize: this.searchCache.size,
            audioCacheFiles,
            audioCacheSizeMB: Math.round(audioCacheSizeMB * 100) / 100,
        };
    }

    async getRandomCachedSong(): Promise<Song | null> {
        try {
            const files = await fs.readdir(CACHE_AUDIO_DIR);
            const metaFiles = files.filter(f => f.endsWith('.meta.json'));

            if (metaFiles.length === 0) return null;

            // Pick a random file
            const randomFile = metaFiles[Math.floor(Math.random() * metaFiles.length)];
            const metaPath = path.join(CACHE_AUDIO_DIR, randomFile);

            try {
                const metaData = await fs.readFile(metaPath, 'utf-8');
                const meta: AudioMetadata = JSON.parse(metaData);

                // Optimization: Use metadata directly if available (O(1))
                if (meta.title && meta.url) {
                    return {
                        title: meta.title,
                        url: meta.url,
                        durationInSec: meta.durationInSec || 0,
                        requestedBy: meta.requestedBy || "Radio",
                        fromCache: true
                    };
                }

                // Fallback: Try to find in search cache (O(N)) - Legacy support
                await this.loadSearchCache();
                for (const cached of this.searchCache.values()) {
                    if (cached.song.url.includes(meta.videoId)) {
                        return {
                            ...cached.song,
                            fromCache: true,
                            requestedBy: cached.song.requestedBy || "Unknown"
                        };
                    }
                }

                // Final Fallback
                return {
                    title: meta.searchTerms[0] || "Unknown Title",
                    url: `https://www.youtube.com/watch?v=${meta.videoId}`,
                    durationInSec: 0, // Unknown
                    requestedBy: "Radio",
                    fromCache: true
                };
            } catch (e) {
                logger.warn(`[cache] Failed to read meta file ${randomFile}: ${e}`);
                return null;
            }
        } catch (e) {
            logger.warn(`[cache] Failed to scan audio directory: ${e}`);
            return null;
        }
    }
}

// Singleton instance
let storageInstance: ICacheStorage | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Initialize cache directories and storage instance
 */
export async function initializeCache(): Promise<void> {
    if (!CACHE_ENABLED) {
        logger.info('[cache] Caching is disabled');
        return;
    }

    try {
        await fs.mkdir(CACHE_SEARCH_DIR, { recursive: true });
        await fs.mkdir(CACHE_AUDIO_DIR, { recursive: true });

        storageInstance = new FileCacheStorage();

        const stats = await storageInstance.getCacheStats();
        logger.info(`[cache] Initialized - Search: ${stats.searchCacheSize} entries, Audio: ${stats.audioCacheFiles} files (${stats.audioCacheSizeMB}MB)`);
    } catch (error) {
        logger.error(`[cache] Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Start background cleanup task
 */
export function startCacheCleanup(): void {
    if (!CACHE_ENABLED || cleanupInterval) return;

    const intervalMs = CACHE_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
    cleanupInterval = setInterval(async () => {
        if (storageInstance) {
            await storageInstance.cleanupExpiredCache();
        }
    }, intervalMs);

    logger.info(`[cache] Cleanup task scheduled every ${CACHE_CLEANUP_INTERVAL_HOURS} hour(s)`);
}

/**
 * Stop background cleanup task
 */
export function stopCacheCleanup(): void {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

/**
 * Get the cache storage instance
 */
export function getCacheStorage(): ICacheStorage | null {
    return storageInstance;
}

/**
 * Check if caching is enabled
 */
export function isCacheEnabled(): boolean {
    return CACHE_ENABLED && storageInstance !== null;
}
/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
    if (!storageInstance) {
        return {
            searchCacheSize: 0,
            audioCacheFiles: 0,
            audioCacheSizeMB: 0
        };
    }
    return storageInstance.getCacheStats();
}
