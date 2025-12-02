/**
 * MyMusic Plugin - Personalized Music Experience
 * 
 * Provides per-user YouTube cookie management for personalized playback features.
 * Uses YT-DLP extractors for search, mixes, and radio playlists.
 * 
 * Ground Truth Specification: YT-DLP_ANALYSIS.md
 * 
 * @see YT-DLP_ANALYSIS.md - Complete technical reference for all YouTube/Music features
 * 
 * === MANUAL VERIFICATION CHECKLIST ===
 * Run these tests when making changes to verify functionality:
 * 
 * 1. Basic Search (no radio):
 *    `/mymusic search term:"lofi hip hop" limit:10 profile:<name>`
 *    - Should queue ~10 songs from search results
 *    - Verify profile stats update (playCount, lastUsedAt)
 * 
 * 2. Radio Mode:
 *    `/mymusic search term:"jazz" radio:true profile:<name>`
 *    - Should resolve first result and generate RD* mix
 *    - Verify mix playlist is created
 * 
 * 3. Supermix:
 *    `/mymusic supermix profile:<name> limit:20`
 *    - Should use RDMM playlist (My Supermix)
 *    - Requires valid, logged-in YouTube cookie
 * 
 * 4. No Profile Error:
 *    `/mymusic search term:"test"`
 *    - Should show graceful error: "You don't have any cookie profiles"
 *    - Error should be ephemeral
 * 
 * 5. Malformed Cookie:
 *    `/mymusic cookie add file:<invalid.txt>`
 *    - Should show graceful error about invalid format
 *    - Should NOT accept completely empty files
 * 
 * 6. Web Dashboard:
 *    - Navigate to MyMusic plugin page
 *    - Verify: can add profile (paste cookie content)
 *    - Verify: can delete profile
 *    - Verify: stats update after playing music (playCount, lastUsedAt)
 *    - Verify: NO cookie content visible in browser DevTools Network tab
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
    // TODO: Add uniqueTrackCount: number; (Phase 4)
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
            return (await context.db.plugin.get(`profiles:${userId}`)) || [];
        };

        const saveProfiles = async (userId: string, profiles: CookieProfile[]): Promise<void> => {
            await context.db.plugin.set(`profiles:${userId}`, profiles);
        };

        // --- Slash Commands ---

        // 1. /mymusic play [term] [profile]
        context.registerCommand({
            data: new SlashCommandBuilder()
                .setName("mymusic")
                .setDescription("Personalized music commands")
                .addSubcommand(sub =>
                    sub.setName("search")
                        .setDescription("Search and play music using your personalized cookie")
                        .addStringOption(opt => opt.setName("term").setDescription("Search term or URL").setRequired(true))
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile to use").setRequired(false))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs to queue (default: 25)").setRequired(false).setMinValue(1).setMaxValue(50))
                        .addBooleanOption(opt => opt.setName("radio").setDescription("Start a radio mix from the search result").setRequired(false))
                )
                .addSubcommand(sub =>
                    sub.setName("supermix")
                        .setDescription("Play your 'My Supermix' (formerly Your Mix)")
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile to use").setRequired(false))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs to queue (default: 25)").setRequired(false).setMinValue(1).setMaxValue(50))
                )
                .addSubcommand(sub =>
                    sub.setName("mix")
                        .setDescription("Play one of your numbered 'My Mix' playlists")
                        .addIntegerOption(opt => opt.setName("number").setDescription("Mix number (1-7)").setRequired(true).setMinValue(1).setMaxValue(7))
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile to use").setRequired(false))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Max songs to queue (default: 25)").setRequired(false).setMinValue(1).setMaxValue(50))
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
                    await handleSearch(interaction, context, getProfiles, saveProfiles);
                } else if (subcommand === "supermix") {
                    await handleSupermix(interaction, context, getProfiles, saveProfiles);
                } else if (subcommand === "mix") {
                    await handleMix(interaction, context, getProfiles, saveProfiles);
                } else if (group === "cookie") {
                    if (subcommand === "add") {
                        await handleCookieAdd(interaction, context, getProfiles, saveProfiles);
                    } else if (subcommand === "list") {
                        await handleCookieList(interaction, context, getProfiles);
                    } else if (subcommand === "delete") {
                        await handleCookieDelete(interaction, context, getProfiles, saveProfiles);
                    }
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
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>
) {
    const term = interaction.options.getString("term", true);
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const radio = interaction.options.getBoolean("radio") || false;
    const userId = interaction.user.id;

    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
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

        // Handle edge case: no results found (radio mode  only)
        if (!result) {
            const errorMsg = radio
                ? "❌ Could not find a video to start radio from. Try a different search term."
                : "❌ No results found.";

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

        if (type === 'video') {
            await context.music.enqueue(interaction, url, cookiePath);
        } else {
            // playlist, radio, or search - all use enqueuePlaylist
            await context.music.enqueuePlaylist(interaction, url, { cookiePath, limit });
        }
    } catch (error) {
        context.logger.error(`Failed to enqueue: ${error}`);
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
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>
) {
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        await interaction.reply({ content: "❌ You don't have any cookie profiles set up.", ephemeral: true });
        return;
    }

    let profile = profileName ? profiles.find(p => p.name === profileName) : profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
    if (!profile) {
        await interaction.reply({ content: `❌ Profile not found.`, ephemeral: true });
        return;
    }

    let cookiePath: string;
    try {
        cookiePath = await context.writeCustomCookie(profile.content);
    } catch (error) {
        await interaction.reply({ content: "❌ Failed to process cookie.", ephemeral: true });
        return;
    }

    profile.lastUsedAt = Date.now();
    profile.playCount++;
    await saveProfiles(userId, profiles);

    try {
        // Phase B: Supermix uses RDMM playlist pattern
        // RDMM = YouTube Music Mix (personalized, requires authentication)
        // ref: YT-DLP_ANALYSIS.md §3.2 - Mix Playlists
        // 
        // Requirements for RDMM to work properly (ref: §6):
        // - LOGIN_INFO cookie (indicates logged-in status)
        // - SAPISID or __Secure-*PAPISID cookies (for auth)
        // - SOCS=CAI cookie (consent, required for mix playlists - auto-injected by core)
        //
        // This playlist generates a personalized endless mix based on user's
        // listening history and preferences in YouTube Music.
        const supermixUrl = 'https://www.youtube.com/playlist?list=RDMM';
        context.logger.info(`[MyMusic] Playing My Supermix: ${supermixUrl}`);
        await context.music.enqueuePlaylist(interaction, supermixUrl, { cookiePath, limit });
    } catch (error) {
        context.logger.error(`Failed to enqueue supermix: ${error}`);
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
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>
) {
    const number = interaction.options.getInteger("number", true);
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        await interaction.reply({ content: "❌ You don't have any cookie profiles set up.", ephemeral: true });
        return;
    }

    let profile = profileName ? profiles.find(p => p.name === profileName) : profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
    if (!profile) {
        await interaction.reply({ content: `❌ Profile not found.`, ephemeral: true });
        return;
    }

    let cookiePath: string;
    try {
        cookiePath = await context.writeCustomCookie(profile.content);
    } catch (error) {
        await interaction.reply({ content: "❌ Failed to process cookie.", ephemeral: true });
        return;
    }

    profile.lastUsedAt = Date.now();
    profile.playCount++;
    await saveProfiles(userId, profiles);

    try {
        // Phase B: Numbered "My Mix" Playlists (1-7)
        // These are user-specific auto-generated playlists that YouTube creates
        // for personalized music discovery. There is no direct playlist ID pattern
        // for numbered mixes in YT-DLP's implementation (ref: §3.2).
        //
        // Best-effort approach: Search for the playlist by name
        // This is a heuristic and may not always work if:
        // - The mix doesn't exist for the user's account
        // - YouTube hasn't generated that mix yet
        // - Search results don't surface it
        //
        // Alternative considered: Using RDMM would give *a* personalized mix
        // but not the specific numbered one the user requested.
        const mixQuery = `ytsearch1:My Mix ${number}`;
        context.logger.info(`[MyMusic] Searching for mix: ${mixQuery}`);
        await context.music.enqueuePlaylist(interaction, mixQuery, { cookiePath, limit });
    } catch (error) {
        context.logger.error(`Failed to enqueue mix: ${error}`);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: `❌ Failed to enqueue My Mix ${number}.`, ephemeral: true });
        } else {
            await interaction.editReply({ content: `❌ Failed to enqueue My Mix ${number}.` });
        }
    }
}

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
