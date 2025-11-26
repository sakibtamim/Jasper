import { Readable } from 'stream';
import logger from './logger.js';
import { Song } from './audio/queue-manager.js';
import { DatabaseCacheStorage } from './cache/db-cache-storage.js';

// Cache configuration from environment
export const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true';
export const CACHE_SEARCH_TTL_HOURS = parseInt(process.env.CACHE_SEARCH_TTL_HOURS || '168', 10); // 7 days
export const CACHE_AUDIO_TTL_HOURS = parseInt(process.env.CACHE_AUDIO_TTL_HOURS || '72', 10); // 3 days
export const CACHE_CLEANUP_INTERVAL_HOURS = parseInt(process.env.CACHE_CLEANUP_INTERVAL_HOURS || '1', 10);


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
    getCachedSearchResult(query: string, requesterId?: string, requesterName?: string): Promise<Song | null>;
    setCachedSearchResult(query: string, song: Song): Promise<void>;

    // Audio file caching
    getCachedAudioStream(videoId: string, requesterId?: string, requesterName?: string): Promise<Readable | null>;
    cacheAudioStream(url: string, videoId: string, searchTerms: string[]): Promise<Readable>;

    // Cleanup and stats
    cleanupExpiredCache(): Promise<void>;
    getCacheStats(): Promise<CacheStats>;

    // Radio feature
    getRandomCachedSong(): Promise<Song | null>;

    // Management
    deleteCachedFile(videoId: string): Promise<boolean>;
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
        storageInstance = new DatabaseCacheStorage();

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
