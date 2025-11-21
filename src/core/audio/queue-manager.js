import logger from "../logger.js";
import { setVoiceStatus } from "../utils/voice-utils.js";
import workerPool from "../worker-pool.js";

const queues = new Map(); // Key: voiceChannelId

export function getQueue(voiceChannelId) {
    return queues.get(voiceChannelId);
}

export function getAllQueues() {
    return queues;
}

export function setQueue(voiceChannelId, queue) {
    queues.set(voiceChannelId, queue);
}

export function deleteQueue(voiceChannelId) {
    queues.delete(voiceChannelId);
}

export function cleanupWorkerOldQueues(worker) {
    // Find any queues that belong to this worker
    for (const [channelId, queue] of queues.entries()) {
        if (queue.worker.name === worker.name) {
            logger.info(
                `[Cleanup] Found old queue for ${worker.name} in channel ${channelId}, cleaning up before reassignment`
            );

            // Clear idle timeout
            if (queue.idleTimeout) {
                clearTimeout(queue.idleTimeout);
            }

            // Clear voice status
            setVoiceStatus(worker.client, channelId, "");

            // Destroy connection
            if (queue.connection) {
                queue.connection.destroy();
            }

            // Remove from map
            queues.delete(channelId);
        }
    }
}

export function clearAllQueues() {
    logger.info(`[CatastrophicReset] Clearing ${queues.size} active queues`);

    for (const [channelId, queue] of queues.entries()) {
        // Clear idle timeout
        if (queue.idleTimeout) {
            clearTimeout(queue.idleTimeout);
        }

        // Clear voice status
        setVoiceStatus(queue.worker.client, channelId, "");

        // Destroy connection
        if (queue.connection) {
            queue.connection.destroy();
        }

        // Release worker
        workerPool.releaseWorker(channelId);
    }

    queues.clear();
    logger.info("[CatastrophicReset] All queues cleared");
}
