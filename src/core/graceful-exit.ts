import logger from "./logger.js";
import musicPlayer from "./music-player.js";
import workerPool from "./worker-pool.js";
import { sendAnnouncement } from "./announcer.js";
import { TextChannel } from "discord.js";

let isShuttingDown = false;

/**
 * Handles the graceful exit of the application.
 * @param {string} reason - The reason for the exit (e.g., 'SIGINT', 'SIGTERM', 'uncaughtException').
 * @param {Error} [error] - Optional error object if the exit is due to an error.
 */
export async function handleGracefulExit(reason: string, error?: Error): Promise<void> {
    if (isShuttingDown) {
        logger.warn(`[GracefulExit] Shutdown already in progress (Reason: ${reason})`);
        return;
    }

    isShuttingDown = true;
    logger.info(`[GracefulExit] Initiated (Reason: ${reason})`);

    if (error) {
        logger.error(`[GracefulExit] Error details: ${error.stack || error.message}`);
    }

    // 1. Announce shutdown if configured
    await sendAnnouncement("🛑 **Jasper System Shutdown Initiated**\nGoing offline for maintenance or restart. All active queues will be cleared.");

    // 2. Clear all queues and connections
    try {
        musicPlayer.clearAllQueues();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[GracefulExit] Error clearing queues: ${msg}`);
    }

    // 3. Release all workers (resets state)
    try {
        workerPool.releaseAllWorkers();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[GracefulExit] Error releasing workers: ${msg}`);
    }

    // 4. Destroy all discord clients
    logger.info("[GracefulExit] Destroying bot clients...");
    const workers = workerPool.getWorkers();
    await Promise.all(workers.map(async (worker) => {
        try {
            await worker.client.destroy();
            logger.info(`[GracefulExit] Destroyed client for ${worker.name}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[GracefulExit] Error destroying client for ${worker.name}: ${msg}`);
        }
    }));

    logger.info("[GracefulExit] Cleanup complete. Exiting process.");
    process.exit(error ? 1 : 0);
}
