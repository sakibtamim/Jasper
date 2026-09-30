import { RuntimeProfile, VoiceLease, WorkerState } from '@jasper/types';
import { ActivityType, Client, GatewayIntentBits } from 'discord.js';

import { JASPER_WEIGHT } from '../config/afr-config.js';
import bots, { BotConfig } from '../config/bots.js';
import { getRuntimeProfile } from '../config/env.js';
import { loadEvents } from '../utils/event-loader.js';
import logger from './logger.js';
import hookManager from './plugins/hook-manager.js';

export interface AllocateWorkerOptions {
    installationId?: string;
    excludeWorkerNames?: string[];
    jasperWeight?: number;
    queueId?: string;
}

export interface ReleaseWorkerOptions {
    installationId?: string;
    guildId?: string;
    workerId?: string;
    generation?: number;
}

// Registry to hold all worker states
const workers: WorkerState[] = [];

// Map<installationId, Map<workerName, VoiceLease>>
const installationLeases = new Map<string, Map<string, VoiceLease>>();

// Generation tracking: key is `${installationId}:${workerName}`
const generationCounters = new Map<string, number>();

function getNextGeneration(installationId: string, workerName: string): number {
    const key = `${installationId}:${workerName}`;
    const nextGen = (generationCounters.get(key) || 0) + 1;
    generationCounters.set(key, nextGen);
    return nextGen;
}

/**
 * Creates a reactive WorkerState instance supporting per-guild leases
 * alongside backward-compatible getters/setters for busy, guildId, and voiceChannelId.
 */
export function createWorkerState(
    name: string,
    client: Client,
    role: 'controller' | 'worker',
): WorkerState {
    const leases = new Map<string, VoiceLease>();
    let legacyBusyOverride: boolean | null = null;
    let legacyGuildIdOverride: string | null = null;
    let legacyVoiceChannelIdOverride: string | null = null;

    return {
        name,
        client,
        role,
        leases,
        get busy(): boolean {
            if (legacyBusyOverride !== null) return legacyBusyOverride;
            return leases.size > 0;
        },
        set busy(val: boolean) {
            legacyBusyOverride = val;
            if (!val) {
                leases.clear();
                legacyGuildIdOverride = null;
                legacyVoiceChannelIdOverride = null;
            }
        },
        get guildId(): string | null {
            if (legacyGuildIdOverride !== null) return legacyGuildIdOverride;
            const firstLease = leases.values().next().value;
            return firstLease ? firstLease.guildId : null;
        },
        set guildId(val: string | null) {
            legacyGuildIdOverride = val;
        },
        get voiceChannelId(): string | null {
            if (legacyVoiceChannelIdOverride !== null) return legacyVoiceChannelIdOverride;
            const firstLease = leases.values().next().value;
            return firstLease ? firstLease.voiceChannelId : null;
        },
        set voiceChannelId(val: string | null) {
            legacyVoiceChannelIdOverride = val;
        },
    };
}

/**
 * Determine the gateway intents required for a given bot role and runtime profile.
 *
 * - Controller (hosted): Guilds, GuildVoiceStates, GuildMessages (MessageContent omitted)
 * - Controller (self-hosted): Guilds, GuildVoiceStates, GuildMessages, MessageContent
 * - Worker (all profiles): Guilds, GuildVoiceStates only
 */
export function getIntentsForRole(
    role: 'controller' | 'worker',
    profile: RuntimeProfile = getRuntimeProfile(),
): GatewayIntentBits[] {
    if (role === 'worker') {
        return [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates];
    }

    const intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ];

    if (profile === 'self-hosted') {
        intents.push(GatewayIntentBits.MessageContent);
    }

    return intents;
}

/**
 * Create all bot clients defined in config but do not login yet
 */
export function createBots(
    botConfigs: BotConfig[] = bots,
    profile: RuntimeProfile = getRuntimeProfile(),
): WorkerState[] {
    if (workers.length > 0) return workers;

    for (const botConfig of botConfigs) {
        const intents = getIntentsForRole(botConfig.role, profile);

        const client = new Client({
            intents: intents,
        });

        // Attach role to client for event handlers to access
        // @ts-expect-error - Injecting custom property
        client.role = botConfig.role;

        // Register basic error and status logging handlers to keep track of connection issues
        if (typeof client.on === 'function') {
            client.on('error', (error) => {
                logger.error(`[${botConfig.name}] Client error: ${error.stack || error.message}`);
            });

            client.on('warn', (warning) => {
                logger.warn(`[${botConfig.name}] Client warning: ${warning}`);
            });

            client.on('shardDisconnect', (event, shardId) => {
                logger.warn(
                    `[${botConfig.name}] Shard ${shardId} disconnected: Code ${event.code}, Reason: ${event.reason}`,
                );
            });

            client.on('shardReconnecting', (shardId) => {
                logger.info(`[${botConfig.name}] Shard ${shardId} is reconnecting...`);
            });

            client.on('shardResume', (shardId, replayed) => {
                logger.info(
                    `[${botConfig.name}] Shard ${shardId} resumed. Replayed events: ${replayed}`,
                );
            });
        }

        workers.push(createWorkerState(botConfig.name, client, botConfig.role));
    }

    logger.info(`[workerpool] Initialized ${workers.length} bots.`);
    return workers;
}

/**
 * Login all bots
 */
export async function loginBots(): Promise<void> {
    const loginPromises = bots.map(async (botConfig) => {
        const worker = workers.find((w) => w.name === botConfig.name);
        if (!worker) {
            logger.warn(
                `[workerpool] No initialized WorkerState found for configured bot "${botConfig.name}". Skipping login.`,
            );
            return;
        }

        try {
            // Load events for this worker
            await loadEvents(worker.client, worker.name, worker.role);

            await worker.client.login(botConfig.token);
            logger.info(
                `[${worker.name}] Logged in as ${worker.role}${worker.role === 'controller' ? ' (Leader)' : ''}`,
            );
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[workerpool] Failed to login ${worker.name}: ${msg}`);
        }
    });
    await Promise.all(loginPromises);
}

/**
 * Get the controller worker (Jasper)
 */
export function getController(): WorkerState | undefined {
    return workers.find((w) => w.role === 'controller');
}

/**
 * Check whether a worker is currently serving a channel in a specific guild
 */
export function isWorkerBusyInGuild(worker: WorkerState, guildId: string): boolean {
    if (worker.leases && worker.leases.has(guildId)) {
        return true;
    }
    return Boolean(worker.guildId === guildId && worker.busy);
}

/**
 * Find a worker already assigned to a specific voice channel in a guild
 */
export function findWorkerByVoiceChannel(
    guildId: string,
    voiceChannelId: string,
): WorkerState | null {
    for (const worker of workers) {
        if (worker.leases) {
            const lease = worker.leases.get(guildId);
            if (lease && lease.voiceChannelId === voiceChannelId) {
                return worker;
            }
        }
        if (worker.guildId === guildId && worker.voiceChannelId === voiceChannelId) {
            return worker;
        }
    }
    return null;
}

/**
 * Select a feline using AFR (Automatic Feline Rotation) logic.
 *
 * AFR Selection Rules:
 * 1. If Jasper is eligible:
 *    - With jasperWeight probability: select Jasper
 *    - Otherwise: randomly select from eligible non-Jasper workers
 * 2. If Jasper is not eligible:
 *    - Randomly select from eligible workers
 * 3. Fallback: If only Jasper is eligible and jasperWeight === 0, select Jasper as last resort.
 */
export function selectFelineWithAFR(
    eligibleWorkers: WorkerState[],
    jasperWeight: number = JASPER_WEIGHT,
): WorkerState {
    if (eligibleWorkers.length === 0) {
        throw new Error('selectFelineWithAFR called with no eligible workers');
    }

    let jasper: WorkerState | undefined;
    const nonJasperWorkers: WorkerState[] = [];

    for (const worker of eligibleWorkers) {
        if (worker.role === 'controller') {
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
            `[afr] Jasper not eligible. Randomly selected ${selected.name} from ${eligibleWorkers.length} eligible workers.`,
        );
        return selected;
    }

    // Jasper is eligible
    const roll = Math.random();

    if (roll < jasperWeight) {
        logger.info(`[afr] Jasper selected (roll: ${roll.toFixed(3)}, weight: ${jasperWeight})`);
        return jasper;
    }

    // roll >= jasperWeight, try to select a non-Jasper worker
    if (nonJasperWorkers.length === 0) {
        // No other workers available, fallback to Jasper
        logger.info(
            `[afr] No other workers available, selecting Jasper as fallback (roll: ${roll.toFixed(3)}, weight: ${jasperWeight})`,
        );
        return jasper;
    }

    const randomIndex = Math.floor(Math.random() * nonJasperWorkers.length);
    const selected = nonJasperWorkers[randomIndex];
    logger.info(
        `[afr] Non-Jasper worker selected: ${selected.name} (roll: ${roll.toFixed(3)}, weight: ${jasperWeight})`,
    );
    return selected;
}

function setWorkerBusyPresence(worker: WorkerState): void {
    if (worker.role === 'worker') {
        worker.client.user?.setPresence({
            activities: [{ name: 'Playing music...', type: ActivityType.Custom }],
            status: 'online',
        });
    } else if (worker.role === 'controller') {
        worker.client.user?.setPresence({
            activities: [{ name: 'Conducting the orchestra', type: ActivityType.Custom }],
            status: 'online',
        });
    }
}

function resetWorkerPresence(worker: WorkerState): void {
    if (worker.role === 'worker') {
        worker.client.user?.setPresence({
            activities: [{ name: 'Waiting for tasks...', type: ActivityType.Custom }],
            status: 'idle',
        });
    } else if (worker.role === 'controller') {
        worker.client.user?.setPresence({
            activities: [{ name: 'Managing the Heavenly Council', type: ActivityType.Custom }],
            status: 'online',
        });
    }
}

/**
 * Allocate a worker for a voice channel using per-guild AFR leases.
 * Priority:
 * 1. Worker already in that channel (reuse existing connection).
 * 2. AFR selection from eligible (non-busy in this guild and ready) workers.
 */
export function allocateWorker(
    guildId: string,
    voiceChannelId: string,
    options?: AllocateWorkerOptions,
): WorkerState | null {
    // 1. Check if someone is already in the channel (reuse existing connection)
    const existing = findWorkerByVoiceChannel(guildId, voiceChannelId);
    if (existing && existing.client.isReady()) {
        const existingLease = existing.leases?.get(guildId);
        if (existingLease) {
            existingLease.lastActivityAt = new Date();
        }
        logger.info(`[workerpool] Reusing ${existing.name} already in channel ${voiceChannelId}`);
        return existing;
    }

    // 2. Filter eligible workers:
    //    - client is ready
    //    - not busy in this guild
    //    - not excluded in options
    //    - partial install check: client observed in guild
    const eligibleWorkers = workers.filter((w) => {
        if (!w.client.isReady()) return false;
        if (isWorkerBusyInGuild(w, guildId)) return false;
        if (options?.excludeWorkerNames?.includes(w.name)) return false;

        // Partial install check (Discord application observed in guild)
        if (w.client.guilds?.cache) {
            if (!w.client.guilds.cache.has(guildId)) {
                logger.info(
                    `[workerpool] Worker ${w.name} not in guild ${guildId} (partial install). Skipping.`,
                );
                return false;
            }
        }
        return true;
    });

    if (eligibleWorkers.length === 0) {
        logger.warn(
            `[workerpool] No eligible workers available for guild ${guildId}, cannot allocate`,
        );
        return null;
    }

    // 3. Use AFR to select a worker
    const weight = options?.jasperWeight !== undefined ? options.jasperWeight : JASPER_WEIGHT;
    const selected = selectFelineWithAFR(eligibleWorkers, weight);

    // 4. Mark as busy immediately to prevent race conditions
    setWorkerBusy(selected, guildId, voiceChannelId, options);

    return selected;
}

/**
 * Mark a worker as busy in a channel by acquiring or updating a per-guild VoiceLease.
 */
export function setWorkerBusy(
    worker: WorkerState,
    guildId: string,
    voiceChannelId: string,
    options?: AllocateWorkerOptions,
): VoiceLease {
    const installationId = options?.installationId ?? guildId;
    const generation = getNextGeneration(installationId, worker.name);

    const lease: VoiceLease = {
        state: 'active',
        installationId,
        guildId,
        workerId: worker.client.user?.id || worker.name,
        voiceChannelId,
        queueId: options?.queueId,
        generation,
        acquiredAt: new Date(),
        lastActivityAt: new Date(),
    };

    if (!worker.leases) {
        worker.leases = new Map<string, VoiceLease>();
    }
    worker.leases.set(guildId, lease);

    let installMap = installationLeases.get(installationId);
    if (!installMap) {
        installMap = new Map<string, VoiceLease>();
        installationLeases.set(installationId, installMap);
    }
    installMap.set(worker.name, lease);

    logger.info(
        `[workerpool] ${worker.name} assigned to guild ${guildId} channel ${voiceChannelId} (installation: ${installationId}, gen: ${generation})`,
    );

    setWorkerBusyPresence(worker);

    // Hook: WORKER_ASSIGNED
    hookManager.trigger('WORKER_ASSIGNED', { worker, guildId, voiceChannelId });

    return lease;
}

/**
 * Release a worker from a voice channel.
 * Validates installationId and generation to reject stale callbacks.
 */
export function releaseWorker(voiceChannelId: string, options?: ReleaseWorkerOptions): boolean {
    let targetWorker: WorkerState | undefined;
    let targetLease: VoiceLease | undefined;
    let targetGuildId: string | undefined;

    // Find the worker and lease for this voice channel
    for (const worker of workers) {
        if (!worker.leases) continue;

        if (options?.guildId) {
            const lease = worker.leases.get(options.guildId);
            if (lease && lease.voiceChannelId === voiceChannelId) {
                targetWorker = worker;
                targetLease = lease;
                targetGuildId = options.guildId;
                break;
            }
        } else {
            for (const [gId, lease] of worker.leases.entries()) {
                if (lease.voiceChannelId === voiceChannelId) {
                    targetWorker = worker;
                    targetLease = lease;
                    targetGuildId = gId;
                    break;
                }
            }
            if (targetWorker) break;
        }
    }

    // Fallback: check legacy worker properties if no lease found
    if (!targetWorker) {
        targetWorker = workers.find((w) => w.voiceChannelId === voiceChannelId);
        if (targetWorker) {
            targetGuildId = targetWorker.guildId || undefined;
        }
    }

    if (!targetWorker) {
        logger.warn(`[workerpool] releaseWorker: No worker found for channel ${voiceChannelId}`);
        return false;
    }

    // Validate lease invariants if options are provided
    if (targetLease) {
        if (options?.installationId && targetLease.installationId !== options.installationId) {
            logger.warn(
                `[workerpool] releaseWorker ignored: installationId mismatch (expected: ${targetLease.installationId}, got: ${options.installationId})`,
            );
            return false;
        }

        if (
            options?.workerId &&
            targetWorker.name !== options.workerId &&
            targetWorker.client.user?.id !== options.workerId
        ) {
            logger.warn(
                `[workerpool] releaseWorker ignored: workerId mismatch (expected: ${targetWorker.name}, got: ${options.workerId})`,
            );
            return false;
        }

        if (options?.generation !== undefined && targetLease.generation !== options.generation) {
            logger.warn(
                `[workerpool] releaseWorker ignored: generation mismatch (expected: ${targetLease.generation}, got: ${options.generation})`,
            );
            return false;
        }

        targetLease.state = 'releasing';
    } else if (options?.installationId || options?.generation !== undefined) {
        logger.warn(
            `[workerpool] releaseWorker ignored: stale callback for channel ${voiceChannelId} with no active lease`,
        );
        return false;
    }

    if (targetGuildId && targetWorker.leases) {
        targetWorker.leases.delete(targetGuildId);
    }

    if (targetLease) {
        const installMap = installationLeases.get(targetLease.installationId);
        if (installMap) {
            installMap.delete(targetWorker.name);
            if (installMap.size === 0) {
                installationLeases.delete(targetLease.installationId);
            }
        }
    }

    // Reset presence to idle only if worker has no remaining active leases
    const hasRemainingLeases = targetWorker.leases && targetWorker.leases.size > 0;
    if (!hasRemainingLeases) {
        targetWorker.busy = false;
        targetWorker.guildId = null;
        targetWorker.voiceChannelId = null;
        resetWorkerPresence(targetWorker);
    }

    logger.info(
        `[workerpool] ${targetWorker.name} released from channel ${voiceChannelId}${targetGuildId ? ` in guild ${targetGuildId}` : ''}`,
    );

    return true;
}

/**
 * Purge all active leases for a given installationId.
 */
export function purgeInstallation(installationId: string): void {
    logger.info(`[workerpool] Purging installation ${installationId}`);
    const installMap = installationLeases.get(installationId);
    if (installMap) {
        for (const [workerName, lease] of Array.from(installMap.entries())) {
            const worker = workers.find((w) => w.name === workerName);
            if (worker && worker.leases) {
                worker.leases.delete(lease.guildId);
                if (worker.leases.size === 0) {
                    worker.busy = false;
                    worker.guildId = null;
                    worker.voiceChannelId = null;
                    resetWorkerPresence(worker);
                }
            }
        }
        installationLeases.delete(installationId);
    }

    // Scan all workers to ensure any lingering lease for this installationId is cleared
    for (const worker of workers) {
        if (!worker.leases) continue;
        for (const [guildId, lease] of Array.from(worker.leases.entries())) {
            if (lease.installationId === installationId) {
                worker.leases.delete(guildId);
                if (worker.leases.size === 0) {
                    worker.busy = false;
                    worker.guildId = null;
                    worker.voiceChannelId = null;
                    resetWorkerPresence(worker);
                }
            }
        }
    }
}

/**
 * Get a lease by guildId and optional workerName
 */
export function getLease(guildId: string, workerName?: string): VoiceLease | undefined {
    if (workerName) {
        const worker = workers.find((w) => w.name === workerName);
        return worker?.leases?.get(guildId);
    }
    for (const worker of workers) {
        const lease = worker.leases?.get(guildId);
        if (lease) return lease;
    }
    return undefined;
}

/**
 * Get all active leases across all workers, optionally filtered by guildId
 */
export function getLeases(guildId?: string): VoiceLease[] {
    const result: VoiceLease[] = [];
    for (const worker of workers) {
        if (!worker.leases) continue;
        if (guildId) {
            const lease = worker.leases.get(guildId);
            if (lease) result.push(lease);
        } else {
            result.push(...worker.leases.values());
        }
    }
    return result;
}

/**
 * Get a copy of all worker states for inspection
 */
export function getWorkers(): WorkerState[] {
    return [...workers];
}

/**
 * Release all workers to idle state
 */
export function releaseAllWorkers(): void {
    for (const worker of workers) {
        if (worker.leases) {
            worker.leases.clear();
        }
        worker.busy = false;
        worker.guildId = null;
        worker.voiceChannelId = null;
        resetWorkerPresence(worker);
    }
    installationLeases.clear();
    logger.info('[workerpool] All workers released to idle state');
}

/**
 * Reset worker states and lease registries (primarily for testing)
 */
export function resetBots(): void {
    workers.length = 0;
    installationLeases.clear();
    generationCounters.clear();
}

export default {
    createBots,
    loginBots,
    getController,
    allocateWorker,
    findWorkerByVoiceChannel,
    setWorkerBusy,
    releaseWorker,
    getWorkers,
    releaseAllWorkers,
    getIntentsForRole,
    resetBots,
    createWorkerState,
    isWorkerBusyInGuild,
    selectFelineWithAFR,
    purgeInstallation,
    getLease,
    getLeases,
};
