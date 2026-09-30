import { HealthReport } from '@jasper/types';
import { describe, expect, it, vi } from 'vitest';

import { HealthAggregator } from '../../core/health/health-aggregator.js';
import { buildServer } from '../server.js';

vi.mock('../../core/music-player.js', () => ({
    default: {
        getQueues: vi.fn().mockReturnValue(new Map()),
        seekQueue: vi.fn(),
    },
}));

vi.mock('../../config/env.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../config/env.js')>();
    return {
        ...actual,
        DISCORD_CLIENT_ID: 'mock-client-id',
        DISCORD_CLIENT_SECRET: 'mock-client-secret',
        COOKIE_SECRET: 'super-secret-cookie-key-with-at-least-32-chars!!',
        ENCRYPTION_KEY: 'mock-encryption-key-32-chars-long!',
        validateAuthConfig: vi.fn(),
    };
});

describe('Health and Telemetry API Endpoints (HJ-OSS-11)', () => {
    const TEST_WORKLOAD_TOKEN = 'secret-workload-token-health-test';

    it('GET /health/live returns 200 with minimal status without authentication', async () => {
        const app = buildServer({
            profile: 'hosted',
            workloadTokens: [TEST_WORKLOAD_TOKEN],
        });

        const res = await app.inject({
            method: 'GET',
            url: '/health/live',
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: 'live' });
    });

    it('GET /health/ready returns 200 when ready and leaks NO sensitive topology', async () => {
        const mockHealthAggregator = {
            getPublicLive: () => ({ status: 'live' as const }),
            getPublicReady: async () => ({
                ready: true,
                payload: { status: 'ready' as const },
                statusCode: 200 as const,
            }),
            getInternalHealth: async () => ({}) as unknown as HealthReport,
        } as unknown as HealthAggregator;

        const app = buildServer({
            profile: 'hosted',
            healthAggregator: mockHealthAggregator,
        });

        const res = await app.inject({
            method: 'GET',
            url: '/health/ready',
        });

        expect(res.statusCode).toBe(200);
        const data = res.json();
        expect(data).toEqual({ status: 'ready' });
        expect(Object.keys(data)).toEqual(['status']);
    });

    it('GET /health/ready returns 503 when unready and leaks NO sensitive topology', async () => {
        const mockHealthAggregator = {
            getPublicLive: () => ({ status: 'live' as const }),
            getPublicReady: async () => ({
                ready: false,
                payload: { status: 'unready' as const },
                statusCode: 503 as const,
            }),
            getInternalHealth: async () => ({}) as unknown as HealthReport,
        } as unknown as HealthAggregator;

        const app = buildServer({
            profile: 'hosted',
            healthAggregator: mockHealthAggregator,
        });

        const res = await app.inject({
            method: 'GET',
            url: '/health/ready',
        });

        expect(res.statusCode).toBe(503);
        const data = res.json();
        expect(data).toEqual({ status: 'unready' });
        expect(Object.keys(data)).toEqual(['status']);
    });

    it('GET /internal/health requires authentication and returns full report', async () => {
        const mockReport = {
            status: 'healthy',
            live: true,
            ready: true,
            degraded: false,
            draining: false,
            fenceValid: true,
            profile: 'hosted',
            environment: 'prod-us-east',
            release: 'v1.0.0',
            bootId: 'boot-abc',
            shardId: 0,
            shardCount: 1,
            fenceEpoch: 3,
            components: {
                controller: { name: 'controller', status: 'healthy', lastCheckedAt: new Date() },
            },
        };

        const mockHealthAggregator = {
            getPublicLive: () => ({ status: 'live' as const }),
            getPublicReady: async () => ({
                ready: true,
                payload: { status: 'ready' as const },
                statusCode: 200 as const,
            }),
            getInternalHealth: async () => mockReport,
        } as unknown as HealthAggregator;

        const app = buildServer({
            profile: 'hosted',
            workloadTokens: [TEST_WORKLOAD_TOKEN],
            healthAggregator: mockHealthAggregator,
        });

        // 1. Unauthenticated request -> 401
        const unauthRes = await app.inject({
            method: 'GET',
            url: '/internal/health',
        });
        expect(unauthRes.statusCode).toBe(401);

        // 2. Authenticated with workload token -> 200
        const authRes = await app.inject({
            method: 'GET',
            url: '/internal/health',
            headers: {
                'x-workload-token': TEST_WORKLOAD_TOKEN,
            },
        });
        expect(authRes.statusCode).toBe(200);
        const report = authRes.json();
        expect(report.fenceEpoch).toBe(3);
        expect(report.components.controller.status).toBe('healthy');
    });

    it('GET /metrics requires authentication and returns Prometheus format text', async () => {
        const app = buildServer({
            profile: 'hosted',
            workloadTokens: [TEST_WORKLOAD_TOKEN],
        });

        // 1. Unauthenticated request -> 401
        const unauthRes = await app.inject({
            method: 'GET',
            url: '/metrics',
        });
        expect(unauthRes.statusCode).toBe(401);

        // 2. Authenticated request -> 200
        const authRes = await app.inject({
            method: 'GET',
            url: '/metrics',
            headers: {
                'x-workload-token': TEST_WORKLOAD_TOKEN,
            },
        });
        expect(authRes.statusCode).toBe(200);
        expect(authRes.headers['content-type']).toContain('text/plain');
    });
});
