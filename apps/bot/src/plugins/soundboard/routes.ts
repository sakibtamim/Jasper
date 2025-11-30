import { PluginContext } from "../../core/plugins/plugin-interface.js";
import { Sound, Play, SoundboardStats } from "./types.js";
import { randomUUID } from "crypto";

export const registerRoutes = (context: PluginContext) => {
    const { server, db, storage } = context;

    // Helper to get sounds
    const getSounds = async (): Promise<Sound[]> => {
        return (await db.plugin.get("sounds") as Sound[]) || [];
    };

    // Helper to save sounds
    const saveSounds = async (sounds: Sound[]) => {
        await db.plugin.set("sounds", sounds);
    };

    // Helper to get plays
    const getPlays = async (): Promise<Play[]> => {
        return (await db.plugin.get("plays") as Play[]) || [];
    };

    // GET /api/plugins/soundboard/sounds
    server.get("/sounds", async (req, reply) => {
        const sounds = await getSounds();
        return { sounds };
    });

    // POST /api/plugins/soundboard/sounds
    server.post("/sounds", async (req, reply) => {
        const body = req.body as { name: string; emoji: string; fileUri: string };

        if (!body.name || !body.emoji || !body.fileUri) {
            return reply.code(400).send({ error: "Missing required fields" });
        }

        // Basic validation
        if (body.name.length > 32) return reply.code(400).send({ error: "Name too long" });

        // TODO: Validate fileUri format if needed

        const sounds = await getSounds();
        const newSound: Sound = {
            id: randomUUID(),
            name: body.name,
            emoji: body.emoji,
            fileUri: body.fileUri,
            createdAt: Date.now(),
            createdByUserId: "dashboard-user", // Placeholder until we have user context in request
        };

        sounds.push(newSound);
        await saveSounds(sounds);

        return newSound;
    });

    // DELETE /api/plugins/soundboard/sounds/:id
    server.delete("/sounds/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const sounds = await getSounds();
        const soundIndex = sounds.findIndex(s => s.id === id);

        if (soundIndex === -1) {
            return reply.code(404).send({ error: "Sound not found" });
        }

        const sound = sounds[soundIndex];

        // Delete file from storage
        // fileUri is like "storage://soundboard/filename.mp3" or just "filename.mp3" depending on how usePluginStorage returns it.
        // The storage.delete expects the filename relative to plugin storage.
        // Assuming fileUri stored is just the filename or we need to parse it.
        // Let's assume for now it stores the filename as returned by upload().
        // If it stores full URI, we might need to strip prefix.
        // Checking PLUGINS_DEV.md: "Save a file (returns a URI like storage://my-plugin/image.png)"
        // "Delete a file ... await context.storage.delete("image.png");"
        // So we need to extract the filename.

        let filename = sound.fileUri;
        if (filename.startsWith("storage://")) {
            const parts = filename.split("/");
            filename = parts[parts.length - 1];
        }

        try {
            await storage.delete(filename);
        } catch (err) {
            context.logger.warn(`Failed to delete file ${filename}: ${err}`);
            // Continue deleting metadata even if file delete fails (maybe already gone)
        }

        sounds.splice(soundIndex, 1);
        await saveSounds(sounds);

        return { success: true };
    });

    // GET /api/plugins/soundboard/stats
    server.get("/stats", async (req, reply) => {
        const plays = await getPlays();
        const sounds = await getSounds();

        const soundMap = new Map<string, { name: string, emoji: string, count: number }>();

        // Initialize map with 0 counts
        for (const sound of sounds) {
            soundMap.set(sound.id, { name: sound.name, emoji: sound.emoji, count: 0 });
        }

        // Count plays
        for (const play of plays) {
            const entry = soundMap.get(play.soundId);
            if (entry) {
                entry.count++;
            } else {
                // Sound might have been deleted, but we have snapshot
                // We could include deleted sounds in stats if we want
            }
        }

        const topSounds = Array.from(soundMap.entries())
            .map(([id, data]) => ({ soundId: id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalPlays: plays.length,
            topSounds
        };
    });

    // DELETE /api/plugins/soundboard/data (Debug: Clear all data)
    server.delete("/data", async (req, reply) => {
        await db.plugin.set("sounds", []);
        await db.plugin.set("plays", []);
        return { success: true, message: "All data cleared" };
    });
};
