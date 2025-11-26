import { Readable, PassThrough } from 'stream';
import { createWriteStream, createReadStream } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import logger from '../logger.js';
import { Song } from '../audio/queue-manager.js';
import { ICacheStorage, CacheStats, CACHE_AUDIO_TTL_HOURS, CACHE_SEARCH_TTL_HOURS } from '../cache-manager.js';
import { getDatabase } from '../db/index.js';
import { getYtDlpPath } from '../audio/stream-handler.js';
import { getBaseYtDlpArgs } from '../../utils/yt-dlp-helper.js';

const CACHE_AUDIO_DIR = path.join(process.cwd(), 'cache', 'audio');

/**
 * Database-backed cache storage implementation
 * Uses database for metadata, filesystem for audio files
 */
export class DatabaseCacheStorage implements ICacheStorage {
    async getCachedSearchResult(query: string, requesterId?: string, requesterName?: string): Promise<Song | null> {
        const db = getDatabase();
        const result = await db.getCachedSearchResult(query);

        if (!result) return null;

        logger.info(`[cache] Search hit for: ${query}`);

        if (requesterId && requesterName) {
            // Track cache hit
            db.trackCacheHit(requesterId, requesterName, 'user').catch(err =>
                logger.warn(`[cache] Failed to track search hit: ${err}`)
            );
        }

        return {
            title: result.songTitle,
            url: result.songUrl,
            durationInSec: result.duration,
            requestedBy: "Unknown",
            thumbnail: result.thumbnail,
            fromCache: true
        };
    }

    async setCachedSearchResult(query: string, song: Song): Promise<void> {
        const db = getDatabase();
        await db.setCachedSearchResult(
            query,
            song.title,
            song.url,
            song.durationInSec,
            song.thumbnail,
            CACHE_SEARCH_TTL_HOURS
        );
        logger.info(`[cache] Cached search result for: ${query}`);
    }

    async getCachedAudioStream(videoId: string, requesterId?: string, requesterName?: string): Promise<Readable | null> {
        const audioPath = path.join(CACHE_AUDIO_DIR, `${videoId}.webm`);

        try {
            // Check if file exists
            await fs.access(audioPath);

            // Check database metadata for expiration
            const db = getDatabase();
            const metadata = await db.getAudioMetadata(videoId);

            if (!metadata) {
                // Expired or missing metadata, delete orphaned file
                await fs.unlink(audioPath).catch((err) => {
                    logger.warn(`[cache] Failed to delete orphaned file ${audioPath}: ${err.message}`);
                });
                return null;
            }

            // Return read stream
            logger.info(`[cache] Audio cache hit for video: ${videoId}`);

            if (requesterId && requesterName) {
                // Track cache hit
                // If requester is "Radio", it's a bot hit
                const type = requesterName.startsWith('Radio') ? 'bot' : 'user';
                // For bot hits, we might want to use the bot name as entityName if possible, 
                // but here we just use what's passed.
                db.trackCacheHit(requesterId, requesterName, type).catch(err =>
                    logger.warn(`[cache] Failed to track audio hit: ${err}`)
                );
            }

            return createReadStream(audioPath);
        } catch {
            logger.warn(`[cache] Failed to read cached audio ${videoId}`);
            return null;
        }
    }

    async cacheAudioStream(url: string, videoId: string, searchTerms: string[]): Promise<Readable> {
        logger.info(`[cache] Audio cache miss, downloading: ${url}`);

        // Ensure directory exists
        await fs.mkdir(CACHE_AUDIO_DIR, { recursive: true });

        const audioPath = path.join(CACHE_AUDIO_DIR, `${videoId}.webm`);

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

        // Track size for logging
        let totalBytes = 0;
        let hasError = false;

        ytDlpProcess.stdout!.on('data', (chunk: Buffer) => {
            fileStream.write(chunk);
            totalBytes += chunk.length;
            passThrough.write(chunk);
        });

        ytDlpProcess.stdout!.on('end', () => {
            fileStream.end();
            passThrough.end();
        });

        // Handle process exit
        ytDlpProcess.on('close', async (code) => {
            if (code !== 0 && !hasError) {
                logger.error(`[cache] yt-dlp exited with code ${code} for: ${url}`);
                hasError = true;
                await fs.unlink(audioPath).catch((err) => {
                    logger.warn(`[cache] Failed to delete partial file ${audioPath}: ${err.message}`);
                });
            } else if (code === 0 && !hasError) {
                // Success: save metadata to database
                try {
                    const db = getDatabase();
                    await db.setAudioMetadata(
                        videoId,
                        searchTerms[0] || 'Unknown',
                        url,
                        0, // Duration unknown here
                        undefined,
                        searchTerms,
                        CACHE_AUDIO_TTL_HOURS
                    );
                    logger.info(`[cache] Cached audio for video: ${videoId} (${(totalBytes / 1024 / 1024).toFixed(2)}MB)`);
                } catch (err) {
                    logger.error(`[cache] Failed to save metadata for ${videoId}: ${err instanceof Error ? err.message : String(err)}`);
                    await fs.unlink(audioPath).catch((err) => {
                        logger.warn(`[cache] Failed to delete file after metadata error ${audioPath}: ${err.message}`);
                    });
                }
            }
        });

        ytDlpProcess.on('error', async (err) => {
            logger.error(`[cache] yt-dlp error during caching: ${err.message}`);
            hasError = true;
            passThrough.destroy(err);
            fileStream.destroy();
            await fs.unlink(audioPath).catch(() => { });
        });

        return passThrough;
    }

    async cleanupExpiredCache(): Promise<void> {
        logger.info('[cache] Running cleanup...');

        const db = getDatabase();
        await db.cleanupExpiredCache();

        // Note: Audio files are not automatically deleted by this method
        // They will be deleted when accessed if their metadata has expired
    }

    async getCacheStats(): Promise<CacheStats> {
        const db = getDatabase();
        const dbStats = await db.getCacheStats();

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
            searchCacheSize: dbStats.searchCacheSize,
            audioCacheFiles,
            audioCacheSizeMB: Math.round(audioCacheSizeMB * 100) / 100,
        };
    }

    async getRandomCachedSong(): Promise<Song | null> {
        const db = getDatabase();
        const metadata = await db.getRandomCachedSong();

        if (!metadata) return null;

        return {
            title: metadata.title,
            url: metadata.url,
            durationInSec: metadata.duration,
            requestedBy: "Radio",
            thumbnail: metadata.thumbnail,
            fromCache: true
        };
    }

    async deleteCachedFile(videoId: string): Promise<boolean> {
        const audioPath = path.join(CACHE_AUDIO_DIR, `${videoId}.webm`);
        try {
            await fs.unlink(audioPath);
            logger.info(`[cache] Deleted cached file: ${audioPath}`);
            return true;
        } catch (error) {
            logger.warn(`[cache] Failed to delete file ${audioPath}: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
}
