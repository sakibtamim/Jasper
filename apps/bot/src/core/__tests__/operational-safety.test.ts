import { describe, expect, it } from 'vitest';

import {
    DefaultOperationalSafetyManager,
    OperationalSafetyError,
} from '../safety/operational-safety.js';

describe('Operational Safety Policy & Noisy-Neighbor Protection (HJ-OSS-20)', () => {
    const FORBIDDEN_MONETIZATION_TERMS = [
        'plan',
        'price',
        'pricing',
        'tier',
        'premium',
        'subscription',
        'upgrade',
        'entitlement',
        'billing',
        'invoice',
    ];

    function assertNoMonetizationTerms(text: string): void {
        const lower = text.toLowerCase();
        for (const term of FORBIDDEN_MONETIZATION_TERMS) {
            expect(lower).not.toContain(term);
        }
    }

    describe('1. Per-Installation & Cell Queue Concurrency Limits', () => {
        it('enforces max concurrent queues per installation and frees slots on release', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxConcurrentQueues: 2 },
                cellLimits: { maxCellConcurrentQueues: 10 },
            });

            // Acquire 2 queues for Installation Alpha
            const q1 = manager.acquireQueue('inst-alpha', 'vc-1');
            const q2 = manager.acquireQueue('inst-alpha', 'vc-2');
            expect(q1.allowed).toBe(true);
            expect(q2.allowed).toBe(true);

            // Attempt 3rd queue for Installation Alpha -> rejected
            const q3 = manager.acquireQueue('inst-alpha', 'vc-3');
            expect(q3.allowed).toBe(false);
            expect(q3.resource).toBe('queue');
            expect(q3.scope).toBe('installation');
            expect(q3.reason).toBeDefined();
            assertNoMonetizationTerms(q3.reason!);

            // Idempotent re-acquisition of existing channel returns allowed
            const reacquire = manager.acquireQueue('inst-alpha', 'vc-1');
            expect(reacquire.allowed).toBe(true);

            // Release vc-1 -> slot opens up
            manager.releaseQueue('inst-alpha', 'vc-1');
            const q4 = manager.acquireQueue('inst-alpha', 'vc-4');
            expect(q4.allowed).toBe(true);
        });

        it('enforces cell-wide queue budget to protect host capacity', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxConcurrentQueues: 2 },
                cellLimits: { maxCellConcurrentQueues: 3 },
            });

            // Installation A takes 2 queues
            expect(manager.acquireQueue('inst-a', 'vc-a1').allowed).toBe(true);
            expect(manager.acquireQueue('inst-a', 'vc-a2').allowed).toBe(true);

            // Installation B takes 1 queue -> total 3 (cell limit reached)
            expect(manager.acquireQueue('inst-b', 'vc-b1').allowed).toBe(true);

            // Installation C attempts to acquire a queue -> cell capacity reached
            const resC = manager.acquireQueue('inst-c', 'vc-c1');
            expect(resC.allowed).toBe(false);
            expect(resC.resource).toBe('queue');
            expect(resC.scope).toBe('cell');
            expect(resC.retryAfterMs).toBeGreaterThan(0);
            assertNoMonetizationTerms(resC.reason!);

            // Installation A releases a queue -> Installation C can acquire
            manager.releaseQueue('inst-a', 'vc-a1');
            expect(manager.acquireQueue('inst-c', 'vc-c1').allowed).toBe(true);
        });
    });

    describe('2. Queue Track Capacity & Admission', () => {
        it('permits tracks within limit and rejects additions that exceed maxTracksPerQueue', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxTracksPerQueue: 100 },
            });

            // Current 50 tracks, adding 20 -> allowed (70 <= 100)
            const check1 = manager.checkQueueAdmission('inst-alpha', 50, 20);
            expect(check1.allowed).toBe(true);

            // Current 90 tracks, adding 10 -> allowed (100 <= 100)
            const check2 = manager.checkQueueAdmission('inst-alpha', 90, 10);
            expect(check2.allowed).toBe(true);

            // Current 90 tracks, adding 20 -> rejected (110 > 100)
            const check3 = manager.checkQueueAdmission('inst-alpha', 90, 20);
            expect(check3.allowed).toBe(false);
            expect(check3.resource).toBe('track');
            expect(check3.scope).toBe('installation');
            expect(check3.details?.current).toBe(110);
            expect(check3.details?.limit).toBe(100);
            assertNoMonetizationTerms(check3.reason!);
        });
    });

    describe('3. Command Rate Limiting & Bounded Retry', () => {
        it('allows commands up to rate limit and throttles with positive retryAfterMs', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxCommandsPerMinute: 3 },
            });

            // Invocations 1, 2, 3 allowed
            expect(manager.checkCommand('inst-alpha').allowed).toBe(true);
            expect(manager.checkCommand('inst-alpha').allowed).toBe(true);
            expect(manager.checkCommand('inst-alpha').allowed).toBe(true);

            // 4th invocation throttled
            const throttled = manager.checkCommand('inst-alpha');
            expect(throttled.allowed).toBe(false);
            expect(throttled.resource).toBe('command');
            expect(throttled.scope).toBe('installation');
            expect(throttled.retryAfterMs).toBeGreaterThan(0);
            expect(throttled.retryAfterMs).toBeLessThanOrEqual(60_000);
            assertNoMonetizationTerms(throttled.reason!);
        });

        it('enforces cell-level aggregate command protection', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxCommandsPerMinute: 10 },
                cellLimits: { maxCellCommandsPerMinute: 3 },
            });

            // 3 commands from distinct installations consume cell budget
            expect(manager.checkCommand('inst-1').allowed).toBe(true);
            expect(manager.checkCommand('inst-2').allowed).toBe(true);
            expect(manager.checkCommand('inst-3').allowed).toBe(true);

            // 4th command throttled at cell level
            const cellThrottled = manager.checkCommand('inst-4');
            expect(cellThrottled.allowed).toBe(false);
            expect(cellThrottled.resource).toBe('command');
            expect(cellThrottled.scope).toBe('cell');
            expect(cellThrottled.retryAfterMs).toBeGreaterThan(0);
            assertNoMonetizationTerms(cellThrottled.reason!);
        });
    });

    describe('4. Noisy-Neighbor Isolation', () => {
        it('prevents noisy installation from starving peer installation command rate', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxCommandsPerMinute: 2 },
                cellLimits: { maxCellCommandsPerMinute: 100 },
            });

            // Noisy Installation A floods commands
            expect(manager.checkCommand('noisy-inst').allowed).toBe(true);
            expect(manager.checkCommand('noisy-inst').allowed).toBe(true);
            const noisyThrottled = manager.checkCommand('noisy-inst');
            expect(noisyThrottled.allowed).toBe(false);

            // Peer Installation B is completely unaffected
            expect(manager.checkCommand('well-behaved-inst').allowed).toBe(true);
            expect(manager.checkCommand('well-behaved-inst').allowed).toBe(true);
        });

        it('prevents noisy installation from starving peer extraction child processes', async () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxConcurrentExtractions: 2 },
                cellLimits: { maxCellConcurrentExtractions: 10 },
            });

            // Installation A takes its 2 extraction slots
            const permitA1 = await manager.acquireExtraction('inst-a');
            const permitA2 = await manager.acquireExtraction('inst-a');
            expect(permitA1.allowed).toBe(true);
            expect(permitA2.allowed).toBe(true);

            // Installation A's 3rd extraction is rejected
            const permitA3 = await manager.acquireExtraction('inst-a');
            expect(permitA3.allowed).toBe(false);
            expect(permitA3.resource).toBe('extraction');
            expect(permitA3.scope).toBe('installation');

            // Installation B can still acquire extractions
            const permitB1 = await manager.acquireExtraction('inst-b');
            expect(permitB1.allowed).toBe(true);

            // Clean up permits
            await permitA1.dispose();
            await permitA2.dispose();
            await permitB1.dispose();
        });
    });

    describe('5. Audio Extraction Permit Concurrency & Deterministic Disposal', () => {
        it('tracks and releases extraction permits reliably even with multiple disposes', async () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxConcurrentExtractions: 1 },
                cellLimits: { maxCellConcurrentExtractions: 5 },
            });

            const permit1 = await manager.acquireExtraction('inst-test');
            expect(permit1.allowed).toBe(true);

            // Blocked while permit1 is active
            const blocked = await manager.acquireExtraction('inst-test');
            expect(blocked.allowed).toBe(false);
            expect(blocked.retryAfterMs).toBeGreaterThan(0);

            // Release permit1
            await permit1.dispose();
            // Second dispose is an idempotent no-op
            await permit1.dispose();

            // Next extraction succeeds
            const permit2 = await manager.acquireExtraction('inst-test');
            expect(permit2.allowed).toBe(true);
            await permit2.dispose();
        });

        it('enforces cell-level extraction limits', async () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxConcurrentExtractions: 5 },
                cellLimits: { maxCellConcurrentExtractions: 2 },
            });

            const p1 = await manager.acquireExtraction('inst-1');
            const p2 = await manager.acquireExtraction('inst-2');
            expect(p1.allowed).toBe(true);
            expect(p2.allowed).toBe(true);

            // 3rd extraction hits cell capacity
            const p3 = await manager.acquireExtraction('inst-3');
            expect(p3.allowed).toBe(false);
            expect(p3.resource).toBe('extraction');
            expect(p3.scope).toBe('cell');
            expect(p3.retryAfterMs).toBeGreaterThan(0);
            assertNoMonetizationTerms(p3.reason!);

            await p1.dispose();
            await p2.dispose();
        });
    });

    describe('6. Bandwidth Budget Management', () => {
        it('tracks upload and download bandwidth and throttles when budget is exceeded', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: {
                    maxUploadBytesPerMinute: 1000,
                    maxDownloadBytesPerMinute: 2000,
                },
                cellLimits: {
                    maxCellBandwidthBytesPerMinute: 10000,
                },
            });

            // Upload 600 bytes -> allowed
            expect(manager.checkAndRecordBandwidth('inst-1', 600, 'upload').allowed).toBe(true);

            // Upload another 500 bytes -> exceeds 1000 -> rejected
            const uploadThrottled = manager.checkAndRecordBandwidth('inst-1', 500, 'upload');
            expect(uploadThrottled.allowed).toBe(false);
            expect(uploadThrottled.resource).toBe('bandwidth_upload');
            expect(uploadThrottled.scope).toBe('installation');
            expect(uploadThrottled.retryAfterMs).toBeGreaterThan(0);
            assertNoMonetizationTerms(uploadThrottled.reason!);

            // Download 1500 bytes -> allowed (separate bucket)
            expect(manager.checkAndRecordBandwidth('inst-1', 1500, 'download').allowed).toBe(true);

            // Download another 600 bytes -> exceeds 2000 -> rejected
            const downloadThrottled = manager.checkAndRecordBandwidth('inst-1', 600, 'download');
            expect(downloadThrottled.allowed).toBe(false);
            expect(downloadThrottled.resource).toBe('bandwidth_download');
            assertNoMonetizationTerms(downloadThrottled.reason!);
        });
    });

    describe('7. Telemetry Metrics & Error Representation', () => {
        it('emits structured telemetry metrics on allow, throttle, and reject', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxCommandsPerMinute: 1 },
            });

            manager.checkCommand('inst-telemetry');
            manager.checkCommand('inst-telemetry');

            const metrics = manager.getMetrics();
            expect(metrics.length).toBeGreaterThanOrEqual(2);

            const allowMetric = metrics.find(
                (m) => m.installationId === 'inst-telemetry' && m.action === 'allow',
            );
            const throttleMetric = metrics.find(
                (m) => m.installationId === 'inst-telemetry' && m.action === 'throttle',
            );

            expect(allowMetric).toBeDefined();
            expect(allowMetric?.resource).toBe('command');

            expect(throttleMetric).toBeDefined();
            expect(throttleMetric?.resource).toBe('command');
            expect(throttleMetric?.retryAfterMs).toBeGreaterThan(0);
        });

        it('OperationalSafetyError formats error without pricing/plan terms', () => {
            const error = new OperationalSafetyError({
                allowed: false,
                resource: 'extraction',
                scope: 'installation',
                retryAfterMs: 3000,
                reason: 'Audio extraction concurrency threshold reached.',
            });

            expect(error.name).toBe('OperationalSafetyError');
            expect(error.message).toContain('Audio extraction concurrency threshold reached.');
            expect(error.result.retryAfterMs).toBe(3000);
            assertNoMonetizationTerms(error.message);
        });

        it('resets internal state cleanly', () => {
            const manager = new DefaultOperationalSafetyManager({
                installationLimits: { maxCommandsPerMinute: 1 },
            });

            manager.checkCommand('inst-reset');
            expect(manager.checkCommand('inst-reset').allowed).toBe(false);

            manager.reset();
            expect(manager.getMetrics()).toHaveLength(0);
            expect(manager.checkCommand('inst-reset').allowed).toBe(true);
        });
    });
});
