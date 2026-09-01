import { ChildProcess, spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { Readable } from 'stream';

import { findYtDlpPath, getBaseYtDlpArgs } from '../../utils/yt-dlp-helper.js';
import cookieManager from '../cookies/cookie-manager.js';
import logger from '../logger.js';

// Helper: Get the path to the local yt-dlp.exe
export function getYtDlpPath(): string {
    const path = findYtDlpPath();
    if (path) return path;

    // If nothing was found, throw an informative error
    throw new Error(
        'yt-dlp not found. Please install yt-dlp and ensure it is on your PATH, or add a static yt-dlp binary next to the app.',
    );
}

export function isYoutubeUrl(text: string): boolean {
    return text.includes('youtube.com') || text.includes('youtu.be');
}

export function isUrl(text: string): boolean {
    try {
        new URL(text);
        return true;
    } catch {
        return false;
    }
}

export function isAttachmentUrl(text: string): boolean {
    // Check for Discord attachment domains
    if (
        text.includes('cdn.discordapp.com/attachments') ||
        text.includes('media.discordapp.net/attachments') ||
        text.includes('cdn.discord.com/attachments')
    ) {
        return true;
    }

    // Also check for direct file extensions if it is a valid URL
    if (isUrl(text)) {
        try {
            const url = new URL(text);
            const pathname = url.pathname.toLowerCase();
            // Common audio extensions
            const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.webm', '.opus'];
            return AUDIO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
        } catch {
            return false;
        }
    }

    return false;
}

export interface VideoData {
    id?: string;
    title: string;
    url: string;
    webpage_url?: string;
    duration: number;
    thumbnail?: string;
    [key: string]: unknown;
}

export interface PlaylistData {
    id?: string;
    title: string;
    url?: string;
    duration?: number;
    entries?: VideoData[];
    _type?: string;
    [key: string]: unknown;
}

export function fetchVideoData(url: string): Promise<VideoData> {
    return cookieManager.withCookieRetry(async (cookiePath) => {
        return new Promise((resolve, reject) => {
            const ytDlpPath = getYtDlpPath();
            // -J: Dump JSON metadata
            const args = [...getBaseYtDlpArgs(), '-J', url];

            if (cookiePath) {
                args.push('--cookies', cookiePath);
            }

            const process = spawn(ytDlpPath, args);
            let data = '';
            let error = '';

            process.stdout.on('data', (chunk) => (data += chunk));
            process.stderr.on('data', (chunk) => (error += chunk));

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`yt-dlp failed: ${error}`));
                } else {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch {
                        reject(new Error('Failed to parse video JSON'));
                    }
                }
            });
        });
    });
}

export function fetchPlaylistData(url: string): Promise<PlaylistData> {
    return cookieManager.withCookieRetry(async (cookiePath) => {
        return new Promise((resolve, reject) => {
            const ytDlpPath = getYtDlpPath();
            const args = [...getBaseYtDlpArgs(), '--flat-playlist', '-J', url];

            if (cookiePath) {
                args.push('--cookies', cookiePath);
            }

            const process = spawn(ytDlpPath, args);
            let data = '';
            let error = '';

            process.stdout.on('data', (chunk) => (data += chunk));
            process.stderr.on('data', (chunk) => (error += chunk));

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`yt-dlp failed: ${error}`));
                } else {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch {
                        reject(new Error('Failed to parse playlist JSON'));
                    }
                }
            });
        });
    });
}

export function createStreamProcess(url: string, seekSeconds: number = 0): ChildProcess {
    const ytDlpPath = getYtDlpPath();
    const args = [...getBaseYtDlpArgs()];

    if (seekSeconds > 0) {
        args.push('--download-sections', `*${seekSeconds}-`);
    }

    args.push('-f', 'bestaudio', '-o', '-', '-q', url);
    const process = spawn(ytDlpPath, args);

    process.on('error', (err) => {
        logger.error(`Failed to spawn yt-dlp: ${err.message}`);
    });

    return process;
}

/**
 * Create a child process streaming audio via ffmpeg starting at a specific offset.
 * Outputs raw PCM 16-bit little-endian stereo 48000Hz (matching Discord voice format).
 */
export function createFfmpegSeekStream(
    inputPathOrUrl: string,
    seekSeconds: number = 0,
): ChildProcess {
    const ffmpeg = (ffmpegPath as unknown as string) || 'ffmpeg';
    const args: string[] = [];

    if (seekSeconds > 0) {
        args.push('-ss', String(seekSeconds));
    }

    args.push(
        '-i',
        inputPathOrUrl,
        '-f',
        's16le',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-loglevel',
        'error',
        'pipe:1',
    );

    const process = spawn(ffmpeg, args);

    process.on('error', (err) => {
        logger.error(`[ffmpeg] Failed to spawn seek stream process: ${err.message}`);
    });

    return process;
}

/**
 * Create a readable stream from a direct URL (like Discord CDN attachments)
 */
export async function createDirectUrlStream(url: string): Promise<Readable> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
    }
    if (!response.body) {
        throw new Error('Response body is empty');
    }
    // Convert web ReadableStream to Node.js Readable
    return Readable.fromWeb(response.body as import('stream/web').ReadableStream);
}
