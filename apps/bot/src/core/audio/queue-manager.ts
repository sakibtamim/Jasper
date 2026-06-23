import { Queue, WorkerState } from '@jasper/types';

import logger from '../logger.js';
import { setVoiceStatus } from '../utils/voice-utils.js';
import workerPool from '../worker-pool.js';

// Map<VoiceChannelId, QueueObject>
const queues = new Map<string, Queue>();

/**
 * Get the queue for a specific voice channel
 * @param {string} voiceChannelId
 * @returns {Queue|undefined}
 */
export function getQueue(voiceChannelId: string): Queue | undefined {
    return queues.get(voiceChannelId);
}

/**
 * Get all active queues
 * @returns {Map<string, Queue>}
 */
export function getAllQueues(): Map<string, Queue> {
    return queues;
}

/**
 * Set the queue for a specific voice channel
 * @param {string} voiceChannelId
 * @param {Queue} queue
 */
export function setQueue(voiceChannelId: string, queue: Queue): void {
    queues.set(voiceChannelId, queue);
}

/**
 * Delete the queue for a specific voice channel
 * @param {string} voiceChannelId
 */
export function deleteQueue(voiceChannelId: string): void {
    queues.delete(voiceChannelId);
}

/**
 * Cleanup any old queues associated with a worker
 * This is important if a worker was forcefully reassigned or crashed
 * @param {WorkerState} worker
 */
export function cleanupWorkerOldQueues(worker: WorkerState): void {
    // Find any queues that belong to this worker
    for (const [channelId, queue] of queues.entries()) {
        if (queue.worker.name === worker.name) {
            logger.info(
                `[cleanup] Found old queue for ${worker.name} in channel ${channelId}, cleaning up before reassignment`,
            );

            // Clear idle timeout
            if (queue.idleTimeout) {
                clearTimeout(queue.idleTimeout);
            }

            // Clear voice status
            setVoiceStatus(worker.client, channelId, '');

            // Kill stream process
            if (queue.streamProcess) {
                try {
                    logger.info(
                        `[cleanup] Killing stream process (PID: ${queue.streamProcess.pid}) for channel ${channelId}`,
                    );
                    queue.streamProcess.kill('SIGKILL');
                } catch {
                    // Ignore error when killing process
                }
                queue.streamProcess = null;
            }

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
    logger.info(`[catastrophicreset] Clearing ${queues.size} active queues`);

    for (const [channelId, queue] of queues.entries()) {
        // Clear idle timeout
        if (queue.idleTimeout) {
            clearTimeout(queue.idleTimeout);
        }

        // Clear voice status
        setVoiceStatus(queue.worker.client, channelId, '');

        // Kill stream process
        if (queue.streamProcess) {
            try {
                logger.info(
                    `[cleanup] Killing stream process (PID: ${queue.streamProcess.pid}) for channel ${channelId}`,
                );
                queue.streamProcess.kill('SIGKILL');
            } catch {
                // Ignore error when killing process
            }
            queue.streamProcess = null;
        }

        // Destroy connection
        if (queue.connection) {
            queue.connection.destroy();
        }

        // Release worker
        workerPool.releaseWorker(channelId);
    }

    queues.clear();
    logger.info('[catastrophicreset] All queues cleared');
}
