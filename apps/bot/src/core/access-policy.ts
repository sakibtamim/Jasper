import { GuildAccessPolicy, GuildInstallationContext, InstallationState } from '@jasper/types';

import { JASPER_WEIGHT } from '../config/afr-config.js';
import logger from './logger.js';
import workerPool from './worker-pool.js';

export interface HostedInstallationRecord {
    guildId: string;
    installationId: string;
    state: InstallationState;
    configRevision: number;
    revocationRevision: number;
    enabledWorkerIds: string[];
    enabledPluginIds: string[];
    jasperWeight: number;
}

export interface HostedAdmissionGrant {
    guildId: string;
    installationId: string;
    admissionRevision: number;
    grantedAt: Date;
    expiresAt: Date;
}

export interface HostedInstallationProvider {
    fetchInstallation(guildId: string): Promise<HostedInstallationRecord | null>;
    fetchAdmissionGrant(
        guildId: string,
        installationId: string,
    ): Promise<HostedAdmissionGrant | null>;
}

/**
 * Local self-hosted implementation of GuildAccessPolicy.
 * Defaults to 'active' state with zero external services/dependencies.
 */
export class LocalGuildAccessPolicy implements GuildAccessPolicy {
    private allowedGuildIds?: Set<string>;
    private defaultJasperWeight: number;

    constructor(options?: { allowedGuildIds?: string[] | Set<string>; jasperWeight?: number }) {
        if (options?.allowedGuildIds) {
            this.allowedGuildIds =
                options.allowedGuildIds instanceof Set
                    ? options.allowedGuildIds
                    : new Set(options.allowedGuildIds);
        }
        this.defaultJasperWeight = options?.jasperWeight ?? JASPER_WEIGHT;
    }

    async resolve(guildId: string): Promise<GuildInstallationContext | null> {
        if (!guildId) return null;

        if (this.allowedGuildIds && !this.allowedGuildIds.has(guildId)) {
            logger.warn(`[access] Guild ${guildId} not in local allowlist. Rejecting.`);
            return null;
        }

        const workers = workerPool.getWorkers();
        const enabledWorkerIds = new Set(workers.map((w) => w.name));

        return {
            guildId,
            installationId: `local:${guildId}`,
            state: 'active',
            admissionRevision: 1,
            admissionExpiresAt: undefined, // Non-expiring for local authority
            configRevision: 1,
            enabledWorkerIds,
            enabledPluginIds: new Set<string>(),
            jasperWeight: this.defaultJasperWeight,
        };
    }

    mayStartWork(context: GuildInstallationContext): boolean {
        if (context.state !== 'active' && context.state !== 'degraded') {
            return false;
        }
        if (context.admissionExpiresAt && context.admissionExpiresAt.getTime() <= Date.now()) {
            return false;
        }
        return true;
    }
}

/**
 * Hosted implementation of GuildAccessPolicy enforcing:
 * - 15-minute configuration cache
 * - ≤60-second short-lived admission grant
 * - Cached config cannot independently authorize work
 * - Missing, expired, or revoked admission fails closed
 */
export class HostedGuildAccessPolicy implements GuildAccessPolicy {
    private provider: HostedInstallationProvider;
    private maxConfigCacheMs: number;
    private maxAdmissionGrantMs: number;

    // Config cache: guildId -> { record, cachedAt }
    private configCache = new Map<string, { record: HostedInstallationRecord; cachedAt: number }>();

    // Grant cache: installationId -> HostedAdmissionGrant
    private grantCache = new Map<string, HostedAdmissionGrant>();

    constructor(
        provider: HostedInstallationProvider,
        options?: {
            maxConfigCacheMs?: number;
            maxAdmissionGrantMs?: number;
        },
    ) {
        this.provider = provider;
        this.maxConfigCacheMs = options?.maxConfigCacheMs ?? 15 * 60 * 1000; // 15 minutes
        this.maxAdmissionGrantMs = options?.maxAdmissionGrantMs ?? 60 * 1000; // 60 seconds
    }

    async resolve(guildId: string): Promise<GuildInstallationContext | null> {
        if (!guildId) return null;

        const now = Date.now();

        // 1. Resolve configuration (15-minute cache)
        let record: HostedInstallationRecord | null = null;
        const cachedConfig = this.configCache.get(guildId);

        if (cachedConfig && now - cachedConfig.cachedAt < this.maxConfigCacheMs) {
            record = cachedConfig.record;
        } else {
            try {
                record = await this.provider.fetchInstallation(guildId);
                if (record) {
                    this.configCache.set(guildId, { record, cachedAt: now });
                } else {
                    this.configCache.delete(guildId);
                    return null;
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(
                    `[access] Error fetching hosted installation for guild ${guildId}: ${msg}`,
                );
                return null;
            }
        }

        // Terminal or non-admitted states clear cached grants immediately
        if (
            record.state === 'suspended' ||
            record.state === 'deleting' ||
            record.state === 'provisioning'
        ) {
            this.grantCache.delete(record.installationId);
            return {
                guildId: record.guildId,
                installationId: record.installationId,
                state: record.state,
                admissionRevision: 0,
                admissionExpiresAt: new Date(0),
                configRevision: record.configRevision,
                enabledWorkerIds: new Set(record.enabledWorkerIds),
                enabledPluginIds: new Set(record.enabledPluginIds),
                jasperWeight: record.jasperWeight,
            };
        }

        // 2. Resolve short-lived admission grant (≤60 seconds)
        let currentGrant = this.grantCache.get(record.installationId);

        // Check if cached grant was revoked by higher revocation revision or has expired
        if (currentGrant) {
            if (record.revocationRevision > currentGrant.admissionRevision) {
                logger.warn(
                    `[access] Admission grant revoked for installation ${record.installationId} (revocation: ${record.revocationRevision} > grant: ${currentGrant.admissionRevision})`,
                );
                this.grantCache.delete(record.installationId);
                currentGrant = undefined;
            } else if (currentGrant.expiresAt.getTime() <= now) {
                this.grantCache.delete(record.installationId);
                currentGrant = undefined;
            }
        }

        // If no valid cached grant, fetch a new one
        if (!currentGrant) {
            try {
                const newGrant = await this.provider.fetchAdmissionGrant(
                    guildId,
                    record.installationId,
                );

                if (newGrant) {
                    // Check revocation immediately
                    if (record.revocationRevision > newGrant.admissionRevision) {
                        logger.warn(
                            `[access] New admission grant is already revoked for ${record.installationId}`,
                        );
                    } else {
                        // Clamp grant to maximum allowed duration (≤60 seconds)
                        const clampedExpiresAt = new Date(
                            Math.min(newGrant.expiresAt.getTime(), now + this.maxAdmissionGrantMs),
                        );
                        currentGrant = {
                            ...newGrant,
                            expiresAt: clampedExpiresAt,
                        };
                        this.grantCache.set(record.installationId, currentGrant);
                    }
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(
                    `[access] Error fetching admission grant for installation ${record.installationId}: ${msg}`,
                );
            }
        }

        return {
            guildId: record.guildId,
            installationId: record.installationId,
            state: record.state,
            admissionRevision: currentGrant ? currentGrant.admissionRevision : 0,
            admissionExpiresAt: currentGrant ? currentGrant.expiresAt : new Date(0), // Expired if no grant
            configRevision: record.configRevision,
            enabledWorkerIds: new Set(record.enabledWorkerIds),
            enabledPluginIds: new Set(record.enabledPluginIds),
            jasperWeight: record.jasperWeight,
        };
    }

    mayStartWork(context: GuildInstallationContext): boolean {
        // Only active and degraded states are permitted to work
        if (context.state !== 'active' && context.state !== 'degraded') {
            return false;
        }

        // Expired admission fails closed
        if (!context.admissionExpiresAt || context.admissionExpiresAt.getTime() <= Date.now()) {
            return false;
        }

        return true;
    }

    /** Clear cached configurations and admission grants */
    clearCaches(): void {
        this.configCache.clear();
        this.grantCache.clear();
    }
}

// Active policy registry
let activePolicy: GuildAccessPolicy = new LocalGuildAccessPolicy();

export function getGuildAccessPolicy(): GuildAccessPolicy {
    return activePolicy;
}

export function setGuildAccessPolicy(policy: GuildAccessPolicy): void {
    activePolicy = policy;
}

export function resetGuildAccessPolicy(): void {
    activePolicy = new LocalGuildAccessPolicy();
}

/**
 * Convenience helper to verify access and return admitted installation context.
 * Returns null if the guild has no installation, is not admitted, or has expired admission.
 */
export async function checkGuildAccess(
    guildId: string | null | undefined,
): Promise<GuildInstallationContext | null> {
    if (!guildId) return null;
    const policy = getGuildAccessPolicy();
    const context = await policy.resolve(guildId);
    if (!context || !policy.mayStartWork(context)) {
        return null;
    }
    return context;
}

export default {
    LocalGuildAccessPolicy,
    HostedGuildAccessPolicy,
    getGuildAccessPolicy,
    setGuildAccessPolicy,
    resetGuildAccessPolicy,
    checkGuildAccess,
};
