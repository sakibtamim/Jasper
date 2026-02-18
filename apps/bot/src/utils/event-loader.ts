import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { Client } from "discord.js";
import logger from "../core/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/utils/event-loader.ts)
// We assume this file is always in src/utils
const EVENTS_DIR = path.join(__dirname, "..", "events");

export async function loadEvents(
  client: Client,
  workerName: string = "Unknown Bot",
): Promise<void> {
  if (!fs.existsSync(EVENTS_DIR)) {
    logger.warn(`[event-loader] Events directory not found at ${EVENTS_DIR}`);
    return;
  }

  const eventFiles = (await fs.promises.readdir(EVENTS_DIR)).filter(
    (file) =>
      (file.endsWith(".js") || file.endsWith(".ts")) &&
      !file.endsWith(".d.ts"),
  );

  for (const file of eventFiles) {
    const filePath = path.join(EVENTS_DIR, file);
    try {
      const eventModule = await import(filePath);
      const event = eventModule.default;

      if (!event || !event.name || !event.execute) {
        logger.warn(
          `[event-loader] Event file ${file} is missing required exports (name, execute).`,
        );
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      logger.debug(
        `[event-loader] Registered event ${event.name} for ${workerName}`,
      );
    } catch (error) {
      logger.error(
        `[event-loader] Failed to load event ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
