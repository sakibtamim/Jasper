import { fetchVideoData, isUrl, isAttachmentUrl } from "./stream-handler.js";
import ytSearch from "yt-search";
import { isCacheEnabled, getCacheStorage } from "../cache-manager.js";
import { Song } from "@jasper/types";

/**
 * Resolve a file attachment to a Song object
 * 
 * NOTE: Discord CDN attachment URLs include authentication tokens and have
 * expiration times (typically 24 hours). If a song with an attachment URL
 * is queued for a long time, playback may fail when the URL expires.
 * For best results, play attachment files immediately rather than queuing
 * them in long playlists.
 */
export function resolveAttachment(
    url: string,
    filename: string,
    requesterId?: string,
    requesterName?: string
): Song {
    // Extract a cleaner title from filename (remove extension)
    const title = filename.replace(/\.[^/.]+$/, "") || filename;

    return {
        title,
        url,
        durationInSec: 0, // Unknown for attachments
        requestedBy: requesterName ?? "Unknown",
        requesterId,
        thumbnail: undefined,
        sourceType: 'attachment',
    };
}

export async function resolveTrack(query: string, requesterId?: string, requesterName?: string): Promise<Song> {
    // Check if it's a Discord attachment URL first
    if (isAttachmentUrl(query)) {
        // Extract filename from URL
        const urlParts = query.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0] || 'Unknown File';
        return resolveAttachment(query, filename, requesterId, requesterName);
    }

    // Check search cache first
    if (isCacheEnabled() && !isUrl(query)) {
        const storage = getCacheStorage();
        if (storage) {
            const cached = await storage.getCachedSearchResult(query, requesterId, requesterName);
            if (cached) {
                return cached;
            }
        }
    }

    // Feature 1: Direct URL support (YouTube)
    if (isUrl(query)) {
        try {
            const videoData = await fetchVideoData(query);
            return {
                title: videoData.title,
                url: videoData.webpage_url || videoData.url,
                durationInSec: videoData.duration,
                requestedBy: "Unknown", // Will be overwritten
                thumbnail: videoData.thumbnail,
                sourceType: 'youtube',
            };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to resolve URL: ${msg} `);
        }
    }

    const searchResult = await ytSearch(query);
    if (searchResult && searchResult.videos.length > 0) {
        const video = searchResult.videos[0];
        const track: Song = {
            title: video.title,
            url: video.url,
            durationInSec: video.seconds,
            requestedBy: "Unknown", // Will be overwritten
            thumbnail: video.thumbnail,
            sourceType: 'youtube',
        };

        // Cache the search result
        if (isCacheEnabled()) {
            const storage = getCacheStorage();
            if (storage) {
                await storage.setCachedSearchResult(query, track);
            }
        }

        return track;
    }
    throw new Error("No results found on YouTube.");
}
