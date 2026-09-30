import { ShardLeaseRecord } from '@jasper/types';

import { AcquireResult, RenewResult, ShardLeaseStore } from './types.js';

export class MemoryShardLeaseStore implements ShardLeaseStore {
    private leases = new Map<string, ShardLeaseRecord>();
    private partitioned = false;

    private getKey(environment: string, shardId: number): string {
        return `${environment}:${shardId}`;
    }

    public async acquire(record: Omit<ShardLeaseRecord, 'version'>): Promise<AcquireResult> {
        if (this.partitioned) {
            return { success: false, error: 'Network partition simulated' };
        }

        const key = this.getKey(record.environment, record.shardId);
        const existing = this.leases.get(key);
        const now = Date.now();

        if (existing) {
            const isExpired = now >= existing.expiresAt.getTime();
            if (!isExpired) {
                if (existing.holderId === record.holderId && existing.bootId === record.bootId) {
                    return { success: true, lease: { ...existing } };
                }
                return {
                    success: false,
                    error: `Lease currently held by ${existing.holderId} until ${existing.expiresAt.toISOString()}`,
                };
            }

            // Expired lease takeover: increment fenceEpoch and version
            const newEpoch = Math.max(existing.fenceEpoch + 1, record.fenceEpoch);
            const newVersion = existing.version + 1;
            const newLease: ShardLeaseRecord = {
                ...record,
                fenceEpoch: newEpoch,
                version: newVersion,
            };

            this.leases.set(key, newLease);
            return { success: true, lease: { ...newLease } };
        }

        const newLease: ShardLeaseRecord = {
            ...record,
            fenceEpoch: record.fenceEpoch || 1,
            version: 1,
        };
        this.leases.set(key, newLease);
        return { success: true, lease: { ...newLease } };
    }

    public async renew(
        environment: string,
        shardId: number,
        holderId: string,
        currentVersion: number,
        newExpiresAt: Date,
    ): Promise<RenewResult> {
        if (this.partitioned) {
            return { success: false, error: 'Network partition simulated' };
        }

        const key = this.getKey(environment, shardId);
        const existing = this.leases.get(key);
        const now = Date.now();

        if (!existing) {
            return { success: false, error: 'Lease not found' };
        }

        if (existing.holderId !== holderId) {
            return { success: false, error: 'Holder mismatch during lease renewal' };
        }

        if (now >= existing.expiresAt.getTime()) {
            return { success: false, error: 'Lease expired before renewal was applied' };
        }

        // CAS check
        if (existing.version !== currentVersion) {
            return { success: false, error: 'CAS version conflict during lease renewal' };
        }

        const updated: ShardLeaseRecord = {
            ...existing,
            renewedAt: new Date(now),
            expiresAt: newExpiresAt,
            version: existing.version + 1,
        };

        this.leases.set(key, updated);
        return { success: true, lease: { ...updated } };
    }

    public async release(environment: string, shardId: number, holderId: string): Promise<boolean> {
        const key = this.getKey(environment, shardId);
        const existing = this.leases.get(key);
        if (existing && existing.holderId === holderId) {
            this.leases.delete(key);
            return true;
        }
        return false;
    }

    public async getLease(environment: string, shardId: number): Promise<ShardLeaseRecord | null> {
        const key = this.getKey(environment, shardId);
        const lease = this.leases.get(key);
        return lease ? { ...lease } : null;
    }

    // --- Test Simulation Methods ---

    public simulatePartition(enabled: boolean): void {
        this.partitioned = enabled;
    }

    public forceExpire(environment: string, shardId: number): void {
        const key = this.getKey(environment, shardId);
        const existing = this.leases.get(key);
        if (existing) {
            existing.expiresAt = new Date(Date.now() - 1000);
            this.leases.set(key, existing);
        }
    }

    public overrideEpoch(environment: string, shardId: number, newEpoch: number): void {
        const key = this.getKey(environment, shardId);
        const existing = this.leases.get(key);
        if (existing) {
            existing.fenceEpoch = newEpoch;
            this.leases.set(key, existing);
        }
    }

    public clear(): void {
        this.leases.clear();
        this.partitioned = false;
    }
}
