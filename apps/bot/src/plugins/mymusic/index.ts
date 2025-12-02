import { Plugin, PluginContext } from "@jasper/types";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

interface CookieProfile {
    id: string;
    name: string;
    content: string;
    createdAt: number;
    lastUsedAt: number;
    playCount: number;
}

const MyMusicPlugin: Plugin = {
    name: "mymusic",
    version: "1.0.0",
    description: "Personalized music experience with per-user cookies.",

    onLoad: async (context: PluginContext) => {
        context.logger.info("My Music Plugin loaded!");

        // --- Database Helpers ---
        const getProfiles = async (userId: string): Promise<CookieProfile[]> => {
            return (await context.db.plugin.get(`profiles:${userId}`)) || [];
        };

        const saveProfiles = async (userId: string, profiles: CookieProfile[]) => {
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
            // Don't send full content to UI for security/size, just metadata
            const safeProfiles = profiles.map(p => ({
                id: p.id,
                name: p.name,
                createdAt: p.createdAt,
                lastUsedAt: p.lastUsedAt,
                playCount: p.playCount,
                hasContent: !!p.content
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
                playCount: 0
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

async function handleSearch(
    interaction: ChatInputCommandInteraction,
    context: PluginContext,
    getProfiles: (userId: string) => Promise<CookieProfile[]>,
    saveProfiles: (userId: string, profiles: CookieProfile[]) => Promise<void>
) {
    const term = interaction.options.getString("term", true);
    const profileName = interaction.options.getString("profile");
    const limit = interaction.options.getInteger("limit") || 25;
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

    // Enqueue
    try {
        // If it looks like a playlist search (or default supermix), use playlist search
        if (term.toLowerCase().includes("mix") || term.includes("list=")) {
            // Use ytsearch:playlist to find a playlist if it's a search term
            const query = term.includes("list=") ? term : `ytsearch1:playlist:${term}`;
            await context.music.enqueuePlaylist(interaction, query, { cookiePath, limit });
        } else {
            // For single songs, we don't strictly need limit, but enqueue doesn't support it yet.
            // If we want to support search results limit, we'd need to update enqueue too.
            // For now, enqueue just plays the first result.
            await context.music.enqueue(interaction, term, cookiePath);
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
        // Explicitly search for "My Supermix" playlist
        await context.music.enqueuePlaylist(interaction, "ytsearch1:playlist:My Supermix", { cookiePath, limit });
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
        // Explicitly search for "My Mix [N]" playlist
        await context.music.enqueuePlaylist(interaction, `ytsearch1:playlist:My Mix ${number}`, { cookiePath, limit });
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

    // Basic validation of netscape format (optional but good)
    if (!content.includes(".google.com") && !content.includes(".youtube.com")) {
        await interaction.reply({ content: "⚠️ That doesn't look like a valid YouTube/Google cookie. Please ensure it's in Netscape format.", ephemeral: true });
        return;
    }

    const newProfile: CookieProfile = {
        id: Math.random().toString(36).substring(7),
        name: profileName,
        content,
        createdAt: Date.now(),
        lastUsedAt: 0,
        playCount: 0
    };

    profiles.push(newProfile);
    await saveProfiles(userId, profiles);

    await interaction.reply({ content: `✅ Added cookie profile "**${profileName}**"!`, ephemeral: true });
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
