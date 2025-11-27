import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { Client } from "discord.js";
import logger from "../core/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/utils/event-loader.ts)
const SRC_DIR = path.resolve(__dirname, "..");

export async function loadEvents(client: Client): Promise<void> {
    const eventsPath = path.join(SRC_DIR, "events");
    
    if (!fs.existsSync(eventsPath)) {
        logger.warn(`[event-loader] Events directory not found at ${eventsPath}`);
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js") || file.endsWith(".ts"));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const eventModule = await import(filePath);
            const event = eventModule.default;
            
            if (!event || !event.name || !event.execute) {
                logger.warn(`[event-loader] Event file ${file} is missing required exports (name, execute).`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            logger.debug(`[event-loader] Registered event ${event.name} for ${client.user?.tag || 'unknown client'}`);
        } catch (error) {
            logger.error(`[event-loader] Failed to load event ${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
