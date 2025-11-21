import { Client, GatewayIntentBits } from "discord.js";
import logger from "./logger.js";
import botConfigs from "../config/bots.js";
// Registry to hold all worker states
const workers = [];
/**
 * Create all bot clients defined in config but do not login yet
 * @returns {WorkerState[]}
 */
function createBots() {
    for (const config of botConfigs) {
        if (!config.token) {
            logger.warn(`Skipping bot ${config.name} due to missing token.`);
            continue;
        }
        const client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
        });
        const workerState = {
            name: config.name,
            client: client,
            role: config.role,
            token: config.token, // Store token for easier login
            busy: false,
            guildId: null,
            voiceChannelId: null,
        };
        // Attach error handler to prevent crash
        client.on("error", (err) => {
            logger.error(`[${config.name}] Client error: ${err.message}`);
        });
        workers.push(workerState);
    }
    return workers;
}
/**
 * Login all bots
 * @returns {Promise<void>}
 */
async function loginBots() {
    // 1. Login Controller (Jasper) first
    const controller = workers.find((w) => w.role === "controller");
    if (controller) {
        try {
            await controller.client.login(controller.token);
            logger.info(`[${controller.name}] Logged in as ${controller.role} (Leader)`);
        }
        catch (error) {
            logger.error(`[${controller.name}] Failed to login controller: ${error.message}`);
        }
    }
    // 2. Login the rest of the workers
    const others = workers.filter((w) => w.role !== "controller");
    const promises = others.map(async (worker) => {
        try {
            await worker.client.login(worker.token);
            logger.info(`[${worker.name}] Logged in as ${worker.role}`);
        }
        catch (error) {
            logger.error(`[${worker.name}] Failed to login: ${error.message}`);
        }
    });
    await Promise.all(promises);
}
/**
 * Get the controller worker (Jasper)
 * @returns {WorkerState|undefined}
 */
function getController() {
    return workers.find((w) => w.role === "controller");
}
/**
 * Find a worker already assigned to a specific voice channel
 * @param {string} guildId
 * @param {string} voiceChannelId
 * @returns {WorkerState|null}
 */
function findWorkerByVoiceChannel(guildId, voiceChannelId) {
    return (workers.find((w) => w.guildId === guildId && w.voiceChannelId === voiceChannelId) || null);
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
function allocateWorker(guildId, voiceChannelId) {
    // 1. Check if someone is already there
    const existing = findWorkerByVoiceChannel(guildId, voiceChannelId);
    if (existing)
        return existing;
    // 2. Check if Controller (Jasper) is free (Prioritize Leader)
    const controller = getController();
    if (controller && !controller.busy) {
        return controller;
    }
    // 3. Find an idle worker
    const idleWorker = workers.find((w) => w.role === "worker" && !w.busy);
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
function setWorkerBusy(worker, guildId, voiceChannelId) {
    worker.busy = true;
    worker.guildId = guildId;
    worker.voiceChannelId = voiceChannelId;
    logger.info(`[WorkerPool] ${worker.name} assigned to guild ${guildId} channel ${voiceChannelId}`);
}
/**
 * Release a worker (mark as idle)
 * @param {string} voiceChannelId
 */
function releaseWorker(voiceChannelId) {
    const worker = workers.find((w) => w.voiceChannelId === voiceChannelId);
    if (worker) {
        logger.info(`[WorkerPool] ${worker.name} released from channel ${voiceChannelId}`);
        worker.busy = false;
        worker.guildId = null;
        worker.voiceChannelId = null;
    }
}
/**
 * Release all workers to idle state
 */
function releaseAllWorkers() {
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
    getWorkers: () => [...workers], // Return a copy for inspection
    releaseAllWorkers,
};
