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
import { CookieManager } from './cookie-manager.js';
import { DiscoveryEngine, DiscoveryTrack } from './discovery-engine.js';
import { enqueueSongs } from '../../core/music-player.js';

interface CookieProfile {
    id: string;
    name: string;
    content: string; // Canonical header string
    format: 'header' | 'netscape'; // Track original format
    createdAt: number;
    lastUsedAt: number;
    playCount: number;
    uniqueTrackCount: number;
    status: 'valid' | 'suspected_broken' | 'validation_pending';
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
                .addSubcommand(sub =>
                    sub.setName("history")
                        .setDescription("Play songs from your watch history")
                        .addStringOption(opt => opt.setName("profile").setDescription("Cookie profile to use").setAutocomplete(true))
                        .addIntegerOption(opt => opt.setName("limit").setDescription("Number of songs (default: 25)").setMinValue(1).setMaxValue(50))
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
                } else if (subcommand === "history") {
                    await handleHistory(interaction, context, getProfiles, saveProfiles, logTelemetryEvent);
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

            // Use CookieManager to normalize and validate
            const validation = CookieManager.normalizeAndValidate(content);

            if (!validation.valid) {
                return reply.status(400).send({
                    error: "Invalid cookie content",
                    details: validation.error
                });
            }

            const newProfile: CookieProfile = {
                id: Math.random().toString(36).substring(7),
                name: profileName,
                content: validation.normalizedHeader,
                format: validation.format,
                createdAt: Date.now(),
                lastUsedAt: 0,
                playCount: 0,
                uniqueTrackCount: 0,
                status: 'validation_pending',
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

// --- Command Handlers ---

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

    // Write cookie to temp file (Netscape format for yt-dlp)
    let cookiePath: string;
    try {
        // Convert header to Netscape format for best yt-dlp compatibility
        const netscapeContent = CookieManager.toNetscape(profile.content);
        cookiePath = await context.writeCustomCookie(netscapeContent);
    } catch (error) {
        context.logger.error(`Failed to write custom cookie: ${error}`);

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

    try {
        await interaction.deferReply();

        // Discovery
        const result = await DiscoveryEngine.discoverSearch(term, limit, radio, profile.content, context.logger);

        if (result.error) {
            // Log error but try to proceed if we have IDs?
            // If error is present, usually IDs are empty or partial.
            context.logger.warn(`[MyMusic] Discovery warning: ${result.error}`);
        }

        if (result.tracks.length === 0) {
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

            await interaction.editReply({ content: errorMsg });
            return;
        }

        context.logger.info(`[MyMusic] Discovered ${result.tracks.length} tracks via ${result.source}`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: radio ? 'radio' : 'search'
        });

        // Playback
        await enqueueTracks(interaction, context, result.tracks, cookiePath, limit);

    } catch (error) {
        context.logger.error(`Failed to enqueue: ${error}`);

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

    // Write cookie to temp file
    let cookiePath: string;
    try {
        const netscapeContent = CookieManager.toNetscape(profile.content);
        cookiePath = await context.writeCustomCookie(netscapeContent);
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
        await interaction.deferReply();

        const result = await DiscoveryEngine.discoverSupermix(limit, profile.content, context.logger);

        if (result.tracks.length === 0) {
            logTelemetryEvent({
                type: 'MYMUSIC_PLAY_FAILED',
                userId,
                profileName: profile.name,
                playType: 'supermix',
                failureReason: 'empty_mix'
            });
            await interaction.editReply({ content: "❌ Could not generate Supermix." });
            return;
        }

        context.logger.info(`[MyMusic:Supermix] Discovered ${result.tracks.length} tracks via ${result.source}`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: 'supermix'
        });

        await enqueueTracks(interaction, context, result.tracks, cookiePath, limit);

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
        const netscapeContent = CookieManager.toNetscape(profile.content);
        cookiePath = await context.writeCustomCookie(netscapeContent);
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
        await interaction.deferReply();

        const result = await DiscoveryEngine.discoverMix(number, limit, profile.content, context.logger);

        if (result.tracks.length === 0) {
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

        context.logger.info(`[MyMusic] Discovered ${result.tracks.length} tracks for Mix ${number} via ${result.source}`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: 'mix'
        });

        await enqueueTracks(interaction, context, result.tracks, cookiePath, limit);

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
        const netscapeContent = CookieManager.toNetscape(profile.content);
        cookiePath = await context.writeCustomCookie(netscapeContent);
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
        await interaction.deferReply();

        const result = await DiscoveryEngine.discoverRecommended(limit, profile.content, context.logger);

        if (result.tracks.length === 0) {
            await interaction.editReply({ content: "❌ No results found." });
            return;
        }

        context.logger.info(`[MyMusic:Search] Discovered ${result.tracks.length} tracks via ${result.source}`);

        logTelemetryEvent({
            type: 'MYMUSIC_PLAY_STARTED',
            userId,
            profileName: profile.name,
            playType: 'recommended'
        });

        await enqueueTracks(interaction, context, result.tracks, cookiePath, limit);

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

    // Use CookieManager to normalize and validate
    const validation = CookieManager.normalizeAndValidate(content);

    if (!validation.valid) {
        await interaction.reply({
            content: `❌ Invalid cookie file: ${validation.error}`,
            ephemeral: true
        });
        return;
    }

    // Warn about missing auth cookies but still allow saving
    let responseMessage = `✅ Added cookie profile "**${profileName}**"!`;
    if (validation.warnings && validation.warnings.length > 0) {
        responseMessage += `\n\n⚠️ **Warnings:**\n${validation.warnings.map(w => `• ${w}`).join('\n')}`;
        responseMessage += `\n\nThe profile has been saved but may not work for all features.`;
    }

    const newProfile: CookieProfile = {
        id: Math.random().toString(36).substring(7),
        name: profileName,
        content: validation.normalizedHeader,
        format: validation.format,
        createdAt: Date.now(),
        lastUsedAt: 0,
        playCount: 0,
        uniqueTrackCount: 0,
        status: 'validation_pending', // Set to pending until first use
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

    const list = profiles.map(p => {
        const statusIcon = p.status === 'valid' ? '✅' : p.status === 'suspected_broken' ? '⚠️' : '⏳';
        return `- **${p.name}** ${statusIcon} (Used: ${p.playCount} times)${p.lastError ? `\n  - Error: ${p.lastError}` : ''}`;
    }).join("\n");
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

async function handleFeed(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>,
    logTelemetryEvent: (event: any) => void
) {
    await interaction.deferReply();
    const profileName = interaction.options.getString("profile");
    const limit = 25; // Default limit for feed

    try {
        const { profile, profiles } = await resolveProfile(interaction, getProfiles, profileName);
        if (!profile) return; // resolveProfile handles the reply

        let cookiePath: string;
        try {
            const netscapeContent = CookieManager.toNetscape(profile.content);
            cookiePath = await context.writeCustomCookie(netscapeContent);
        } catch (error) {
            await interaction.editReply("❌ Failed to process cookie.");
            return;
        }

        // Update stats
        profile.lastUsedAt = Date.now();
        profile.playCount = (profile.playCount || 0) + 1;
        await saveProfiles(interaction.user.id, profiles);

        logTelemetryEvent({
            type: 'mymusic_feed',
            userId: interaction.user.id,
            profileId: profile.id
        });

        context.logger.info(`[MyMusic:Feed] Fetching feed for user ${interaction.user.id} using profile ${profile.name}`);

        const result = await DiscoveryEngine.discoverRecommended(limit, profile.content, context.logger);

        if (result.error) {
            await interaction.editReply(`❌ Failed to fetch feed: ${result.error}`);
            return;
        }

        if (result.tracks.length === 0) {
            await interaction.editReply("⚠️ No tracks found in your feed.");
            return;
        }

        await enqueueTracks(interaction, context, result.tracks, cookiePath, limit);

    } catch (error) {
        context.logger.error(`[MyMusic:Feed] Error: ${error}`);
        await interaction.editReply("❌ An error occurred while fetching your feed.");
    }
}

async function handleHistory(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>,
    logTelemetryEvent: (event: any) => void
) {
    await interaction.deferReply();
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;

    try {
        const { profile, profiles } = await resolveProfile(interaction, getProfiles, profileName);
        if (!profile) return; // resolveProfile handles the reply

        let cookiePath: string;
        try {
            const netscapeContent = CookieManager.toNetscape(profile.content);
            cookiePath = await context.writeCustomCookie(netscapeContent);
        } catch (error) {
            await interaction.editReply("❌ Failed to process cookie.");
            return;
        }

        // Update stats
        profile.lastUsedAt = Date.now();
        profile.playCount = (profile.playCount || 0) + 1;
        await saveProfiles(interaction.user.id, profiles);

        logTelemetryEvent({
            type: 'mymusic_history',
            userId: interaction.user.id,
            profileId: profile.id
        });

        context.logger.info(`[MyMusic:History] Fetching history for user ${interaction.user.id} using profile ${profile.name}`);

        const result = await DiscoveryEngine.discoverHistory(limit, profile.content, context.logger);

        if (result.error) {
            await interaction.editReply(`❌ Failed to fetch history: ${result.error}`);
            return;
        }

        if (result.tracks.length === 0) {
            await interaction.editReply("⚠️ No tracks found in your history.");
            return;
        }

        await enqueueTracks(interaction, context, result.tracks, cookiePath, limit);

    } catch (error) {
        context.logger.error(`[MyMusic:History] Error: ${error}`);
        await interaction.editReply("❌ An error occurred while fetching your history.");
    }
}

async function resolveProfile(
    interaction: ChatInputCommandInteraction,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    profileName: string | null
): Promise<{ profile: CookieProfile | null, profiles: CookieProfile[] }> {
    const userId = interaction.user.id;
    const profiles = await getProfiles(userId);

    if (profiles.length === 0) {
        await interaction.editReply("❌ You don't have any cookie profiles set up.");
        return { profile: null, profiles };
    }

    let profile = profileName ? profiles.find(p => p.name === profileName) : profiles.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];

    if (!profile) {
        await interaction.editReply("❌ Profile not found.");
        return { profile: null, profiles };
    }

    return { profile, profiles };
}

export default MyMusicPlugin;

/**
 * Enqueues a list of tracks directly using the new enqueueSongs core method.
 */
async function enqueueTracks(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    tracks: DiscoveryTrack[],
    cookiePath: string,
    limit: number
) {
    if (tracks.length === 0) return;

    // Convert DiscoveryTrack to Song
    const songs = tracks.map(track => ({
        title: track.title,
        url: `https://www.youtube.com/watch?v=${track.id}`,
        thumbnail: track.thumbnail,
        durationInSec: track.duration || 0,
        requestedBy: interaction.user.tag,
        requesterId: interaction.user.id
    }));

    context.logger.info(`[MyMusic] Enqueuing ${songs.length} tracks directly`);

    await enqueueSongs(interaction, songs, { cookiePath, limit });
}
