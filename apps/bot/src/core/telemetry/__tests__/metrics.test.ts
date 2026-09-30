import { beforeEach, describe, expect, it } from 'vitest';

import { metrics, metricsRegistry } from '../metrics.js';

describe('MetricsRegistry toPrometheusText() formatting', () => {
    beforeEach(() => {
        metricsRegistry.reset();
    });

    it('emits # TYPE header at most ONCE per unique metric base name across multiple label sets', () => {
        metrics.shardLeaseLost(0, 'prod', 'expired');
        metrics.shardLeaseLost(0, 'prod', 'partition');
        metrics.observationRejected('cell_mismatch');
        metrics.observationRejected('stale_sequence');

        const text = metricsRegistry.toPrometheusText();
        const lines = text.split('\n');

        const leaseLostTypeLines = lines.filter((l) =>
            l.startsWith('# TYPE shard_lease_lost_total'),
        );
        expect(leaseLostTypeLines).toHaveLength(1);
        expect(leaseLostTypeLines[0]).toBe('# TYPE shard_lease_lost_total counter');

        const obsRejectedTypeLines = lines.filter((l) =>
            l.startsWith('# TYPE observation_rejected_total'),
        );
        expect(obsRejectedTypeLines).toHaveLength(1);
        expect(obsRejectedTypeLines[0]).toBe('# TYPE observation_rejected_total counter');

        // Series lines are present
        expect(text).toContain(
            'shard_lease_lost_total{environment="prod",reason="expired",shard_id="0"} 1',
        );
        expect(text).toContain(
            'shard_lease_lost_total{environment="prod",reason="partition",shard_id="0"} 1',
        );
    });

    it('preserves labels on histogram _count and _sum lines and emits TYPE once', () => {
        metrics.drainDuration(1.5, 'completed');
        metrics.drainDuration(30.0, 'forced');

        const text = metricsRegistry.toPrometheusText();
        const lines = text.split('\n');

        const typeLines = lines.filter((l) => l.startsWith('# TYPE shard_drain_duration_seconds'));
        expect(typeLines).toHaveLength(1);
        expect(typeLines[0]).toBe('# TYPE shard_drain_duration_seconds histogram');

        // Labels preserved on _count and _sum
        expect(text).toContain('shard_drain_duration_seconds_count{status="completed"} 1');
        expect(text).toContain('shard_drain_duration_seconds_sum{status="completed"} 1.5');
        expect(text).toContain('shard_drain_duration_seconds_count{status="forced"} 1');
        expect(text).toContain('shard_drain_duration_seconds_sum{status="forced"} 30');
    });
});
