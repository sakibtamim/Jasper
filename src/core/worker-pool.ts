import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import logger from "./logger.js";
import bots from "../config/bots.js";

// Registry to hold all worker states
const workers: WorkerState[] = [];

export interface WorkerState {
    name: string;
    client: Client;
    role: 'controller' | 'worker';
    token: string;
    busy: boolean;
    guildId: string | null;
    voiceChannelId: string | null;
}

/**
 * Create all bot clients defined in config but do not login yet
 * @returns {WorkerState[]}
 */
function createBots(): WorkerState[] {
    if (workers.length > 0) return workers;

    for (const botConfig of bots) {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
            ],
        });

        workers.push({
            name: botConfig.name,
            client: client,
            role: botConfig.role,
            token: botConfig.token,
            busy: false,
            guildId: null,
            voiceChannelId: null,
        });
    }

    logger.info(`Initialized ${workers.length} bots.`);
    return workers;
}

/**
 * Login all bots
 * @returns {Promise<void>}
 */
async function loginBots(): Promise<void> {
    const loginPromises = workers.map(async (worker) => {
        try {
            await worker.client.login(worker.token);
            logger.info(`Logged in as ${worker.name}`);

            if (worker.role === 'worker') {
                worker.client.user?.setPresence({
                    activities: [{ name: "Waiting for tasks...", type: ActivityType.Custom }],
                    status: "idle",
                });
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to login ${worker.name}: ${msg}`);
        }
    });
    await Promise.all(loginPromises);
}

/**
 * Get the controller worker (Jasper)
 * @returns {WorkerState|undefined}
 */
function getController(): WorkerState | undefined {
    return workers.find((w) => w.role === "controller");
}

/**
 * Find a worker already assigned to a specific voice channel
 * @param {string} guildId
 * @param {string} voiceChannelId
 * @returns {WorkerState|null}
 */
function findWorkerByVoiceChannel(guildId: string, voiceChannelId: string): WorkerState | null {
    return (
        workers.find(
            (w) => w.guildId === guildId && w.voiceChannelId === voiceChannelId
        ) || null
    );
}

/**
 * Allocate a worker for a voice channel.
 * Priority:
 * 1. Worker already in that channel.
 * 2. Idle worker bot.
 * 3. Idle controller bot (if enabled/allowed).
 * @param {string} guildId
 * @param {string} voiceChannelId
 * @returns {WorkerState|null}
 */
function allocateWorker(guildId: string, voiceChannelId: string): WorkerState | null {
    // 1. Check if someone is already there
    const existing = findWorkerByVoiceChannel(guildId, voiceChannelId);
    if (existing) return existing;

    // 2. Check if Controller (Jasper) is free (Prioritize Leader)
    const controller = getController();
    if (controller && !controller.busy) {
        return controller;
    }

    // 3. Find an idle worker
    const idleWorker = workers.find(
        (w) => w.role === "worker" && !w.busy
    );

    if (idleWorker) {
        return idleWorker;
    }

    // 4. Everyone is busy
    return null;
}

/**
 * Mark a worker as busy in a channel
 * @param {WorkerState} worker
 * @param {string} guildId
 * @param {string} voiceChannelId
 */
function setWorkerBusy(worker: WorkerState, guildId: string, voiceChannelId: string): void {
    worker.busy = true;
    worker.guildId = guildId;
    worker.voiceChannelId = voiceChannelId;
    logger.info(
        `[WorkerPool] ${worker.name} assigned to guild ${guildId} channel ${voiceChannelId}`
    );
}

/**
 * Release a worker (mark as idle)
 * @param {string} voiceChannelId
 */
function releaseWorker(voiceChannelId: string): void {
    const worker = workers.find((w) => w.voiceChannelId === voiceChannelId);
    if (worker) {
        logger.info(
            `[WorkerPool] ${worker.name} released from channel ${voiceChannelId}`
        );
        worker.busy = false;
        worker.guildId = null;
        worker.voiceChannelId = null;
    }
}

/**
 * Release all workers to idle state
 */
function releaseAllWorkers(): void {
    for (const worker of workers) {
        worker.busy = false;
        worker.guildId = null;
        worker.voiceChannelId = null;
    }
    logger.info("[WorkerPool] All workers released to idle state");
}

export default {
    createBots,
    loginBots,
    getController,
    allocateWorker,
    findWorkerByVoiceChannel,
    setWorkerBusy,
    releaseWorker,
    getWorkers: (): WorkerState[] => [...workers], // Return a copy for inspection
    releaseAllWorkers,
};
