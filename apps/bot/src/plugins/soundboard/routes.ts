import { PluginContext } from "@jasper/types";
import { SoundService } from "./services/sound-service.js";

export const registerRoutes = (context: PluginContext) => {
    const { server } = context;
    const soundService = new SoundService(context);

    // GET /api/plugins/soundboard/sounds
    server.get("/sounds", async (req, reply) => {
        const sounds = await soundService.getSounds();
        return { sounds };
    });

    // POST /api/plugins/soundboard/sounds
    server.post("/sounds", async (req, reply) => {
        const body = req.body as { name: string; emoji: string; fileUri: string };

        if (!body.name || !body.emoji || !body.fileUri) {
            return reply.code(400).send({ error: "Missing required fields" });
        }

        if (body.name.length > 32) return reply.code(400).send({ error: "Name too long" });
        if (body.emoji.length > 10) return reply.code(400).send({ error: "Emoji too long" });

        const newSound = await soundService.addSound(
            body.name,
            body.emoji,
            body.fileUri,
            "dashboard-user" // Placeholder
        );

        return newSound;
    });

    // DELETE /api/plugins/soundboard/sounds/:id
    server.delete("/sounds/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const success = await soundService.deleteSound(id);

        if (!success) {
            return reply.code(404).send({ error: "Sound not found" });
        }

        return { success: true };
    });

    // PATCH /api/plugins/soundboard/sounds/:id
    server.patch("/sounds/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = req.body as { name?: string; emoji?: string };

        if (!body.name && !body.emoji) {
            return reply.code(400).send({ error: "No updates provided" });
        }

        if (body.name && body.name.length > 32) return reply.code(400).send({ error: "Name too long" });
        if (body.emoji && body.emoji.length > 10) return reply.code(400).send({ error: "Emoji too long" });

        const updatedSound = await soundService.updateSound(id, body);

        if (!updatedSound) {
            return reply.code(404).send({ error: "Sound not found" });
        }

        return updatedSound;
    });

    // GET /api/plugins/soundboard/stats
    server.get("/stats", async (req, reply) => {
        return await soundService.getStats();
    });

    // DELETE /api/plugins/soundboard/data (Debug: Clear all data)
    // WARNING: This is a destructive operation - requires authentication
    server.delete("/data", async (req, reply) => {
        // Check if user is authenticated (req.user is set by auth middleware)
        if (!req.user) {
            return reply.code(401).send({ error: "Authentication required" });
        }

        await context.db.plugin.set("sounds", []);
        await context.db.plugin.set("plays", []);
        return { success: true, message: "All data cleared" };
    });
};
