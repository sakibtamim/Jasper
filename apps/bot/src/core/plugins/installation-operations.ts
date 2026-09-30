import {
    ApplicationMembershipSnapshot,
    DrainResult,
    GuildScope,
    InstallationRuntimeOperations,
} from '@jasper/types';

import { deleteQueue, getQueue } from '../audio/queue-manager.js';
import logger from '../logger.js';
import workerPool from '../worker-pool.js';

export class DefaultInstallationRuntimeOperations implements InstallationRuntimeOperations {
    private currentFenceEpoch: number;

    constructor(initialFenceEpoch: number = 1) {
        this.currentFenceEpoch = initialFenceEpoch;
    }

    setFenceEpoch(epoch: number): void {
        this.currentFenceEpoch = epoch;
    }

    async snapshot(scope: GuildScope): Promise<ApplicationMembershipSnapshot> {
        const workers = workerPool.getWorkers().filter((w) => w.guildId === scope.guildId);
        const members: Array<{ userId: string; role: string }> = [];

        for (const worker of workers) {
            if (worker.client?.isReady()) {
                const guild = worker.client.guilds.cache.get(scope.guildId);
                if (guild) {
                    members.push({
                        userId: guild.ownerId,
                        role: 'owner',
                    });
                }
            }
        }

        return {
            scope,
            applicationId: scope.installationId ?? scope.guildId,
            fenceEpoch: this.currentFenceEpoch,
            members,
            timestamp: new Date(),
        };
    }

    async drain(scope: GuildScope, operationId: string): Promise<DrainResult> {
        logger.info(
            `[installation-ops] Draining queues for guild ${scope.guildId} (operation: ${operationId})`,
        );

        let drainedQueues = 0;
        let releasedWorkers = 0;

        const workers = workerPool.getWorkers().filter((w) => w.guildId === scope.guildId);

        for (const worker of workers) {
            if (worker.voiceChannelId) {
                const queue = getQueue(worker.voiceChannelId);
                if (queue) {
                    deleteQueue(worker.voiceChannelId);
                    drainedQueues++;
                }
                workerPool.releaseWorker(worker.voiceChannelId);
                releasedWorkers++;
            }
        }

        return {
            operationId,
            drainedQueues,
            releasedWorkers,
            completedAt: new Date(),
        };
    }

    async leaveApplication(
        scope: GuildScope,
        applicationId: string,
        operationId: string,
        expectedFence: number,
    ): Promise<void> {
        if (expectedFence !== this.currentFenceEpoch) {
            throw new Error(
                `Fence check failed during leaveApplication for ${scope.guildId}: expected fence ${expectedFence}, current fence is ${this.currentFenceEpoch}`,
            );
        }

        logger.info(
            `[installation-ops] Leaving application ${applicationId} for guild ${scope.guildId} (operation: ${operationId}, fence: ${expectedFence})`,
        );

        await this.drain(scope, operationId);
    }
}
