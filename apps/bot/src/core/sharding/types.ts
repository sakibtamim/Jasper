import { RuntimeIdentity, ShardLeaseRecord } from '@jasper/types';

export const RENEWAL_INTERVAL_MS = 10_000; // 10-second target renewal
export const LEASE_TTL_MS = 30_000; // 30-second lease TTL
export const DEFAULT_DRAIN_TIMEOUT_MS = 30_000; // 30-second bounded drain timeout

export interface AcquireResult {
    success: boolean;
    lease?: ShardLeaseRecord;
    error?: string;
}

export interface RenewResult {
    success: boolean;
    lease?: ShardLeaseRecord;
    error?: string;
}

export interface ShardLeaseStore {
    acquire(record: Omit<ShardLeaseRecord, 'version'>): Promise<AcquireResult>;
    renew(
        environment: string,
        shardId: number,
        holderId: string,
        currentVersion: number,
        newExpiresAt: Date,
    ): Promise<RenewResult>;
    release(environment: string, shardId: number, holderId: string): Promise<boolean>;
    getLease(environment: string, shardId: number): Promise<ShardLeaseRecord | null>;
}

export interface ShardLeaseCoordinatorOptions {
    store: ShardLeaseStore;
    runtimeIdentity: RuntimeIdentity;
    renewalIntervalMs?: number;
    leaseTtlMs?: number;
    maxSeenIdempotencyKeys?: number;
    onLeaseAcquired?: (lease: ShardLeaseRecord) => void;
    onLeaseLost?: (reason: string) => void;
}
