/**
 * MyMusic Plugin - Personalized Music Experience
 * 
 * Provides per-user YouTube cookie management for personalized playback features.
 * Uses YT-DLP extractors for search, mixes, and radio playlists.
 * MyMusic Plugin for Jasper Bot
 * 
 * Provides personalized YouTube Music playback using authenticated cookies.
 * 
 * === MANUAL VERIFICATION CHECKLIST ===
 * 
 * 1. Multi-Track Search (radio=false):
 *    `/mymusic search term:"lofi hip hop" limit:10 profile:<name>`
 *    - ✅ Should queue 10 tracks (not just 1)
 *    - ✅ Verify log shows "Got 10 entries"
 * 
 * 2. Radio Mode (radio=true):
 *    `/mymusic search term:"jazz" radio:true limit:15 profile:<name>`
 *    - ✅ Should resolve seed video
 *    - ✅ Should queue 15 tracks from RD<videoId> mix
 *    - ✅ Verify log shows mix URL construction
 * 
 * 3. Supermix (redesigned with :ytrec):
 *    `/mymusic supermix profile:<name> limit:20`
 *    - ✅ Uses :ytrec (recommendations), NOT RDMM
 *    - ✅ Should queue up to 20 recommended tracks
 *    - ✅ Verify log shows ":ytrec"
 * 
 * 4. Numbered Mix:
 *    `/mymusic mix number:1 profile:<name> limit:15`
 *    - ✅ Should use search→radio pattern for My Mix 1
 *    - ✅ Should queue 15 tracks (not just 1)
 *    - ✅ Gracefully handle non-existent mix numbers
 * 
 * 5. Recommended:
 *    `/mymusic recommended profile:<name> limit:25`
 *    - ✅ Should queue 25 personalized tracks
 *    - ✅ Uses same :ytrec as supermix
 * 
 * 6. Feed (Debug):
 *    `/mymusic feed profile:<name>`
 *    - ✅ Should queue default 25 tracks from feed
 *    - ✅ Logs should show "[MyMusic:Feed]"
 * 
 * 7. Cookie Validation:
 *    `/mymusic cookie add file:<valid.txt>`
 *    - ✅ Valid cookies: status=valid
 *    - ✅ Missing auth cookies (LOGIN_INFO/SAPISID): warning + status=suspected_broken
 *    - ✅ Empty/malformed file: rejected with clear error
 * 
 * 8. Profile Autocomplete:
 *    Start typing in profile field
 *    - ✅ Shows profile names with play count
 *    - ✅ Shows health status (✓ or ⚠️)
 *    - ✅ Filters as you type
 * 
 * 9. Web Dashboard:
 *    Open dashboard, navigate to MyMusic page
 *    - ✅ Shows status/lastError fields
 *    - ✅ Never exposes cookieContent in API response
 *    - ✅ Network tab shows only safe metadata
 * 
 * 10. Telemetry:
 *     Check server logs after commands
 *     - ✅ [MyMusic:Telemetry] events logged
 *     - ✅ User IDs anonymized (first 8 chars + ...)
 *     - ✅ No raw cookie values in logs
 */

import { Plugin, PluginContext } from "@jasper/types";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

interface CookieProfile {
    id: string;
    name: string;
    content: string; // Netscape format cookie content (never log this!)
    createdAt: number;
    lastUsedAt: number;
    playCount: number;
    uniqueTrackCount: number; // Phase D: Count of unique video IDs played
    // Phase C: Health tracking for cookie validation
    status: 'valid' | 'suspected_broken';
    lastError: string | null;
}

const MyMusicPlugin: Plugin = {
    name: "mymusic",
    version: "1.0.0",
    description: "Personalized music experience with per-user cookies.",

    onLoad: async (context: PluginContext) => {
        context.logger.info("My Music Plugin loaded!");

        // --- Database Helpers ---
        // Storage key format: profiles:{userId}
        // Each user has an array of CookieProfile objects
        const getProfiles = async (userId: string): Promise<CookieProfile[]> => {
            const profiles = (await context.db.plugin.get(`profiles:${userId}`)) || [];

            // Migration: Add uniqueTrackCount to old profiles
            return profiles.map((p: CookieProfile) => ({
                ...p,
                uniqueTrackCount: p.uniqueTrackCount ?? 0
            }));
        };

        const saveProfiles = async (userId: string, profiles: CookieProfile[]): Promise<void> => {
            await context.db.plugin.set(`profiles:${userId}`, profiles);
        };

        // Phase D: Track unique video IDs per profile
        // Storage format: trackIds:{profileId} => Set<videoId>
        const getTrackedIds = async (profileId: string): Promise<Set<string>> => {
            const ids = await context.db.plugin.get(`trackIds:${profileId}`);
            return new Set(ids || []);
        };

        const saveTrackedIds = async (profileId: string, ids: Set<string>): Promise<void> => {
            await context.db.plugin.set(`trackIds:${profileId}`, Array.from(ids));
        };

        /**
         * Updates unique track count for a profile based on newly played video IDs.
         * Phase D: Telemetry - uniqueTrackCount tracking
         */
        const updateUniqueTrackCount = async (
            userId: string,
            profileId: string,
            newVideoIds: string[]
        ): Promise<number> => {
            const trackedIds = await getTrackedIds(profileId);
            const initialSize = trackedIds.size;

            // Add new IDs to the set
            newVideoIds.forEach(id => trackedIds.add(id));

            const newUniqueCount = trackedIds.size - initialSize;

            if (newUniqueCount > 0) {
                // Save updated ID set
                await saveTrackedIds(profileId, trackedIds);

                // Update profile's uniqueTrackCount
                const profiles = await getProfiles(userId);
                const profile = profiles.find(p => p.id === profileId);
                if (profile) {
                    profile.uniqueTrackCount = trackedIds.size;
                    await saveProfiles(userId, profiles);
                }
            }

            return newUniqueCount;
        };

        // Phase D: Telemetry event types
        type MyMusicEvent = {
            type: 'MYMUSIC_PLAY_STARTED' | 'MYMUSIC_PLAY_FAILED';
            userId: string;
            profileName: string;
            playType: 'search' | 'radio' | 'supermix' | 'mix' | 'recommended' | 'feed' | 'unknown';
            failureReason?: 'no_profile' | 'yt_dlp_error' | 'auth_error' | 'empty_mix' | 'unknown';
        };

        /**
         * Log a MyMusic telemetry event with structured data.
         */
        const logTelemetryEvent = (event: MyMusicEvent): void => {
            const sanitizedEvent = {
                ...event,
                userId: event.userId.substring(0, 8) + '...' // Anonymize user ID
            };
            context.logger.info(`[MyMusic:Telemetry] ${JSON.stringify(sanitizedEvent)}`);
        };

        // --- Slash Commands ---

        // 1. /mymusic play [term] [profile]
        context.registerCommand({
            data: new SlashCommandBuilder()
                .setName("mymusic")
                .setDescription("Personalized music commands")
                .addSubcommand(sub =>
                    sub.setName("search")
                        .setDescription("Search for music and queue songs")
                        .addStringOption(opt => opt.setName("term").setDescription("Search term or URL").setRequired(true))
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile name").setRequired(false).setAutocomplete(true))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs to queue (default: 25, max: 50)").setRequired(false).setMinValue(1).setMaxValue(50))
                        .addBooleanOption(opt => opt.setName("radio").setDescription("Generate a radio mix from the first result").setRequired(false))
                )
                .addSubcommand(sub =>
                    sub.setName("supermix")
                        .setDescription("Play your 'My Supermix' (formerly Your Mix)")
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile to use").setRequired(false).setAutocomplete(true))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs to queue (default: 25)").setRequired(false).setMinValue(1).setMaxValue(50))
                )
                .addSubcommand(sub =>
                    sub.setName("mix")
                        .setDescription("Play a numbered My Mix playlist (1-7)")
                        .addIntegerOption(opt => opt.setName("number").setDescription("Mix number (1-7)").setRequired(true).setMinValue(1).setMaxValue(7))
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile name").setRequired(false).setAutocomplete(true))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs (default: 25, max: 50)").setRequired(false).setMinValue(1).setMaxValue(50))
                )
                .addSubcommand(sub =>
                    sub.setName("recommended")
                        .setDescription("Play your personalized recommended tracks")
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile name").setRequired(false).setAutocomplete(true))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs (default: 25, max: 50)").setRequired(false).setMinValue(1).setMaxValue(50))
                )
                .addSubcommand(sub =>
                    sub.setName("feed")
                        .setDescription("[Debug] Test your personalized homepage feed")
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile name").setRequired(false).setAutocomplete(true))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs (default: 25, max: 50)").setRequired(false).setMinValue(1).setMaxValue(50))
                )
                .addSubcommandGroup(group =>
                    group.setName("cookie")
                        .setDescription("Manage your cookies")
                        .addSubcommand(sub =>
                            sub.setName("add")
                                .setDescription("Add a new cookie profile")
                                .addAttachmentOption(opt => opt.setName("file").setDescription("Netscape formatted cookie file (.txt)").setRequired(true))
                                .addStringOption(opt => opt.setName("name").setDescription("Profile name").setRequired(false))
                        )
                        .addSubcommand(sub =>
                            sub.setName("list")
                                .setDescription("List your cookie profiles")
                        )
                        .addSubcommand(sub =>
                            sub.setName("delete")
                                .setDescription("Delete a cookie profile")
                                .addStringOption(opt => opt.setName("name").setDescription("Profile name").setRequired(true))
                        )
                ),
            execute: async (interaction: ChatInputCommandInteraction) => {
                const subcommand = interaction.options.getSubcommand();
                const group = interaction.options.getSubcommandGroup();

                if (subcommand === "search") {
                    await handleSearch(interaction, context, getProfiles, saveProfiles, logTelemetryEvent);
                } else if (subcommand === "supermix") {
                    await handleSupermix(interaction, context, getProfiles, saveProfiles, logTelemetryEvent);
                } else if (subcommand === "mix") {
                    await handleMix(interaction, context, getProfiles, saveProfiles, logTelemetryEvent);
                } else if (subcommand === "recommended") {
                    await handleRecommended(interaction, context, getProfiles, saveProfiles, logTelemetryEvent);
                } else if (subcommand === "feed") {
                    await handleFeed(interaction, context, getProfiles, saveProfiles, logTelemetryEvent);
                } else if (group === "cookie") {
                    if (subcommand === "add") {
                        await handleCookieAdd(interaction, context, getProfiles, saveProfiles);
                    } else if (subcommand === "list") {
                        await handleCookieList(interaction, context, getProfiles);
                    } else if (subcommand === "delete") {
                        await handleCookieDelete(interaction, context, getProfiles, saveProfiles);
                    }
                }
            },
            autocomplete: async (interaction: import("discord.js").AutocompleteInteraction) => {
                const focusedOption = interaction.options.getFocused(true);

                // Only autocomplete for profile fields
                if (focusedOption.name !== 'profile') {
                    return;
                }

                try {
                    const userId = interaction.user.id;
                    const profiles = await getProfiles(userId);

                    // Filter profiles based on what user is typing
                    const filtered = profiles
                        .filter(p => p.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                        .slice(0, 25); // Discord limits to 25 choices

                    // Return profile names as choices
                    await interaction.respond(
                        filtered.map(p => ({
                            name: `${p.name} (${p.playCount} plays, ${p.status === 'valid' ? '✓' : '⚠️'})`,
                            value: p.name
                        }))
                    );
                } catch (error) {
                    context.logger.error(`Autocomplete error: ${error}`);
                    await interaction.respond([]);
                }
            }
        });

        // --- API Routes ---

        // Get profiles for web UI
        context.server.get("/profiles", async (req: any, reply) => {
            // In a real app, we'd get the user ID from the session
            // For now, we'll assume the user ID is passed in the query or header, 
            // or we'd implement proper auth middleware integration for plugins.
            // Since the core server handles auth, we can access req.user if available.

            const user = req.user;
            if (!user) {
                context.logger.warn(`[mymusic] Unauthorized access to /profiles. Headers: ${JSON.stringify(req.headers)}`);
                return reply.status(401).send({ error: "Unauthorized" });
            }

            const profiles = await getProfiles(user.id);

            // Phase E: Web Dashboard Safety - Never send cookie content to frontend
            // Only send safe, non-sensitive metadata
            const safeProfiles = profiles.map(p => ({
                id: p.id,
                name: p.name,
                createdAt: p.createdAt,
                lastUsedAt: p.lastUsedAt,
                playCount: p.playCount,
                uniqueTrackCount: p.uniqueTrackCount,  // Phase D: Include unique track count
                hasContent: !!p.content,
                status: p.status,
                lastError: p.lastError
            }));

            return { profiles: safeProfiles };
        });

        // Add profile from web UI
        context.server.post("/profiles", async (req: any, reply) => {
            const user = req.user;
            if (!user) return reply.status(401).send({ error: "Unauthorized" });

            const { name, content } = req.body as { name: string, content: string };
            if (!content) return reply.status(400).send({ error: "Content is required" });

            const profiles = await getProfiles(user.id);
            const profileName = name || `Cookie ${profiles.length + 1}`;

            if (profiles.some(p => p.name === profileName)) {
                return reply.status(409).send({ error: "Profile with this name already exists" });
            }

            const newProfile: CookieProfile = {
                id: Math.random().toString(36).substring(7),
                name: profileName,
                content,
                createdAt: Date.now(),
                lastUsedAt: 0,
                playCount: 0,
                uniqueTrackCount: 0,
                status: 'valid',
                lastError: null
            };

            profiles.push(newProfile);
            await saveProfiles(user.id, profiles);

            return { success: true, profile: { ...newProfile, content: undefined } };
        });

        // Delete profile from web UI
        context.server.delete("/profiles/:id", async (req: any, reply) => {
            const user = req.user;
            if (!user) return reply.status(401).send({ error: "Unauthorized" });

            const { id } = req.params as { id: string };
            let profiles = await getProfiles(user.id);

            const initialLength = profiles.length;
            profiles = profiles.filter(p => p.id !== id);

            if (profiles.length === initialLength) {
                return reply.status(404).send({ error: "Profile not found" });
            }

            await saveProfiles(user.id, profiles);
            return { success: true };
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("My Music Plugin unloaded!");
    }
};

// --- Helper Functions ---

/**
 * Extracts video ID from a YouTube URL using YT-DLP's canonical formats.
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, music.youtube.com/watch?v=ID
 * 
 * @param url - YouTube video URL
 * @returns 11-character video ID or null if not found
 */
function extractVideoIdFromUrl(url: string): string | null {
    // Match patterns: v=ID, /ID (for youtu.be), watch?v=ID
    const match = url.match(/(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

/**
 * Builds a search or radio URL based on user input.
 * 
 * Phase A: Search & Radio Behavior (ref: YT-DLP_ANALYSIS.md)
 * - Search: ytsearchN:<term> where N = min(limit, 50), default 15 (ref: §1.1)
 * - Radio: RD<video_id> mix playlist (ref: §3.2)
 * 
 * @param term - Search query or URL
 * @param limit - Requested song limit
 * @param radio - Whether to generate radio mix
 * @param cookiePath - Path to cookie file
 * @param musicResolver - Function to resolve search terms to video IDs
 * @returns Object with { url, type, videoId? }
 */
async function buildSearchOrRadioUrl(
    term: string,
    limit: number,
    radio: boolean,
    cookiePath: string,
    musicResolver: (query: string, cookiePath?: string) => Promise<{ url?: string } | null>
): Promise<{ url: string; type: 'search' | 'radio' | 'playlist' | 'video'; videoId?: string } | null> {
    // Check if term is a direct URL
    const isUrl = term.startsWith("http://") || term.startsWith("https://") || term.startsWith("youtu");
    const isPlaylistUrl = isUrl && (term.includes("list=") || term.includes("music.youtube.com/playlist"));

    if (radio) {
        // Radio mode: Create RD<video_id> mix from search result or URL
        // ref: §3.2 - Video-based Mix pattern
        let videoId: string | null = null;

        if (isUrl) {
            // Extract video ID from URL
            videoId = extractVideoIdFromUrl(term);
        }

        if (!videoId) {
            // Resolve search term to get first result
            // This uses ytsearch1:<term> internally in the resolver
            const song = await musicResolver(term, cookiePath);
            if (!song || !song.url) {
                return null; // No results found
            }

            // Extract ID from resolved song URL (canonical YouTube URL)
            videoId = extractVideoIdFromUrl(song.url);
            if (!videoId) {
                return null; // Could not extract video ID
            }
        }

        // Build video-based mix URL (ref: §3.2)
        const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
        return { url: mixUrl, type: 'radio', videoId };

    } else if (isPlaylistUrl) {
        // Direct playlist URL - pass through
        return { url: term, type: 'playlist' };

    } else if (isUrl) {
        // Direct video URL - play single video
        return { url: term, type: 'video' };

    } else {
        //  Search query using ytsearchN: prefix (ref: §1.1)
        // Note: N should be min(limit, 50) with default 15
        const searchCount = Math.min(limit || 15, 50);
        const searchQuery = `ytsearch${searchCount}:${term}`;
        return { url: searchQuery, type: 'search' };
    }
}

/**
 * Validates Netscape format cookie content.
 * Phase C: Cookie Validation (ref: YT-DLP_ANALYSIS.md §6)
 * 
 * Checks:
 * - At least one cookie belongs to YouTube/Google domain
 * - Optional: Detects LOGIN_INFO and SAPISID variants for auth
 * 
 * @param content - Netscape format cookie content
 * @returns Validation result with warnings
 */
function validateNetscapeCookie(content: string): {
    valid: boolean;
    error?: string;
    warnings?: string[];
    hasAuthCookies?: boolean;
} {
    if (!content || content.trim().length === 0) {
        return { valid: false, error: "Cookie file is empty" };
    }

    const lines = content.split('\n').filter(line =>
        line.trim() && !line.trim().startsWith('#')
    );

    if (lines.length === 0) {
        return { valid: false, error: "No valid cookie entries found" };
    }

    // Check for YouTube/Google domains
    const hasYouTubeDomain = lines.some(line =>
        line.includes('.youtube.com') ||
        line.includes('.google.com') ||
        line.includes('.googlevideo.com')
    );

    if (!hasYouTubeDomain) {
        return {
            valid: false,
            error: "No YouTube or Google cookies found. Please export cookies from youtube.com"
        };
    }

    // Optional: Check for authentication cookies (ref: §6.1)
    const warnings: string[] = [];
    let hasAuthCookies = false;

    const hasLoginInfo = content.includes('LOGIN_INFO');
    const hasSapisid = content.includes('SAPISID') ||
        content.includes('__Secure-1PAPISID') ||
        content.includes('__Secure-3PAPISID');

    if (hasLoginInfo && hasSapisid) {
        hasAuthCookies = true;
    } else {
        if (!hasLoginInfo) {
            warnings.push("Missing LOGIN_INFO cookie - personalized features may not work");
        }
        if (!hasSapisid) {
            warnings.push("Missing SAPISID cookies - authentication may fail");
        }
    }

    return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        hasAuthCookies
    };
}

// --- Command Handlers ---

async function handleSearch(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>,
    logTelemetryEvent: (event: { type: 'MYMUSIC_PLAY_STARTED' | 'MYMUSIC_PLAY_FAILED'; userId: string; profileName: string; playType: 'search' | 'radio' | 'supermix' | 'mix' | 'unknown'; failureReason?: 'no_profile' | 'yt_dlp_error' | 'auth_error' | 'empty_mix' | 'unknown' }) => void
) {
    const term = interaction.options.getString("term", true);
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const radio = interaction.options.getBoolean("radio") || false;
    const userId = interaction.user.id;

    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        // Phase D: Log telemetry for no profile error
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: 'none',
            playType: radio ? 'radio' : 'search',
            failureReason: 'no_profile'
        });

        await interaction.reply({
            content: "❌ You don't have any cookie profiles set up. Use `/mymusic cookie add` to add one.",
            ephemeral: true
        });
        return;
    }

    let profile: CookieProfile | undefined;
    if (profileName) {
        profile = profiles.find(p => p.name === profileName);
        if (!profile) {
            logTelemetryEvent({
                type: 'MYMUSIC_PLAY_FAILED',
                userId,
                profileName: profileName || 'auto',
                playType: radio ? 'radio' : 'search',
                failureReason: 'no_profile'
            });

            await interaction.reply({
                content: `❌ Cookie profile "**${profileName}**" not found.`,
                ephemeral: true
            });
            return;
        }
    } else {
        // Default to the most recently used, or the first one
        profile = profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
    }

    // Write cookie to temp file
    let cookiePath: string;
    try {
        cookiePath = await context.writeCustomCookie(profile.content);
    } catch (error) {
        context.logger.error(`Failed to write custom cookie: ${error}`);

        // Update profile health status
        profile.status = 'suspected_broken';
        profile.lastError = 'Failed to write cookie file';
        await saveProfiles(userId, profiles);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: radio ? 'radio' : 'search',
            failureReason: 'unknown'
        });

        await interaction.reply({ content: "❌ Failed to process cookie.", ephemeral: true });
        return;
    }

    // Update stats
    profile.lastUsedAt = Date.now();
    profile.playCount++;
    await saveProfiles(userId, profiles);

    // === YT-DLP Integration (ref: YT-DLP_ANALYSIS.md) ===
    try {
        // Defer reply for radio mode since it needs resolution
        if (radio) {
            await interaction.deferReply();
        }

        // Build search or radio URL using helper
        const result = await buildSearchOrRadioUrl(
            term,
            limit,
            radio,
            cookiePath,
            context.music.resolve
        );

        // Handle edge case: no results found (radio mode only)
        if (!result) {
            const errorMsg = radio
                ? "❌ Could not find a video to start radio from. Try a different search term."
                : "❌ No results found.";

            logTelemetryEvent({
                type: 'MYMUSIC_PLAY_FAILED',
                userId,
                profileName: profile.name,
                playType: radio ? 'radio' : 'search',
                failureReason: 'empty_mix'
            });

            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
            return;
        }

        // Log and enqueue based on type
        const { url, type, videoId } = result;
        context.logger.info(`[MyMusic] ${type}: ${videoId ? `videoId=${videoId}` : url}`);

        // Phase D: Log successful play start
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: radio ? 'radio' : 'search'
        });

        if (type === 'video') {
            await context.music.enqueue(interaction, url, cookiePath);
        } else {
            // playlist, radio, or search - all use enqueuePlaylist
            await context.music.enqueuePlaylist(interaction, url, { cookiePath, limit });
        }
    } catch (error) {
        context.logger.error(`Failed to enqueue: ${error}`);

        // Update profile health if it looks like an auth error
        const errorStr = String(error);
        if (errorStr.includes('auth') || errorStr.includes('login') || errorStr.includes('401')) {
            profile.status = 'suspected_broken';
            profile.lastError = 'Authentication failed - cookie may be expired';
            await saveProfiles(userId, profiles);
        }

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: radio ? 'radio' : 'search',
            failureReason: errorStr.includes('auth') ? 'auth_error' : 'yt_dlp_error'
        });

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: "❌ Failed to enqueue song.", ephemeral: true });
        } else {
            await interaction.editReply({ content: "❌ Failed to enqueue song." });
        }
    }
}

async function handleSupermix(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>,
    logTelemetryEvent: (event: { type: 'MYMUSIC_PLAY_STARTED' | 'MYMUSIC_PLAY_FAILED'; userId: string; profileName: string; playType: 'search' | 'radio' | 'supermix' | 'mix' | 'unknown'; failureReason?: 'no_profile' | 'yt_dlp_error' | 'auth_error' | 'empty_mix' | 'unknown' }) => void
) {
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: 'none',
            playType: 'supermix',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: "❌ You don't have any cookie profiles set up.", ephemeral: true });
        return;
    }

    let profile = profileName ? profiles.find(p => p.name === profileName) : profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
    if (!profile) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profileName || 'none',
            playType: 'supermix',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: `❌ Profile not found.`, ephemeral: true });
        return;
    }

    let cookiePath: string;
    try {
        cookiePath = await context.writeCustomCookie(profile.content);
    } catch (error) {
        profile.status = 'suspected_broken';
        profile.lastError = 'Failed to write cookie file';
        await saveProfiles(userId, profiles);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'supermix',
            failureReason: 'unknown'
        });
        await interaction.reply({ content: "❌ Failed to process cookie.", ephemeral: true });
        return;
    }

    profile.lastUsedAt = Date.now();
    profile.playCount++;
    await saveProfiles(userId, profiles);

    try {
        // Part 2: Redesigned Supermix - Use Recommendations Instead of RDMM
        // RDMM (YouTube Music Mix) playlists are unviewable and unreliable
        // New approach: Use :ytrec (YouTube Recommended Feed) with authentication
        // ref: YT-DLP_ANALYSIS.md §2.3 - :ytrec feed extractor
        //
        // :ytrec = YouTube Recommended Feed (personalized with cookies)
        // Returns a flat list of recommended videos based on user's watch history,
        // liked videos, and subscriptions. This provides a much more reliable
        // personalized radio experience than RDMM.
        //
        // Requirements:
        // - LOGIN_INFO cookie (indicates logged-in status)
        // - SAPISID or __Secure-*PAPISID cookies (for auth)
        // - SOCS=CAI cookie (consent - auto-injected by core)
        const recUrl = ':ytrec';
        context.logger.info(`[MyMusic] Playing personalized recommendations via :ytrec`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: 'supermix'
        });

        await context.music.enqueuePlaylist(interaction, recUrl, { cookiePath, limit });
    } catch (error) {
        context.logger.error(`Failed to enqueue supermix: ${error}`);

        const errorStr = String(error);
        if (errorStr.includes('auth') || errorStr.includes('login') || errorStr.includes('401')) {
            profile.status = 'suspected_broken';
            profile.lastError = 'Authentication failed - cookie may be expired';
            await saveProfiles(userId, profiles);
        }

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'supermix',
            failureReason: errorStr.includes('auth') ? 'auth_error' : 'yt_dlp_error'
        });

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: "❌ Failed to enqueue Supermix.", ephemeral: true });
        } else {
            await interaction.editReply({ content: "❌ Failed to enqueue Supermix." });
        }
    }
}

async function handleMix(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>,
    logTelemetryEvent: (event: { type: 'MYMUSIC_PLAY_STARTED' | 'MYMUSIC_PLAY_FAILED'; userId: string; profileName: string; playType: 'search' | 'radio' | 'supermix' | 'mix' | 'unknown'; failureReason?: 'no_profile' | 'yt_dlp_error' | 'auth_error' | 'empty_mix' | 'unknown' }) => void
) {
    const number = interaction.options.getInteger("number", true);
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: 'none',
            playType: 'mix',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: "❌ You don't have any cookie profiles set up.", ephemeral: true });
        return;
    }

    let profile = profileName ? profiles.find(p => p.name === profileName) : profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
    if (!profile) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profileName || 'none',
            playType: 'mix',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: `❌ Profile not found.`, ephemeral: true });
        return;
    }

    let cookiePath: string;
    try {
        cookiePath = await context.writeCustomCookie(profile.content);
    } catch (error) {
        profile.status = 'suspected_broken';
        profile.lastError = 'Failed to write cookie file';
        await saveProfiles(userId, profiles);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'mix',
            failureReason: 'unknown'
        });
        await interaction.reply({ content: "❌ Failed to process cookie.", ephemeral: true });
        return;
    }

    profile.lastUsedAt = Date.now();
    profile.playCount++;
    await saveProfiles(userId, profiles);

    try {
        // Part 2: Fixed Mix - Use Search→Radio Pattern
        // Numbered "My Mix" playlists (1-7) don't have reliable direct playlist IDs
        // Strategy: Search for "My Mix N" → extract first video → build RD<videoId> mix
        // ref: YT-DLP_ANALYSIS.md §3.2 - RD* mix patterns
        //
        // This is heuristic and may vary based on search results, but provides
        // a consistent way to access numbered mix playlists using the radio pattern.
        const searchTerm = `My Mix ${number}`;

        // Defer reply since we need to resolve the video
        await interaction.deferReply();

        const result = await buildSearchOrRadioUrl(
            searchTerm,
            limit,
            true, // radio=true to build RD<videoId> mix
            cookiePath,
            context.music.resolve
        );

        if (!result) {
            logTelemetryEvent({
                type: 'MYMUSIC_PLAY_FAILED',
                userId,
                profileName: profile.name,
                playType: 'mix',
                failureReason: 'empty_mix'
            });

            await interaction.editReply({
                content: `❌ Could not find My Mix ${number}. It may not exist for your account yet.`
            });
            return;
        }

        const { url } = result;
        context.logger.info(`[MyMusic] Playing My Mix ${number} via: ${url}`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: 'mix'
        });

        // Use the interaction object directly since we already deferred
        await context.music.enqueuePlaylist(interaction, url, { cookiePath, limit });
    } catch (error) {
        context.logger.error(`Failed to enqueue mix: ${error}`);

        const errorStr = String(error);
        if (errorStr.includes('auth') || errorStr.includes('login') || errorStr.includes('401')) {
            profile.status = 'suspected_broken';
            profile.lastError = 'Authentication failed - cookie may be expired';
            await saveProfiles(userId, profiles);
        }

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'mix',
            failureReason: errorStr.includes('auth') ? 'auth_error' : 'yt_dlp_error'
        });

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: `❌ Failed to enqueue My Mix ${number}.`, ephemeral: true });
        } else {
            await interaction.editReply({ content: `❌ Failed to enqueue My Mix ${number}.` });
        }
    }
}

// ============================================================================
// PART 3: NEW COMMANDS - Recommended & Feed
// ============================================================================

/**
 * Handler for /mymusic recommended
 * Plays personalized recommended tracks using :ytrec feed
 */
async function handleRecommended(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>,
    logTelemetryEvent: (event: { type: 'MYMUSIC_PLAY_STARTED' | 'MYMUSIC_PLAY_FAILED'; userId: string; profileName: string; playType: 'search' | 'radio' | 'supermix' | 'mix' | 'recommended' | 'feed' | 'unknown'; failureReason?: 'no_profile' | 'yt_dlp_error' | 'auth_error' | 'empty_mix' | 'unknown' }) => void
) {
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: 'none',
            playType: 'recommended',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: "❌ You don't have any cookie profiles set up.", ephemeral: true });
        return;
    }

    let profile = profileName ? profiles.find(p => p.name === profileName) : profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
    if (!profile) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profileName || 'none',
            playType: 'recommended',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: `❌ Profile not found.`, ephemeral: true });
        return;
    }

    let cookiePath: string;
    try {
        cookiePath = await context.writeCustomCookie(profile.content);
    } catch (error) {
        profile.status = 'suspected_broken';
        profile.lastError = 'Failed to write cookie file';
        await saveProfiles(userId, profiles);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'recommended',
            failureReason: 'unknown'
        });
        await interaction.reply({ content: "❌ Failed to process cookie.", ephemeral: true });
        return;
    }

    profile.lastUsedAt = Date.now();
    profile.playCount++;
    await saveProfiles(userId, profiles);

    try {
        // Part 3: Recommended Command
        // Uses :ytrec (YouTube Recommended Feed) for personalized tracks
        // ref: YT-DLP_ANALYSIS.md §2.3 - :ytrec feed extractor
        //
        // User-friendly command for playing recommended music based on
        // listening history, liked videos, and subscriptions.
        const recUrl = ':ytrec';
        context.logger.info(`[MyMusic] Playing recommended tracks via :ytrec`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: 'recommended'
        });

        await context.music.enqueuePlaylist(interaction, recUrl, { cookiePath, limit });
    } catch (error) {
        context.logger.error(`Failed to enqueue recommended: ${error}`);

        const errorStr = String(error);
        if (errorStr.includes('auth') || errorStr.includes('login') || errorStr.includes('401')) {
            profile.status = 'suspected_broken';
            profile.lastError = 'Authentication failed - cookie may be expired';
            await saveProfiles(userId, profiles);
        }

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'recommended',
            failureReason: errorStr.includes('auth') ? 'auth_error' : 'yt_dlp_error'
        });

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: "❌ Failed to load recommended tracks.", ephemeral: true });
        } else {
            await interaction.editReply({ content: "❌ Failed to load recommended tracks." });
        }
    }
}

/**
 * Handler for /mymusic feed
 * Debug/test command for personalized homepage feed
 */
async function handleFeed(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>,
    logTelemetryEvent: (event: { type: 'MYMUSIC_PLAY_STARTED' | 'MYMUSIC_PLAY_FAILED'; userId: string; profileName: string; playType: 'search' | 'radio' | 'supermix' | 'mix' | 'recommended' | 'feed' | 'unknown'; failureReason?: 'no_profile' | 'yt_dlp_error' | 'auth_error' | 'empty_mix' | 'unknown' }) => void
) {
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: 'none',
            playType: 'feed',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: "❌ You don't have any cookie profiles set up.", ephemeral: true });
        return;
    }

    let profile = profileName ? profiles.find(p => p.name === profileName) : profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
    if (!profile) {
        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profileName || 'none',
            playType: 'feed',
            failureReason: 'no_profile'
        });
        await interaction.reply({ content: `❌ Profile not found.`, ephemeral: true });
        return;
    }

    let cookiePath: string;
    try {
        cookiePath = await context.writeCustomCookie(profile.content);
    } catch (error) {
        profile.status = 'suspected_broken';
        profile.lastError = 'Failed to write cookie file';
        await saveProfiles(userId, profiles);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'feed',
            failureReason: 'unknown'
        });
        await interaction.reply({ content: "❌ Failed to process cookie.", ephemeral: true });
        return;
    }

    profile.lastUsedAt = Date.now();
    profile.playCount++;
    await saveProfiles(userId, profiles);

    try {
        // Part 3: Feed Command (Debug/Testing)
        // Uses :ytrec (YouTube Recommended Feed) for testing personalization
        // ref: YT-DLP_ANALYSIS.md §2.3 - :ytrec feed extractor
        //
        // This is a testing-oriented command. Future enhancements could add
        // support for :ytsubs (subscriptions), :ythistory, etc.
        // TODO: Add feed type selection option
        const feedUrl = ':ytrec';
        context.logger.info(`[MyMusic:Feed] Testing feed URL: ${feedUrl}`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: 'feed'
        });

        await context.music.enqueuePlaylist(interaction, feedUrl, { cookiePath, limit });
    } catch (error) {
        context.logger.error(`Failed to enqueue feed: ${error}`);

        const errorStr = String(error);
        if (errorStr.includes('auth') || errorStr.includes('login') || errorStr.includes('401')) {
            profile.status = 'suspected_broken';
            profile.lastError = 'Authentication failed - cookie may be expired';
            await saveProfiles(userId, profiles);
        }

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_FAILED',
            userId,
            profileName: profile.name,
            playType: 'feed',
            failureReason: errorStr.includes('auth') ? 'auth_error' : 'yt_dlp_error'
        });

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: "❌ Failed to load feed.", ephemeral: true });
        } else {
            await interaction.editReply({ content: "❌ Failed to load feed." });
        }
    }
}

// ============================================================================
// COOKIE MANAGEMENT HANDLERS
// ============================================================================

async function handleCookieAdd(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>
) {
    const attachment = interaction.options.getAttachment("file", true);
    const name = interaction.options.getString("name");
    const userId = interaction.user.id;

    // Fetch attachment content
    let content: string;
    try {
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error("Failed to fetch attachment");
        content = await response.text();
    } catch (error) {
        await interaction.reply({ content: "❌ Failed to read the attached file.", ephemeral: true });
        return;
    }

    const profiles = await getProfiles(userId);
    const profileName = name || `Cookie ${profiles.length + 1}`;

    if (profiles.some(p => p.name === profileName)) {
        await interaction.reply({ content: `❌ A profile with the name "**${profileName}**" already exists.`, ephemeral: true });
        return;
    }

    // Phase C: Validate Netscape cookie format (ref: YT-DLP_ANALYSIS.md §6)
    const validation = validateNetscapeCookie(content);

    if (!validation.valid) {
        await interaction.reply({
            content: `❌ Invalid cookie file: ${validation.error}`,
            ephemeral: true
        });
        return;
    }

    // Warn about  missing auth cookies but still allow saving
    let responseMessage = `✅ Added cookie profile "**${profileName}**"!`;
    if (validation.warnings && validation.warnings.length > 0) {
        responseMessage += `\n\n⚠️ **Warnings:**\n${validation.warnings.map(w => `• ${w}`).join('\n')}`;
        responseMessage += `\n\nThe profile has been saved but may not work for all features.`;
    }

    const newProfile: CookieProfile = {
        id: Math.random().toString(36).substring(7),
        name: profileName,
        content,
        createdAt: Date.now(),
        lastUsedAt: 0,
        playCount: 0,
        uniqueTrackCount: 0,
        status: validation.hasAuthCookies ? 'valid' : 'suspected_broken',
        lastError: null
    };

    profiles.push(newProfile);
    await saveProfiles(userId, profiles);

    await interaction.reply({ content: responseMessage, ephemeral: true });
}

async function handleCookieList(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>
) {
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        await interaction.reply({ content: "You have no cookie profiles.", ephemeral: true });
        return;
    }

    const list = profiles.map(p => `- **${p.name}** (Used: ${p.playCount} times)`).join("\n");
    await interaction.reply({ content: `**Your Cookie Profiles:**\n${list}`, ephemeral: true });
}

async function handleCookieDelete(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>
) {
    const name = interaction.options.getString("name", true);
    const userId = interaction.user.id;
    let profiles = await getProfiles(userId);

    const initialLength = profiles.length;
    profiles = profiles.filter(p => p.name !== name);

    if (profiles.length === initialLength) {
        await interaction.reply({ content: `❌ Profile "**${name}**" not found.`, ephemeral: true });
        return;
    }

    await saveProfiles(userId, profiles);
    await interaction.reply({ content: `✅ Deleted profile "**${name}**".`, ephemeral: true });
}

export default MyMusicPlugin;
