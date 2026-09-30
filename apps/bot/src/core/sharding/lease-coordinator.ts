import { RuntimeIdentity, ShardLeaseRecord, ShardObservation } from '@jasper/types';

import { metrics } from '../telemetry/metrics.js';
import { emitStructuredLog } from '../telemetry/structured-logger.js';
import { ActiveWorkRegistry } from './active-work-registry.js';
import {
    LEASE_TTL_MS,
    RENEWAL_INTERVAL_MS,
    ShardLeaseCoordinatorOptions,
    ShardLeaseStore,
} from './types.js';

export type CoordinatorState = 'unacquired' | 'held' | 'lost' | 'expired' | 'stopped';

export interface ObservationValidationResult {
    valid: boolean;
    reason?: string;
}

export const DEFAULT_MAX_SEEN_IDEMPOTENCY_KEYS = 5000;

export class ShardLeaseCoordinator {
    private store: ShardLeaseStore;
    private identity: RuntimeIdentity;
    private renewalIntervalMs: number;
    private leaseTtlMs: number;
    private maxSeenIdempotencyKeys: number;
    private onLeaseAcquired?: (lease: ShardLeaseRecord) => void;
    private onLeaseLost?: (reason: string) => void;
    private activeWorkRegistry?: ActiveWorkRegistry;

    private state: CoordinatorState = 'unacquired';
    private currentLease: ShardLeaseRecord | null = null;
    private renewalTimer: NodeJS.Timeout | null = null;

    // Track observation sequence per bootId and fenceEpoch
    // Map<`${bootId}:${fenceEpoch}`, highestSequenceSeen>
    private lastSeenSequences = new Map<string, number>();
    private seenIdempotencyKeys = new Set<string>();

    constructor(
        options: ShardLeaseCoordinatorOptions & { activeWorkRegistry?: ActiveWorkRegistry },
    ) {
        this.store = options.store;
        this.identity = { ...options.runtimeIdentity };
        this.renewalIntervalMs = options.renewalIntervalMs ?? RENEWAL_INTERVAL_MS;
        this.leaseTtlMs = options.leaseTtlMs ?? LEASE_TTL_MS;
        this.maxSeenIdempotencyKeys =
            options.maxSeenIdempotencyKeys ?? DEFAULT_MAX_SEEN_IDEMPOTENCY_KEYS;
        this.onLeaseAcquired = options.onLeaseAcquired;
        this.onLeaseLost = options.onLeaseLost;
        this.activeWorkRegistry = options.activeWorkRegistry;
    }

    public getState(): CoordinatorState {
        return this.state;
    }

    public getLease(): ShardLeaseRecord | null {
        return this.currentLease ? { ...this.currentLease } : null;
    }

    public getFenceEpoch(): number | undefined {
        return this.currentLease?.fenceEpoch ?? this.identity.fenceEpoch;
    }

    public isFenceValid(): boolean {
        if (this.state !== 'held' || !this.currentLease) {
            return false;
        }

        const now = Date.now();
        if (now >= this.currentLease.expiresAt.getTime()) {
            this.handleLeaseLoss('lease_ttl_expired');
            return false;
        }

        return true;
    }

    /**
     * Testing helper: simulate TTL expiry on local lease
     */
    public expireForTesting(): void {
        if (this.currentLease) {
            this.currentLease.expiresAt = new Date(Date.now() - 1000);
        }
    }

    public getSeenIdempotencyKeysSize(): number {
        return this.seenIdempotencyKeys.size;
    }

    public getSeenSequencesSize(): number {
        return this.lastSeenSequences.size;
    }

    /**
     * Prune tracked observation sequences for obsolete fence epochs lower than currentEpoch.
     */
    private pruneObsoleteSequences(currentEpoch: number): void {
        for (const key of this.lastSeenSequences.keys()) {
            const lastColon = key.lastIndexOf(':');
            if (lastColon !== -1) {
                const epoch = parseInt(key.slice(lastColon + 1), 10);
                if (!isNaN(epoch) && epoch < currentEpoch) {
                    this.lastSeenSequences.delete(key);
                }
            }
        }
    }

    /**
     * Start the coordinator: atomically acquires the lease and starts periodic renewals.
     * Rejects partial starts if acquisition fails.
     */
    public async start(): Promise<boolean> {
        if (this.state === 'held') {
            return true;
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.leaseTtlMs);
        const holderId = `jasper-${this.identity.environment}-${this.identity.shardId}-${this.identity.bootId}`;

        const initialFenceEpoch = this.identity.fenceEpoch ?? 1;

        const acquireResult = await this.store.acquire({
            environment: this.identity.environment,
            shardId: this.identity.shardId,
            shardCount: this.identity.shardCount,
            catalogRevision: this.identity.applicationCatalogRevision,
            fenceEpoch: initialFenceEpoch,
            holderId,
            bootId: this.identity.bootId,
            cellId: this.identity.cellId,
            release: this.identity.release,
            acquiredAt: now,
            renewedAt: now,
            expiresAt,
        });

        if (!acquireResult.success || !acquireResult.lease) {
            this.state = 'unacquired';
            emitStructuredLog(
                'observation_rejected',
                {
                    reason: 'partial_start_lease_acquisition_failed',
                    environment: this.identity.environment,
                    shardId: this.identity.shardId,
                    error: acquireResult.error,
                },
                'error',
            );
            return false;
        }

        this.currentLease = acquireResult.lease;
        this.state = 'held';
        this.identity.fenceEpoch = this.currentLease.fenceEpoch;
        this.pruneObsoleteSequences(this.currentLease.fenceEpoch);

        emitStructuredLog('shard_lease_acquired', {
            environment: this.currentLease.environment,
            shardId: this.currentLease.shardId,
            shardCount: this.currentLease.shardCount,
            fenceEpoch: this.currentLease.fenceEpoch,
            holderId: this.currentLease.holderId,
            bootId: this.currentLease.bootId,
            cellId: this.currentLease.cellId,
            version: this.currentLease.version,
            expiresAt: this.currentLease.expiresAt.toISOString(),
        });

        metrics.shardLeaseAcquired(this.currentLease.shardId, this.currentLease.environment);
        metrics.setFenceEpoch(this.currentLease.shardId, this.currentLease.fenceEpoch);

        if (this.onLeaseAcquired) {
            this.onLeaseAcquired(this.currentLease);
        }

        this.startRenewalLoop();
        return true;
    }

    /**
     * Renew lease immediately (e.g. heartbeat or test trigger).
     */
    public async renew(): Promise<boolean> {
        if (this.state !== 'held' || !this.currentLease) {
            return false;
        }

        const now = Date.now();
        if (now >= this.currentLease.expiresAt.getTime()) {
            this.handleLeaseLoss('lease_expired_before_renew');
            return false;
        }

        const newExpiresAt = new Date(now + this.leaseTtlMs);
        const renewResult = await this.store.renew(
            this.currentLease.environment,
            this.currentLease.shardId,
            this.currentLease.holderId,
            this.currentLease.version,
            newExpiresAt,
        );

        if (!renewResult.success || !renewResult.lease) {
            this.handleLeaseLoss(renewResult.error || 'renewal_failed');
            return false;
        }

        this.currentLease = renewResult.lease;
        this.identity.fenceEpoch = this.currentLease.fenceEpoch;
        this.pruneObsoleteSequences(this.currentLease.fenceEpoch);

        emitStructuredLog('shard_lease_renewed', {
            environment: this.currentLease.environment,
            shardId: this.currentLease.shardId,
            fenceEpoch: this.currentLease.fenceEpoch,
            version: this.currentLease.version,
            expiresAt: this.currentLease.expiresAt.toISOString(),
        });

        metrics.shardLeaseRenewed(this.currentLease.shardId, this.currentLease.environment);
        return true;
    }

    /**
     * Stop coordinator and release lease.
     */
    public async stop(): Promise<void> {
        this.stopRenewalLoop();
        if (this.currentLease && this.state === 'held') {
            await this.store.release(
                this.currentLease.environment,
                this.currentLease.shardId,
                this.currentLease.holderId,
            );
        }
        this.state = 'stopped';
        this.currentLease = null;
    }

    private startRenewalLoop(): void {
        this.stopRenewalLoop();
        this.renewalTimer = setInterval(async () => {
            await this.renew();
        }, this.renewalIntervalMs);

        // Allow node process to exit cleanly if only renewal timer is running
        if (this.renewalTimer.unref) {
            this.renewalTimer.unref();
        }
    }

    private stopRenewalLoop(): void {
        if (this.renewalTimer) {
            clearInterval(this.renewalTimer);
            this.renewalTimer = null;
        }
    }

    private handleLeaseLoss(reason: string): void {
        if (this.state === 'lost' || this.state === 'expired') {
            return;
        }

        this.state = reason.includes('expired') ? 'expired' : 'lost';
        this.stopRenewalLoop();

        const shardId = this.currentLease?.shardId ?? this.identity.shardId;
        const environment = this.currentLease?.environment ?? this.identity.environment;

        emitStructuredLog(
            'shard_lease_lost',
            {
                shardId,
                environment,
                reason,
                fenceEpoch: this.currentLease?.fenceEpoch,
            },
            'error',
        );

        metrics.shardLeaseLost(shardId, environment, reason);

        // Notify callback
        if (this.onLeaseLost) {
            this.onLeaseLost(reason);
        }

        // Ephemeral queue boundary: emit scoped interruptions for all active work markers
        if (this.activeWorkRegistry) {
            this.activeWorkRegistry.interruptAll('fence_loss');
        }
    }

    /**
     * Validate runtime observation against current lease and identity.
     * Rejects stale (cell, fence, boot, sequence) observations.
     */
    public validateObservation(observation: ShardObservation): ObservationValidationResult {
        // 1. Fence validation
        const currentFence = this.currentLease?.fenceEpoch ?? this.identity.fenceEpoch;
        if (currentFence !== undefined) {
            this.pruneObsoleteSequences(currentFence);
        }

        if (!this.isFenceValid() || observation.fenceEpoch !== currentFence) {
            emitStructuredLog(
                'stale_fence_rejected',
                {
                    observationFenceEpoch: observation.fenceEpoch,
                    currentFenceEpoch: currentFence,
                    bootId: observation.bootId,
                    sequence: observation.sequence,
                },
                'warn',
            );
            metrics.staleFenceRejected();
            return {
                valid: false,
                reason: `Stale fence epoch: observation has ${observation.fenceEpoch}, current is ${currentFence}`,
            };
        }

        // 2. Cell ID validation
        if (
            this.identity.cellId &&
            observation.cellId &&
            this.identity.cellId !== observation.cellId
        ) {
            emitStructuredLog(
                'observation_rejected',
                {
                    reason: 'cell_mismatch',
                    observationCellId: observation.cellId,
                    currentCellId: this.identity.cellId,
                    bootId: observation.bootId,
                    sequence: observation.sequence,
                },
                'warn',
            );
            metrics.observationRejected('cell_mismatch');
            return {
                valid: false,
                reason: `Cell mismatch: observation from ${observation.cellId}, current cell is ${this.identity.cellId}`,
            };
        }

        // 3. Idempotency key check
        if (observation.idempotencyKey) {
            if (this.seenIdempotencyKeys.has(observation.idempotencyKey)) {
                emitStructuredLog(
                    'observation_rejected',
                    {
                        reason: 'duplicate_idempotency_key',
                        idempotencyKey: observation.idempotencyKey,
                        bootId: observation.bootId,
                        sequence: observation.sequence,
                    },
                    'warn',
                );
                metrics.observationRejected('duplicate_idempotency_key');
                return {
                    valid: false,
                    reason: `Duplicate idempotency key: ${observation.idempotencyKey}`,
                };
            }

            // Bound seenIdempotencyKeys: evict oldest keys when at capacity
            while (this.seenIdempotencyKeys.size >= this.maxSeenIdempotencyKeys) {
                const oldest = this.seenIdempotencyKeys.values().next().value;
                if (oldest !== undefined) {
                    this.seenIdempotencyKeys.delete(oldest);
                } else {
                    break;
                }
            }
            this.seenIdempotencyKeys.add(observation.idempotencyKey);
        }

        // 4. Sequence validation per (bootId, fenceEpoch)
        const seqKey = `${observation.bootId}:${observation.fenceEpoch}`;
        const lastSeq = this.lastSeenSequences.get(seqKey);

        if (lastSeq !== undefined && observation.sequence <= lastSeq) {
            emitStructuredLog(
                'observation_rejected',
                {
                    reason: 'stale_sequence',
                    bootId: observation.bootId,
                    fenceEpoch: observation.fenceEpoch,
                    sequence: observation.sequence,
                    lastSeenSequence: lastSeq,
                },
                'warn',
            );
            metrics.observationRejected('stale_sequence');
            return {
                valid: false,
                reason: `Stale or duplicate sequence ${observation.sequence} (last seen ${lastSeq}) for boot ${observation.bootId}`,
            };
        }

        this.lastSeenSequences.set(seqKey, observation.sequence);
        return { valid: true };
    }
}
