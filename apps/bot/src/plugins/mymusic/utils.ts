/**
 * Extracts video ID from a YouTube URL using YT-DLP's canonical formats.
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, music.youtube.com/watch?v=ID
 * 
 * @param url - YouTube video URL
 * @returns 11-character video ID or null if not found
 */
export function extractVideoIdFromUrl(url: string): string | null {
    // Match patterns: v=ID, /ID (for youtu.be), watch?v=ID
    const match = url.match(/(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}
