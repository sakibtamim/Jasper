import {
    FencedObservation,
    RuntimeComponentStateStore,
    RuntimeIdentity,
    VersionedValue,
} from '@jasper/types';

interface ObservationEntry {
    record: FencedObservation;
    acknowledged: boolean;
    leaseExpiresAt?: number;
    leasedTo?: RuntimeIdentity;
}

/**
 * In-memory implementation of RuntimeComponentStateStore for data-plane component state
 * and observation spooling (HJ-OSS-10).
 * Supports bounded spools, coalescing of replaceable snapshots, overflow rejection for
 * required records, and lease-based observation consumption.
 */
export class MemoryRuntimeComponentStateStore implements RuntimeComponentStateStore {
    private values: Map<string, Map<string, VersionedValue>> = new Map();
    private observations: ObservationEntry[] = [];
    private maxCapacity: number;

    constructor(maxCapacity: number = 1000) {
        this.maxCapacity = maxCapacity;
    }

    async get(componentId: string, key: string): Promise<VersionedValue | null> {
        const comp = this.values.get(componentId);
        if (!comp) return null;
        const val = comp.get(key);
        if (!val) return null;
        return {
            version: val.version,
            value: new Uint8Array(val.value),
            updatedAt: new Date(val.updatedAt),
        };
    }

    async compareAndSet(
        componentId: string,
        key: string,
        expectedVersion: number | null,
        value: Uint8Array,
    ): Promise<VersionedValue> {
        if (!this.values.has(componentId)) {
            this.values.set(componentId, new Map());
        }
        const comp = this.values.get(componentId)!;
        const current = comp.get(key);

        if (expectedVersion === null) {
            if (current) {
                throw new Error(
                    `CAS conflict: expected null version for '${key}', but key already exists at version ${current.version}`,
                );
            }
            const newValue: VersionedValue = {
                version: 1,
                value: new Uint8Array(value),
                updatedAt: new Date(),
            };
            comp.set(key, newValue);
            return newValue;
        }

        if (!current || current.version !== expectedVersion) {
            throw new Error(
                `CAS conflict: expected version ${expectedVersion} for '${key}', but found ${current?.version ?? 'null'}`,
            );
        }

        const newValue: VersionedValue = {
            version: current.version + 1,
            value: new Uint8Array(value),
            updatedAt: new Date(),
        };
        comp.set(key, newValue);
        return newValue;
    }

    async appendObservation(record: FencedObservation): Promise<void> {
        // 1. Coalesce replaceable snapshots if coalesceKey is provided and not required
        if (record.coalesceKey && !record.required) {
            const existingIndex = this.observations.findIndex(
                (o) =>
                    !o.acknowledged &&
                    o.record.componentId === record.componentId &&
                    o.record.coalesceKey === record.coalesceKey,
            );
            if (existingIndex !== -1) {
                this.observations[existingIndex] = {
                    record: { ...record },
                    acknowledged: false,
                };
                return;
            }
        }

        // 2. Capacity & overflow check
        const unacknowledgedCount = this.observations.filter((o) => !o.acknowledged).length;
        if (unacknowledgedCount >= this.maxCapacity) {
            if (record.required) {
                throw new Error(
                    `Observation buffer overflow: cannot drop required record of type '${record.eventType}' for component '${record.componentId}'`,
                );
            }

            // Evict oldest non-required unacknowledged record
            const evictIndex = this.observations.findIndex(
                (o) => !o.acknowledged && !o.record.required,
            );
            if (evictIndex !== -1) {
                this.observations.splice(evictIndex, 1);
            } else {
                throw new Error(
                    `Observation buffer overflow: no replaceable observations to evict for component '${record.componentId}'`,
                );
            }
        }

        this.observations.push({
            record: { ...record },
            acknowledged: false,
        });
    }

    async claimUnacknowledged(
        componentId: string,
        claimant: RuntimeIdentity,
        limit: number,
        leaseMs: number,
    ): Promise<readonly FencedObservation[]> {
        const now = Date.now();
        const eligible = this.observations.filter((o) => {
            if (o.acknowledged) return false;
            if (o.record.componentId !== componentId) return false;
            // Either unleased, lease expired, or claimant is same claimant
            return (
                !o.leaseExpiresAt ||
                o.leaseExpiresAt <= now ||
                o.leasedTo?.bootId === claimant.bootId
            );
        });

        // Order by sequence
        eligible.sort((a, b) => a.record.sequence - b.record.sequence);
        const claimed = eligible.slice(0, Math.max(0, limit));

        for (const entry of claimed) {
            entry.leaseExpiresAt = now + leaseMs;
            entry.leasedTo = claimant;
        }

        return claimed.map((c) => ({ ...c.record }));
    }

    async acknowledgeObservation(
        recordBootId: string,
        throughSequence: number,
        _claimant: RuntimeIdentity,
    ): Promise<void> {
        this.observations = this.observations.filter((o) => {
            if (o.record.bootId === recordBootId && o.record.sequence <= throughSequence) {
                return false; // Remove acknowledged observation
            }
            return true;
        });
    }

    /**
     * Clear all state (used for testing)
     */
    clear(): void {
        this.values.clear();
        this.observations = [];
    }

    /**
     * Get observation count (useful for testing)
     */
    getObservationCount(): number {
        return this.observations.filter((o) => !o.acknowledged).length;
    }
}
