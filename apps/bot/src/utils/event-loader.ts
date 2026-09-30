import { Client, Events } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import logger from '../core/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the root 'src' directory based on this file's location (src/utils/event-loader.ts)
// We assume this file is always in src/utils
const EVENTS_DIR = path.join(__dirname, '..', 'events');

/**
 * Worker bots are restricted to lifecycle and voice events only.
 * They MUST NOT register interactionCreate listeners.
 */
export const WORKER_ALLOWED_EVENTS = new Set<string>([Events.ClientReady, Events.VoiceStateUpdate]);

export async function loadEvents(
    client: Client,
    workerName: string = 'Unknown Bot',
    role?: 'controller' | 'worker',
    eventsDir: string = EVENTS_DIR,
): Promise<void> {
    if (!fs.existsSync(eventsDir)) {
        logger.warn(`[event-loader] Events directory not found at ${eventsDir}`);
        return;
    }

    const effectiveRole: 'controller' | 'worker' =
        role ?? (client as unknown as { role?: 'controller' | 'worker' }).role ?? 'worker';

    const eventFiles = (await fs.promises.readdir(eventsDir)).filter(
        (file) => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts'),
    );

    for (const file of eventFiles) {
        const filePath = path.join(eventsDir, file);
        try {
            const eventModule = await import(filePath);
            const event = eventModule.default;

            if (!event || !event.name || !event.execute) {
                logger.warn(
                    `[event-loader] Event file ${file} is missing required exports (name, execute).`,
                );
                continue;
            }

            // Event separation: Worker clients MUST NOT register interactionCreate listeners.
            // Only controller registers interactionCreate. Workers only register ready and voiceStateUpdate.
            if (effectiveRole === 'worker' && !WORKER_ALLOWED_EVENTS.has(event.name)) {
                logger.debug(
                    `[event-loader] Skipping event ${event.name} for worker ${workerName} (workers only handle ready and voiceStateUpdate)`,
                );
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            logger.debug(`[event-loader] Registered event ${event.name} for ${workerName}`);
        } catch (error) {
            logger.error(
                `[event-loader] Failed to load event ${file}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}
