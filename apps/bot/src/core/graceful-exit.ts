import { sendAnnouncement } from './announcer.js';
import logger from './logger.js';
import musicPlayer from './music-player.js';
import workerPool from './worker-pool.js';

let isShuttingDown = false;

/**
 * Handles the graceful exit of the application.
 * @param {string} reason - The reason for the exit (e.g., 'SIGINT', 'SIGTERM', 'uncaughtException').
 * @param {Error} [error] - Optional error object if the exit is due to an error.
 */
export async function handleGracefulExit(reason: string, error?: Error): Promise<void> {
    if (isShuttingDown) {
        logger.warn(`[gracefulexit] Shutdown already in progress (Reason: ${reason})`);
        return;
    }

    isShuttingDown = true;
    logger.info(`[gracefulexit] Initiated (Reason: ${reason})`);

    // Set a safety timeout to force exit if cleanup hangs (e.g. if Discord is down)
    setTimeout(() => {
        logger.error('[gracefulexit] Shutdown cleanup timed out after 15 seconds, forcing exit.');
        process.exit(1);
    }, 15000).unref();

    if (error) {
        logger.error(`[gracefulexit] Error details: ${error.stack || error.message}`);
    }

    // 1. Announce shutdown if configured
    await sendAnnouncement(
        '🛑 **Jasper System Shutdown Initiated**\nGoing offline for maintenance or restart. All active queues will be cleared.',
    );

    // 2. Clear all queues and connections
    try {
        musicPlayer.clearAllQueues();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[gracefulexit] Error clearing queues: ${msg}`);
    }

    // 3. Release all workers (resets state)
    try {
        workerPool.releaseAllWorkers();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[gracefulexit] Error releasing workers: ${msg}`);
    }

    // 4. Destroy all discord clients
    logger.info('[gracefulexit] Destroying bot clients...');
    const workers = workerPool.getWorkers();
    await Promise.all(
        workers.map(async (worker) => {
            try {
                await worker.client.destroy();
                logger.info(`[gracefulexit] Destroyed client for ${worker.name}`);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(`[gracefulexit] Error destroying client for ${worker.name}: ${msg}`);
            }
        }),
    );

    logger.info('[gracefulexit] Cleanup complete. Exiting process.');
    process.exit(error ? 1 : 0);
}
