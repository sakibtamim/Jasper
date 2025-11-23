import workerPool from "./worker-pool.js";
import logger from "./logger.js";
import config from "../config/config.js";

/**
 * Sends an announcement to the configured announcement channel.
 * @param {string} message - The message content to send.
 * @returns {Promise<void>}
 */
export async function sendAnnouncement(message: string): Promise<void> {
    const announceChannelId = config.announceChannelId;
    if (!announceChannelId) return;

    const controller = workerPool.getController();
    if (controller && controller.client.isReady()) {
        try {
            const channel = await controller.client.channels.fetch(announceChannelId);
            if (channel && channel.isTextBased() && !channel.isDMBased()) {
                await channel.send(message);
                logger.info(`[Announcer] Sent announcement to ${announceChannelId}`);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`[Announcer] Failed to send announcement: ${msg}`);
        }
    }
}
