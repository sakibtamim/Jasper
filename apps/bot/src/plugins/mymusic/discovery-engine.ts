import { Innertube, UniversalCache, ClientType } from 'youtubei.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { extractVideoIdFromUrl } from './utils.js';

export interface DiscoveryTrack {
    id: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    channel?: string;
}

export interface DiscoveryResult {
    tracks: DiscoveryTrack[];
    source: 'youtubei' | 'yt-dlp';
    error?: string;
}

export class DiscoveryEngine {
    private static innertubeCache: Map<string, Innertube> = new Map();

    /**
     * Generates a Proof of Origin (PO) Token.
     * currently stubbed as bgutils-js is missing.
     */
    private static async generatePoToken(logger?: any): Promise<string | null> {
        return null;
    }

    /**
     * Get or create an Innertube instance for a specific cookie profile.
     */
    private static async getInnertube(cookieHeader: string, userAgent?: string, logger?: any): Promise<Innertube> {
        // Simple in-memory cache key based on cookie and UA
        const cacheKey = cookieHeader + (userAgent || '');
        if (this.innertubeCache.has(cacheKey)) {
            if (logger) logger.info('[DiscoveryEngine] Using cached Innertube instance');
            return this.innertubeCache.get(cacheKey)!;
        }

        if (logger) {
            const maskedCookie = cookieHeader.length > 50
                ? cookieHeader.substring(0, 20) + '...' + cookieHeader.substring(cookieHeader.length - 20)
                : '***';
            logger.info(`[DiscoveryEngine] Creating Innertube with cookie: ${maskedCookie} (UA: ${userAgent || 'default'})`);
        }

        const poToken = await this.generatePoToken(logger);

        if (logger && poToken) {
            logger.info(`[DiscoveryEngine] Generated PO Token: ${poToken.substring(0, 10)}... (visitor_data: ${!!poToken})`);
        }

        const yt = await Innertube.create({
            cookie: cookieHeader,
            cache: new UniversalCache(false), // Disable persistent cache for now
            generate_session_locally: false, // IMPORTANT: False for robust session generation
            client_type: ClientType.MUSIC, // Use MUSIC client for MyMusic
            lang: 'en',
            location: 'US',
            retrieve_player: false, // We only need discovery, not playback
            visitor_data: poToken || undefined,
            // Pass UA if supported or fallback to internal
            // Note: If userAgent arg is provided, we assume caller wants to enforce it.
            // youtubei.js 1.4.x might not accept it directly in root config unless strictly typed.
            // Only add if types allow or ignore if we can't.
            // For now, we omit explicit userAgent property if typical types don't support it to avoid build errors.
        });

        if (logger) {
            logger.info(`[DiscoveryEngine] Innertube created. Logged in: ${yt.session.logged_in}`);
            if (yt.session.logged_in) {
                try {
                    // Try to get account info to verify identity
                    const info = await yt.account.getInfo();
                    if (info) {
                        const accountName = (info as any).account_name?.text || 'Unknown';
                        const channelTitle = (info as any).channel_title?.text || 'Unknown';
                        logger.info(`[DiscoveryEngine] Authenticated as: ${accountName} (Channel: ${channelTitle})`);
                    }
                } catch (e) {
                    logger.warn(`[DiscoveryEngine] Failed to get account info: ${e}`);
                    // Fallback: Try getGuide() to verify basic auth validity
                    try {
                        await yt.getGuide();
                        logger.info('[DiscoveryEngine] Account info failed, but getGuide() succeeded. Cookie is likely valid.');
                    } catch (guideError) {
                        logger.error(`[DiscoveryEngine] Auth check failed completely. Cookie might be invalid. Error: ${guideError}`);
                    }
                }
            } else {
                logger.warn('[DiscoveryEngine] Innertube reports NOT logged in! Personalization may fail.');
            }
        }

        this.innertubeCache.set(cacheKey, yt);
        return yt;
    }

    /**
     * Helper to save raw response to a file for debugging.
     */
    private static async saveDebugResponse(name: string, data: any, logger?: any) {
        try {
            const dir = path.join(process.cwd(), 'apps', 'bot', 'tmp', 'debug_responses');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${name}_${timestamp}.json`;
            const filepath = path.join(dir, filename);

            // Handle circular references if any, though youtubei.js responses usually clean?
            // Using a simple replacer just in case
            const json = JSON.stringify(data, (key, value) => {
                if (key === 'innertube_session') return '[Session]';
                return value;
            }, 2);

            fs.writeFileSync(filepath, json);
            if (logger) logger.info(`[DiscoveryEngine] Saved debug response to ${filepath}`);
        } catch (error) {
            if (logger) logger.error(`[DiscoveryEngine] Failed to save debug response: ${error}`);
        }
    }

    /**
     * Helper to find "Did You Mean" correction.
     */
    private static findDidYouMean(source: any): string | null {
        let found: string | null = null;
        const traverse = (node: any) => {
            if (found || !node) return;
            if (node.type === 'DidYouMean' && node.corrected_query?.text) {
                found = node.corrected_query.text;
                return;
            }
            if (Array.isArray(node)) {
                node.forEach(traverse);
            } else if (typeof node === 'object') {
                ['contents', 'items', 'sections'].forEach(key => {
                    if (node[key]) traverse(node[key]);
                });
            }
        };
        traverse(source);
        return found;
    }

    /**
     * Helper to find FeedNudge (empty state message).
     */
    private static findFeedNudge(source: any): string | null {
        let found: string | null = null;
        const traverse = (node: any) => {
            if (found || !node) return;
            if (node.type === 'FeedNudge' && node.title?.text) {
                found = node.title.text;
                return;
            }
            if (Array.isArray(node)) {
                node.forEach(traverse);
            } else if (typeof node === 'object') {
                ['contents', 'items', 'sections', 'content'].forEach(key => {
                    if (node[key]) traverse(node[key]);
                });
            }
        };
        traverse(source);
        return found;
    }

    /**
     * Helper to recursively extract items from a response structure.
     * Flattens Sections, Shelves, etc. into a list of leaf items.
     */
    private static extractItems(source: any, logger?: any): any[] {
        const items: any[] = [];
        const seen = new Set<string>();

        const traverse = (node: any, depth: number) => {
            if (!node || depth > 15) return; // Safety limit

            // If it's an array, traverse elements
            if (Array.isArray(node)) {
                node.forEach(i => traverse(i, depth));
                return;
            }

            // Check if it's a valid item (has ID)
            const id = node.id || node.videoId || node.video_id;
            if (id && typeof id === 'string') {
                if (!seen.has(id)) {
                    seen.add(id);
                    items.push(node);
                }
                // Continue traversing children just in case (e.g. playlist with items)
            }

            // Check for known container properties
            // We traverse these keys to find nested items
            const keys = ['contents', 'items', 'sections', 'tabs', 'content', 'gridContents', 'results'];

            for (const key of keys) {
                if (node[key]) {
                    // if (logger && depth < 2) logger.info(`[DiscoveryEngine] extractItems traversing ${key} at depth ${depth}`);
                    traverse(node[key], depth + 1);
                }
            }
        };

        traverse(source, 0);
        return items;
    }

    /**
     * Search for music.
     */
    static async discoverSearch(
        term: string,
        limit: number,
        radio: boolean,
        cookieHeader: string,
        userAgent?: string,
        logger?: any
    ): Promise<DiscoveryResult> {
        try {
            if (logger) logger.info(`[DiscoveryEngine] discoverSearch: term="${term}", radio=${radio}`);
            const yt = await this.getInnertube(cookieHeader, userAgent, logger);
            const tracks: DiscoveryTrack[] = [];

            if (term.startsWith('http')) {
                // URL handling
                const id = extractVideoIdFromUrl(term);
                if (id) {
                    if (radio) {
                        // Radio from video ID
                        const mix = await yt.music.getUpNext(id);
                        // The mix items are in mix.items
                        // We need to check the structure of mix.items
                        // It usually returns a list of nodes.
                        // We'll need to iterate and extract IDs.
                        // Note: getUpNext might return different structures depending on version.
                        // Using getRelated might be safer? 
                        // YOUTUBEI-JS_ANALYSIS.md says: "getUpNext(videoId)" returns a PlaylistPanel.

                        if (mix && mix.contents) {
                            // mix.contents is usually an array of PlaylistPanelVideo
                            const contents = mix.contents as any[];
                            contents.forEach(item => {
                                if (item.video_id) {
                                    tracks.push({
                                        id: item.video_id,
                                        title: item.title?.text || item.title || 'Unknown Title',
                                        thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                                        duration: item.duration?.seconds,
                                        channel: item.author?.name || item.artists?.[0]?.name
                                    });
                                }
                            });
                        }
                    } else {
                        // Single video
                        // We need to fetch video details if possible, or just use minimal info
                        // For now, minimal info is fine, or we could fetch basic info
                        tracks.push({
                            id: id,
                            title: 'Loading...', // We don't have title here without fetching
                            thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
                            channel: 'Unknown'
                        });
                    }
                } else if (term.includes('list=')) {
                    // Playlist URL
                    // We can use yt.getPlaylist(id)
                    const listId = term.match(/list=([a-zA-Z0-9_-]+)/)?.[1];
                    if (listId) {
                        const playlist = await yt.getPlaylist(listId);
                        if (playlist.items) {
                            playlist.items.forEach(item => {
                                // @ts-ignore
                                if (item.id) {
                                    tracks.push({
                                        id: (item as any).id,
                                        title: (item as any).title?.text || (item as any).title || 'Unknown Title',
                                        thumbnail: (item as any).thumbnail?.contents?.[0]?.url || (item as any).thumbnails?.[0]?.url,
                                        duration: (item as any).duration?.seconds,
                                        channel: (item as any).author?.name || (item as any).artists?.[0]?.name
                                    });
                                }
                            });
                        }
                    }
                }
            } else {
                // Text search
                const search = await yt.music.search(term, { type: 'song' }) as any;

                await this.saveDebugResponse('search', search, logger);

                if (logger) {
                    logger.info(`[DiscoveryEngine] discoverSearch raw response keys: ${Object.keys(search).join(', ')}`);
                }

                const allItems = this.extractItems(search, logger);
                if (logger) logger.info(`[DiscoveryEngine] discoverSearch extracted ${allItems.length} items`);

                allItems.forEach(item => {
                    const id = item.id || item.videoId || item.video_id;
                    if (id) {
                        tracks.push({
                            id: id,
                            title: item.title?.text || item.title || 'Unknown Title',
                            thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                            duration: item.duration?.seconds,
                            channel: item.author?.name || item.artists?.[0]?.name
                        });
                    }
                });

                if (logger) logger.info(`[DiscoveryEngine] discoverSearch found ${tracks.length} valid tracks`);

                // Handle DidYouMean if no tracks found
                if (tracks.length === 0) {
                    const didYouMean = this.findDidYouMean(search);
                    if (didYouMean) {
                        if (logger) logger.info(`[DiscoveryEngine] discoverSearch: No results, but found DidYouMean: "${didYouMean}". Retrying...`);
                        return this.discoverSearch(didYouMean, limit, radio, cookieHeader, userAgent, logger);
                    }
                }

                if (radio && tracks.length > 0) {
                    // Radio from first result
                    const seedId = tracks[0].id;
                    tracks.length = 0; // Clear list

                    if (logger) logger.info(`[DiscoveryEngine] discoverSearch: Starting radio from seed ${seedId}`);
                    const mix = await yt.music.getUpNext(seedId);

                    const mixItems = this.extractItems(mix, logger);
                    if (logger) logger.info(`[DiscoveryEngine] discoverSearch: Radio mix extracted ${mixItems.length} items`);

                    mixItems.forEach(item => {
                        const id = item.id || item.videoId || item.video_id;
                        if (id) {
                            tracks.push({
                                id: id,
                                title: item.title?.text || item.title || 'Unknown Title',
                                thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                                duration: item.duration?.seconds,
                                channel: item.author?.name || item.artists?.[0]?.name
                            });
                        }
                    });
                }
            }

            return {
                tracks: tracks.slice(0, limit),
                source: 'youtubei'
            };

        } catch (error) {
            if (logger) logger.error(`[DiscoveryEngine] discoverSearch error: ${error}`);
            // Fallback disabled for debugging
            // return this.fallbackSearch(term, limit, radio, cookieHeader, error as Error);
            return { tracks: [], source: 'youtubei', error: (error as Error).message };
        }
    }

    static async discoverSupermix(limit: number, cookieHeader: string, userAgent?: string, logger?: any): Promise<DiscoveryResult> {
        try {
            const yt = await this.getInnertube(cookieHeader, userAgent, logger);
            // Use getHomeFeed or similar.
            // YOUTUBEI-JS_ANALYSIS.md says: "getHomeFeed()" returns generic home feed.
            // "music.getHomeFeed()" returns Music home.
            // "music.getHomeFeed()" returns Music home.
            const home = await yt.music.getHomeFeed();
            if (logger) logger.info('[DiscoveryEngine] discoverSupermix: Fetched home feed');

            await this.saveDebugResponse('supermix', home, logger);

            const tracks: DiscoveryTrack[] = [];

            // We need to traverse sections to find "Quick picks" or "Supermix" or just grab songs.
            // This is complex structure traversal.
            // Simplified: grab all MusicResponsiveListItem with video_id.

            if (home.sections) {
                if (logger) logger.info(`[DiscoveryEngine] discoverSupermix: Found ${home.sections.length} sections`);
                home.sections.forEach((section, index) => {
                    const s = section as any;
                    if (s.contents) {
                        const contents = s.contents as any[];
                        if (logger) logger.info(`[DiscoveryEngine] Section ${index}: ${contents.length} items. Title: ${s.title?.text || 'No Title'}`);

                        // Log first item keys to understand structure
                        if (contents.length > 0 && index === 0 && logger) {
                            logger.info(`[DiscoveryEngine] Sample item keys: ${Object.keys(contents[0]).join(', ')}`);
                            logger.info(`[DiscoveryEngine] Sample item type: ${contents[0].type}`);
                        }

                        contents.forEach(item => {
                            // Also check item_type if available (usually 'song' or 'video')
                            if (item.id) {
                                tracks.push({
                                    id: item.id,
                                    title: item.title?.text || item.title || 'Unknown Title',
                                    thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                                    duration: item.duration?.seconds,
                                    channel: item.author?.name || item.artists?.[0]?.name
                                });
                            }
                            else if (item.video_id) {
                                tracks.push({
                                    id: item.video_id,
                                    title: item.title?.text || item.title || 'Unknown Title',
                                    thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                                    duration: item.duration?.seconds,
                                    channel: item.author?.name || item.artists?.[0]?.name
                                });
                            }
                            else if (item.videoId) {
                                tracks.push({
                                    id: item.videoId,
                                    title: item.title?.text || item.title || 'Unknown Title',
                                    thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                                    duration: item.duration?.seconds,
                                    channel: item.author?.name || item.artists?.[0]?.name
                                });
                            }
                        });
                    } else {
                        if (logger) logger.info(`[DiscoveryEngine] Section ${index} has no contents`);
                    }
                });
            } else {
                if (logger) logger.warn('[DiscoveryEngine] discoverSupermix: No sections found in home feed');
            }

            return {
                tracks: tracks.slice(0, limit),
                source: 'youtubei'
            };
        } catch (error) {
            if (logger) logger.error(`[DiscoveryEngine] discoverSupermix error: ${error}`);
            // Fallback disabled for debugging
            // return this.fallbackYtDlp(':ytrec', limit, cookieHeader, error as Error);
            return { tracks: [], source: 'youtubei', error: (error as Error).message };
        }
    }

    static async discoverMix(number: number, limit: number, cookieHeader: string, userAgent?: string, logger?: any): Promise<DiscoveryResult> {
        try {
            const yt = await this.getInnertube(cookieHeader, userAgent, logger);
            // Search for "My Mix N"
            if (logger) logger.info(`[DiscoveryEngine] discoverMix: Searching for "My Mix ${number}"`);
            const search = await yt.music.search(`My Mix ${number}`, { type: 'playlist' }) as any;

            await this.saveDebugResponse(`mix_${number}`, search, logger);

            if (logger) {
                logger.info(`[DiscoveryEngine] discoverMix search response keys: ${Object.keys(search).join(', ')}`);
            }

            const tracks: DiscoveryTrack[] = [];
            const allItems = this.extractItems(search, logger);

            if (logger) logger.info(`[DiscoveryEngine] discoverMix extracted ${allItems.length} items from search`);

            if (allItems.length > 0) {
                const firstResult = allItems[0];
                const id = firstResult.id || firstResult.videoId || firstResult.video_id;

                if (id) {
                    // Fetch playlist items
                    // @ts-ignore
                    const playlist = await yt.getPlaylist(id);
                    if (logger) logger.info(`[DiscoveryEngine] discoverMix: Fetched playlist ${id}`);

                    const playlistItems = this.extractItems(playlist, logger);
                    if (logger) logger.info(`[DiscoveryEngine] discoverMix: Extracted ${playlistItems.length} items from playlist`);

                    playlistItems.forEach(item => {
                        const id = item.id || item.videoId || item.video_id;
                        if (id) {
                            tracks.push({
                                id: id,
                                title: item.title?.text || item.title || 'Unknown Title',
                                thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                                duration: item.duration?.seconds,
                                channel: item.author?.name || item.artists?.[0]?.name
                            });
                        }
                    });
                }
            }

            if (tracks.length === 0) throw new Error("No mix found");

            return {
                tracks: tracks.slice(0, limit),
                source: 'youtubei'
            };
        } catch (error) {
            if (logger) logger.error(`[DiscoveryEngine] discoverMix error: ${error} `);
            // Fallback disabled for debugging
            // return this.fallbackSearch(`My Mix ${number}`, limit, false, cookieHeader, error as Error);
            return { tracks: [], source: 'youtubei', error: (error as Error).message };
        }
    }

    static async discoverHistory(limit: number, cookieHeader: string, userAgent?: string, logger?: any): Promise<DiscoveryResult> {
        try {
            const yt = await this.getInnertube(cookieHeader, userAgent, logger);
            const history = await yt.getHistory();

            await this.saveDebugResponse('history', history, logger);

            if (logger) {
                logger.info(`[DiscoveryEngine] discoverHistory response keys: ${Object.keys(history).join(', ')}`);
            }

            const allItems = this.extractItems(history, logger);
            if (logger) logger.info(`[DiscoveryEngine] discoverHistory extracted ${allItems.length} items`);

            const tracks: DiscoveryTrack[] = [];
            allItems.forEach(item => {
                const id = item.id || item.videoId || item.video_id;
                if (id) {
                    tracks.push({
                        id: id,
                        title: item.title?.text || item.title || 'Unknown Title',
                        thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                        duration: item.duration?.seconds,
                        channel: item.author?.name || item.artists?.[0]?.name
                    });
                }
            });

            return {
                tracks: tracks.slice(0, limit),
                source: 'youtubei'
            };

        } catch (error) {
            if (logger) logger.error(`[DiscoveryEngine] discoverHistory error: ${error}`);
            return { tracks: [], source: 'youtubei', error: (error as Error).message };
        }
    }

    static async discoverRecommended(limit: number, cookieHeader: string, userAgent?: string, logger?: any): Promise<DiscoveryResult> {
        // Similar to Supermix but maybe using main YouTube home feed?
        // Or just alias to Supermix for now.
        // Prompt says: "Call home/recommended feed (not necessarily music-only)"
        try {
            const yt = await this.getInnertube(cookieHeader, userAgent, logger);
            const home = await yt.getHomeFeed();

            await this.saveDebugResponse('recommended', home, logger);

            if (logger) {
                logger.info(`[DiscoveryEngine] discoverRecommended home keys: ${Object.keys(home).join(', ')} `);
            }

            const tracks: DiscoveryTrack[] = [];
            const allItems = this.extractItems(home, logger);

            if (logger) logger.info(`[DiscoveryEngine] discoverRecommended extracted ${allItems.length} items`);

            allItems.forEach(item => {
                const id = item.id || item.videoId || item.video_id;
                if (id) {
                    tracks.push({
                        id: id,
                        title: item.title?.text || item.title || 'Unknown Title',
                        thumbnail: item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url,
                        duration: item.duration?.seconds,
                        channel: item.author?.name || item.artists?.[0]?.name
                    });
                }
            });

            if (tracks.length === 0) {
                // Check for FeedNudge (empty state)
                const nudge = this.findFeedNudge(home);
                if (nudge) {
                    if (logger) logger.warn(`[DiscoveryEngine] discoverRecommended: Feed is empty.Nudge: "${nudge}"`);
                    return {
                        tracks: [],
                        source: 'youtubei',
                        error: `No recommendations yet.${nudge} `
                    };
                }
            }

            return {
                tracks: tracks.slice(0, limit),
                source: 'youtubei'
            };
        } catch (error) {
            if (logger) logger.error(`[DiscoveryEngine] discoverRecommended error: ${error} `);
            // Fallback disabled for debugging
            // return this.fallbackYtDlp(':ytrec', limit, cookieHeader, error as Error);
            return { tracks: [], source: 'youtubei', error: (error as Error).message };
        }
    }

    static async discoverFeed(limit: number, cookieHeader: string, userAgent?: string, logger?: any): Promise<DiscoveryResult> {
        // Same as recommended but maybe different logging
        return this.discoverRecommended(limit, cookieHeader, userAgent, logger);
    }

    // --- Fallback Logic ---

    private static async fallbackSearch(
        term: string,
        limit: number,
        radio: boolean,
        cookieHeader: string,
        originalError: Error
    ): Promise<DiscoveryResult> {
        let url = term;
        if (!term.startsWith('http')) {
            if (radio) {
                // We need to find a seed first
                const seedRes = await this.runYtDlp(`ytsearch1:${term} `, cookieHeader, 1);
                if (seedRes.length === 0) return { tracks: [], source: 'yt-dlp', error: 'No results' };
                const seedId = seedRes[0].id;
                url = `https://www.youtube.com/watch?v=${seedId}&list=RD${seedId}`;
            } else {
                url = `ytsearch${limit}:${term}`;
            }
        } else if (radio) {
            const id = extractVideoIdFromUrl(term);
            if (id) url = `https://www.youtube.com/watch?v=${id}&list=RD${id}`;
        }

        const items = await this.runYtDlp(url, cookieHeader, limit);
        return {
            tracks: items.map(i => ({
                id: i.id,
                title: i.title,
                thumbnail: i.thumbnail,
                duration: i.duration,
                channel: i.uploader
            })),
            source: 'yt-dlp',
            error: originalError.message
        };
    }

    private static async fallbackYtDlp(
        url: string,
        limit: number,
        cookieHeader: string,
        originalError: Error
    ): Promise<DiscoveryResult> {
        const items = await this.runYtDlp(url, cookieHeader, limit);
        return {
            tracks: items.map(i => ({
                id: i.id,
                title: i.title,
                thumbnail: i.thumbnail,
                duration: i.duration,
                channel: i.uploader
            })),
            source: 'yt-dlp',
            error: originalError.message
        };
    }

    private static async runYtDlp(url: string, cookieHeader: string, limit: number): Promise<any[]> {
        // We need to write cookie to a temp file because yt-dlp expects a file
        // Or we can pass --add-header "Cookie: ..." but that's flaky with yt-dlp sometimes.
        // Best to write to temp file.
        // But we don't have easy access to temp dir writing here without context.
        // We'll assume we can write to /tmp or similar.
        // Actually, we can use process.cwd() + '/temp_cookies'

        const tempCookiePath = path.join(process.cwd(), `temp_cookie_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
        // Netscape format is safer for yt-dlp
        // We need to convert header to Netscape if possible, or just try header?
        // yt-dlp supports --cookies-from-browser or --cookies file.
        // If we have a header string, we can try to format it as Netscape.
        // Or just use --add-header "Cookie: ..."

        // Let's try --add-header first as it avoids file IO.
        // "Cookie: " + cookieHeader

        const args = [
            '--dump-json',
            '--flat-playlist',
            '--no-warnings',
            '--add-header', `Cookie:${cookieHeader}`,
            '--playlist-end', limit.toString(),
            url
        ];

        const ytDlpPath = this.findYtDlpPath() || 'yt-dlp';
        console.log(`[DiscoveryEngine] runYtDlp: ${ytDlpPath} ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const child = spawn(ytDlpPath, args);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => stdout += data.toString());
            child.stderr.on('data', (data) => stderr += data.toString());

            child.on('close', (code) => {
                if (code !== 0) {
                    console.error('[DiscoveryEngine] runYtDlp failed:', stderr);
                    resolve([]); // Return empty on failure
                } else {
                    const items = stdout.trim().split('\n').map(line => {
                        try { return JSON.parse(line); } catch { return null; }
                    }).filter(Boolean);
                    resolve(items);
                }
            });
        });
    }

    private static findYtDlpPath(): string | null {
        // Simplified check
        if (fs.existsSync(path.join(process.cwd(), 'yt-dlp'))) return path.join(process.cwd(), 'yt-dlp');
        if (fs.existsSync(path.join(process.cwd(), 'apps/bot/yt-dlp'))) return path.join(process.cwd(), 'apps/bot/yt-dlp');
        return null;
    }
}
