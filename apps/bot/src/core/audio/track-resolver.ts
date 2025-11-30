import { fetchVideoData, isUrl } from "./stream-handler.js";
import ytSearch from "yt-search";
import { isCacheEnabled, getCacheStorage } from "../cache-manager.js";
import { Song } from "@jasper/types";

export async function resolveTrack(query: string, requesterId?: string, requesterName?: string): Promise<Song> {
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

    // Feature 1: Direct URL support
    if (isUrl(query)) {
        try {
            const videoData = await fetchVideoData(query);
            return {
                title: videoData.title,
                url: videoData.webpage_url || videoData.url,
                durationInSec: videoData.duration,
                requestedBy: "Unknown", // Will be overwritten
                thumbnail: videoData.thumbnail,
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
