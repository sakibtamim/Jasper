export interface MetricLabelSet {
    [key: string]: string;
}

export interface MetricSample {
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    value: number;
    labels?: MetricLabelSet;
    timestamp: number;
}

class MetricsRegistry {
    private counters = new Map<string, { value: number; labels?: MetricLabelSet }>();
    private gauges = new Map<string, { value: number; labels?: MetricLabelSet }>();
    private histograms = new Map<string, { values: number[]; labels?: MetricLabelSet }>();

    private serializeKey(name: string, labels?: MetricLabelSet): string {
        if (!labels || Object.keys(labels).length === 0) return name;
        const sortedLabels = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        return `${name}{${sortedLabels}}`;
    }

    public incrementCounter(name: string, value: number = 1, labels?: MetricLabelSet): void {
        const key = this.serializeKey(name, labels);
        const existing = this.counters.get(key);
        if (existing) {
            existing.value += value;
        } else {
            this.counters.set(key, { value, labels });
        }
    }

    public setGauge(name: string, value: number, labels?: MetricLabelSet): void {
        const key = this.serializeKey(name, labels);
        this.gauges.set(key, { value, labels });
    }

    public observeHistogram(name: string, value: number, labels?: MetricLabelSet): void {
        const key = this.serializeKey(name, labels);
        const existing = this.histograms.get(key);
        if (existing) {
            existing.values.push(value);
        } else {
            this.histograms.set(key, { values: [value], labels });
        }
    }

    public getCounter(name: string, labels?: MetricLabelSet): number {
        const key = this.serializeKey(name, labels);
        return this.counters.get(key)?.value ?? 0;
    }

    public getGauge(name: string, labels?: MetricLabelSet): number | undefined {
        const key = this.serializeKey(name, labels);
        return this.gauges.get(key)?.value;
    }

    public getHistogramValues(name: string, labels?: MetricLabelSet): number[] {
        const key = this.serializeKey(name, labels);
        return this.histograms.get(key)?.values ?? [];
    }

    public reset(): void {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
    }

    public toPrometheusText(): string {
        const lines: string[] = [];

        // Counters
        for (const [key, item] of this.counters.entries()) {
            lines.push(`# TYPE ${key.split('{')[0]} counter`);
            lines.push(`${key} ${item.value}`);
        }

        // Gauges
        for (const [key, item] of this.gauges.entries()) {
            lines.push(`# TYPE ${key.split('{')[0]} gauge`);
            lines.push(`${key} ${item.value}`);
        }

        // Histograms (count & sum summary)
        for (const [key, item] of this.histograms.entries()) {
            const baseName = key.split('{')[0];
            const sum = item.values.reduce((acc, v) => acc + v, 0);
            lines.push(`# TYPE ${baseName} histogram`);
            lines.push(`${baseName}_count ${item.values.length}`);
            lines.push(`${baseName}_sum ${sum}`);
        }

        return lines.join('\n') + (lines.length > 0 ? '\n' : '');
    }
}

export const metricsRegistry = new MetricsRegistry();

// Vocabulary-specific helper methods
export const metrics = {
    shardLeaseAcquired(shardId: number, environment: string): void {
        metricsRegistry.incrementCounter('shard_lease_acquired_total', 1, {
            shard_id: String(shardId),
            environment,
        });
        metricsRegistry.setGauge('shard_lease_active', 1, {
            shard_id: String(shardId),
            environment,
        });
    },

    shardLeaseRenewed(shardId: number, environment: string): void {
        metricsRegistry.incrementCounter('shard_lease_renewed_total', 1, {
            shard_id: String(shardId),
            environment,
        });
    },

    shardLeaseLost(shardId: number, environment: string, reason: string): void {
        metricsRegistry.incrementCounter('shard_lease_lost_total', 1, {
            shard_id: String(shardId),
            environment,
            reason,
        });
        metricsRegistry.setGauge('shard_lease_active', 0, {
            shard_id: String(shardId),
            environment,
        });
    },

    setFenceEpoch(shardId: number, epoch: number): void {
        metricsRegistry.setGauge('shard_fence_epoch', epoch, {
            shard_id: String(shardId),
        });
    },

    setActiveQueuesCount(count: number): void {
        metricsRegistry.setGauge('active_queues_count', count);
    },

    activeWorkInterrupted(reason: string): void {
        metricsRegistry.incrementCounter('active_work_interrupted_total', 1, { reason });
    },

    staleFenceRejected(): void {
        metricsRegistry.incrementCounter('stale_fence_rejected_total', 1);
    },

    observationRejected(reason: string): void {
        metricsRegistry.incrementCounter('observation_rejected_total', 1, { reason });
    },

    drainDuration(durationSeconds: number, status: string): void {
        metricsRegistry.observeHistogram('shard_drain_duration_seconds', durationSeconds, {
            status,
        });
    },

    setHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): void {
        const val = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
        metricsRegistry.setGauge('jasper_health_status', val);
    },
};
