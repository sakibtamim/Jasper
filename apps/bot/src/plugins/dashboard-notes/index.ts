import { Plugin, PluginContext } from "@jasper/types";

interface Note {
    id: string;
    content: string;
    createdAt: number;
}

const DashboardNotesPlugin: Plugin = {
    name: "Dashboard Notes",
    version: "1.0.0",

    onLoad: async (context: PluginContext) => {
        context.logger.info("Dashboard Notes plugin loaded!");

        // Helper to get notes
        const getNotes = async (): Promise<Note[]> => {
            return (await context.db.plugin.get("notes") as Note[]) || [];
        };

        // Helper to save notes
        const saveNotes = async (notes: Note[]) => {
            await context.db.plugin.set("notes", notes);
        };

        // GET /api/plugins/dashboard-notes/notes
        context.server.get("/notes", async (req, reply) => {
            const notes = await getNotes();
            return { notes };
        });

        // POST /api/plugins/dashboard-notes/notes
        context.server.post("/notes", async (req, reply) => {
            const body = req.body as { content: string };
            if (!body.content) {
                return reply.code(400).send({ error: "Content is required" });
            }

            const notes = await getNotes();
            const newNote: Note = {
                id: Math.random().toString(36).substring(7),
                content: body.content,
                createdAt: Date.now()
            };

            notes.unshift(newNote); // Add to top
            await saveNotes(notes);

            return newNote;
        });

        // DELETE /api/plugins/dashboard-notes/notes/:id
        context.server.delete("/notes/:id", async (req, reply) => {
            const { id } = req.params as { id: string };
            const notes = await getNotes();
            const filtered = notes.filter(n => n.id !== id);

            if (notes.length === filtered.length) {
                return reply.code(404).send({ error: "Note not found" });
            }

            await saveNotes(filtered);
            return { success: true };
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Dashboard Notes plugin unloaded!");
    }
};

export default DashboardNotesPlugin;
