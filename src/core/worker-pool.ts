import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import logger from "./logger.js";
import bots from "../config/bots.js";
import { JASPER_WEIGHT } from "../config/afr-config.js";
import { loadEvents } from "../utils/event-loader.js";

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

    logger.info(`[workerpool] Initialized ${workers.length} bots.`);
    return workers;
}

/**
 * Login all bots
 * @returns {Promise<void>}
 */
async function loginBots(): Promise<void> {
    const loginPromises = workers.map(async (worker) => {
        try {
            // Load events for this worker
            await loadEvents(worker.client, worker.name);

            await worker.client.login(worker.token);
            logger.info(`[${worker.name}] Logged in as ${worker.role}${worker.role === 'controller' ? ' (Leader)' : ''}`);

            // Set initial presence for all bots
            if (worker.role === 'worker') {
                worker.client.user?.setPresence({
                    activities: [{ name: "Waiting for tasks...", type: ActivityType.Custom }],
                    status: "idle",
                });
            } else if (worker.role === 'controller') {
                worker.client.user?.setPresence({
                    activities: [{ name: "Managing the Heavenly Council", type: ActivityType.Custom }],
                    status: "idle",
                });
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[workerpool] Failed to login ${worker.name}: ${msg}`);
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
 * Select a feline using AFR (Automatic Feline Rotation) logic.
 * 
 * AFR Selection Rules:
 * 1. If Jasper is eligible:
 *    - With JASPER_WEIGHT probability: select Jasper
 *    - Otherwise: randomly select from eligible non-Jasper workers
 * 2. If Jasper is not eligible:
 *    - Randomly select from eligible workers
 * 
 * @param {WorkerState[]} eligibleWorkers - List of workers that are not busy
 * @returns {WorkerState} - The selected worker
 */
function selectFelineWithAFR(eligibleWorkers: WorkerState[]): WorkerState {
    // Single-pass partition: separate Jasper from other workers
    let jasper: WorkerState | undefined;
    const nonJasperWorkers: WorkerState[] = [];

    for (const worker of eligibleWorkers) {
        if (worker.role === "controller") {
            jasper = worker;
        } else {
            nonJasperWorkers.push(worker);
        }
    }

    if (!jasper) {
        // Jasper not available, randomly select from eligible workers
        const randomIndex = Math.floor(Math.random() * eligibleWorkers.length);
        const selected = eligibleWorkers[randomIndex];
        logger.info(
            `[afr] Jasper not eligible. Randomly selected ${selected.name} from ${eligibleWorkers.length} eligible workers.`
        );
        return selected;
    }

    // Jasper is eligible
    const roll = Math.random();

    if (roll < JASPER_WEIGHT) {
        // Select Jasper
        logger.info(
            `[afr] Jasper selected (roll: ${roll.toFixed(3)}, weight: ${JASPER_WEIGHT})`
        );
        return jasper;
    }

    // roll >= JASPER_WEIGHT, try to select a non-Jasper worker
    if (nonJasperWorkers.length === 0) {
        // No other workers available, fallback to Jasper
        logger.info(
            `[afr] No other workers available, selecting Jasper as fallback (roll: ${roll.toFixed(3)}, weight: ${JASPER_WEIGHT})`
        );
        return jasper;
    }

    const randomIndex = Math.floor(Math.random() * nonJasperWorkers.length);
    const selected = nonJasperWorkers[randomIndex];
    logger.info(
        `[afr] Non-Jasper worker selected: ${selected.name} (roll: ${roll.toFixed(3)}, weight: ${JASPER_WEIGHT})`
    );
    return selected;
}

/**
 * Allocate a worker for a voice channel using AFR.
 * Priority:
 * 1. Worker already in that channel (reuse existing connection).
 * 2. AFR selection from eligible (idle) workers.
 * @param {string} guildId
 * @param {string} voiceChannelId
 * @returns {WorkerState|null}
 */
function allocateWorker(guildId: string, voiceChannelId: string): WorkerState | null {
    // 1. Check if someone is already in the channel (reuse connection)
    const existing = findWorkerByVoiceChannel(guildId, voiceChannelId);
    if (existing) {
        logger.info(
            `[workerpool] Reusing ${existing.name} already in channel ${voiceChannelId}`
        );
        return existing;
    }

    // 2. Get all eligible (non-busy) workers
    const eligibleWorkers = workers.filter((w) => !w.busy);

    if (eligibleWorkers.length === 0) {
        // Everyone is busy
        logger.warn("[workerpool] All workers are busy, cannot allocate");
        return null;
    }

    // 3. Use AFR to select a worker
    const selected = selectFelineWithAFR(eligibleWorkers);

    // CRITICAL: Mark as busy immediately to prevent race conditions
    setWorkerBusy(selected, guildId, voiceChannelId);

    return selected;
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
        `[workerpool] ${worker.name} assigned to guild ${guildId} channel ${voiceChannelId}`
    );

    // Update worker presence to reflect busy status
    if (worker.role === 'worker') {
        worker.client.user?.setPresence({
            activities: [{ name: "Playing music...", type: ActivityType.Custom }],
            status: "online",
        });
    } else if (worker.role === 'controller') {
        // Jasper gets a special status when busy
        worker.client.user?.setPresence({
            activities: [{ name: "Conducting the orchestra", type: ActivityType.Custom }],
            status: "online",
        });
    }
}

/**
 * Release a worker (mark as idle)
 * @param {string} voiceChannelId
 */
function releaseWorker(voiceChannelId: string): void {
    const worker = workers.find((w) => w.voiceChannelId === voiceChannelId);
    if (worker) {
        logger.info(
            `[workerpool] ${worker.name} released from channel ${voiceChannelId}`
        );
        worker.busy = false;
        worker.guildId = null;
        worker.voiceChannelId = null;

        // Reset worker presence to idle status
        if (worker.role === 'worker') {
            worker.client.user?.setPresence({
                activities: [{ name: "Waiting for tasks...", type: ActivityType.Custom }],
                status: "idle",
            });
        } else if (worker.role === 'controller') {
            // Reset Jasper's presence when idle
            worker.client.user?.setPresence({
                activities: [{ name: "Managing the Heavenly Council", type: ActivityType.Custom }],
                status: "idle",
            });
        }
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

        // Reset each worker's presence to idle status
        if (worker.role === 'worker') {
            worker.client.user?.setPresence({
                activities: [{ name: "Waiting for tasks...", type: ActivityType.Custom }],
                status: "idle",
            });
        } else if (worker.role === 'controller') {
            worker.client.user?.setPresence({
                activities: [{ name: "Managing the Heavenly Council", type: ActivityType.Custom }],
                status: "idle",
            });
        }
    }
    logger.info("[workerpool] All workers released to idle state");
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
