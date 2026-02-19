import config from '../config/config.js';
import logger from './logger.js';
import workerPool from './worker-pool.js';

/**
 * Sends an announcement to the configured announcement channel.
 * @param {string} message - The message content to send.
 * @returns {Promise<void>}
 */
export async function sendAnnouncement(message: string): Promise<void> {
    const announceChannelId = config.announceChannelId;
    if (!announceChannelId) return;

    const controller = workerPool.getController();
    if (!controller) return;

    // Wait for client to be ready if needed
    if (!controller.client.isReady()) {
        logger.info('[announcer] Waiting for controller to be ready...');
        await new Promise<void>((resolve) => {
            const onReady = () => {
                resolve();
                controller.client.removeListener('clientReady', onReady);
            };
            controller.client.once('clientReady', onReady);

            // Fallback timeout in case ready event never fires (e.g. disconnected)
            setTimeout(() => {
                controller.client.removeListener('clientReady', onReady);
                resolve(); // Resolve anyway to attempt send (which will likely fail but won't hang)
            }, 10000);
        });
    }

    if (controller.client.isReady()) {
        try {
            const channel = await controller.client.channels.fetch(announceChannelId);
            if (channel && channel.isTextBased() && !channel.isDMBased()) {
                await channel.send(message);
                logger.info(`[announcer] Sent announcement to ${announceChannelId}`);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[announcer] Failed to send announcement: ${msg}`);
        }
    } else {
        logger.warn('[announcer] Controller not ready after waiting, skipping announcement.');
    }
}
