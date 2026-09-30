import { sign } from '@fastify/cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import db from '../../core/db/index.js';
import musicPlayer from '../../core/music-player.js';
import { assertHostedRouteSafety, isForbiddenHostedRoute } from '../hosted-guard.js';
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

describe('HTTP Authorization Guard & Hosted Runtime Safety (HJ-OSS-09)', () => {
    const TEST_COOKIE_SECRET = 'super-secret-cookie-key-with-at-least-32-chars!!';
    const TEST_OPERATOR_TOKEN = 'secret-operator-token-xyz';
    const TEST_WORKLOAD_TOKEN = 'secret-workload-token-abc';

    const testUserAlice = {
        id: 'user-alice-123',
        username: 'Alice',
        discriminator: '0001',
        avatar: 'avatar123',
        accessToken: 'encrypted-access-token-123',
        refreshToken: 'encrypted-refresh-token-123',
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const testUserBob = {
        id: 'user-bob-456',
        username: 'Bob',
        discriminator: '0002',
        avatar: null,
        accessToken: 'encrypted-access-token-456',
        refreshToken: 'encrypted-refresh-token-456',
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // Custom membership resolver for tests:
    // Alice is a tenant_member of 'guild-alpha'
    // Bob is a tenant_member of 'guild-beta'
    const testMembershipResolver = async (userId: string, guildId: string) => {
        if (userId === testUserAlice.id && guildId === 'guild-alpha') {
            return {
                type: 'tenant_member' as const,
                userId: testUserAlice.id,
                username: testUserAlice.username,
                guildId: 'guild-alpha',
                role: 'member' as const,
            };
        }
        if (userId === testUserBob.id && guildId === 'guild-beta') {
            return {
                type: 'tenant_member' as const,
                userId: testUserBob.id,
                username: testUserBob.username,
                guildId: 'guild-beta',
                role: 'owner' as const,
            };
        }
        return null;
    };

    const createSelfHostedApp = () => {
        return buildServer({
            profile: 'self-hosted',
            cookieSecret: TEST_COOKIE_SECRET,
            operatorTokens: [TEST_OPERATOR_TOKEN],
            workloadTokens: [TEST_WORKLOAD_TOKEN],
            membershipResolver: testMembershipResolver,
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DB calls for sessions and users
        vi.spyOn(db, 'getSession').mockImplementation(async (sessionId: string) => {
            if (sessionId === 'valid-alice-session') {
                return {
                    id: 'valid-alice-session',
                    userId: testUserAlice.id,
                    expiresAt: new Date(Date.now() + 3600000),
                    createdAt: new Date(),
                };
            }
            if (sessionId === 'valid-bob-session') {
                return {
                    id: 'valid-bob-session',
                    userId: testUserBob.id,
                    expiresAt: new Date(Date.now() + 3600000),
                    createdAt: new Date(),
                };
            }
            return null;
        });

        vi.spyOn(db, 'getUser').mockImplementation(async (userId: string) => {
            if (userId === testUserAlice.id) return testUserAlice;
            if (userId === testUserBob.id) return testUserBob;
            return null;
        });

        vi.spyOn(db, 'getAllUsers').mockResolvedValue({
            users: [testUserAlice, testUserBob],
            total: 2,
        });

        vi.spyOn(db, 'getCookies').mockResolvedValue([
            {
                id: 1,
                name: 'youtube-cookies',
                content: 'SECRET_YOUTUBE_COOKIE_DATA=abc123xyz',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);

        vi.spyOn(db, 'getGlobalStats').mockResolvedValue({
            totalPlays: 10,
            totalDuration: 200,
        });
    });

    describe('1. Role & Principal Separation', () => {
        it('allows anonymous access to public endpoints', async () => {
            const app = createSelfHostedApp();
            const res = await app.inject({
                method: 'GET',
                url: '/health/live',
            });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toEqual({ status: 'live' });
        });

        it('denies anonymous access to protected tenant routes with 401 Unauthorized', async () => {
            const app = createSelfHostedApp();
            const res = await app.inject({
                method: 'POST',
                url: '/api/player/seek',
                payload: { voiceChannelId: 'vc-1', position: 10 },
            });
            expect(res.statusCode).toBe(401);
            expect(res.json().error).toContain('authentication required');
        });

        it('denies customer user without tenant membership on tenant-scoped route with 403 Forbidden', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            // Alice makes a request without providing guild context, or targeting an unknown guild
            const res = await app.inject({
                method: 'POST',
                url: '/api/player/seek',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                    'x-jasper-guild-id': 'guild-unknown',
                },
                payload: { voiceChannelId: 'vc-1', position: 10 },
            });

            expect(res.statusCode).toBe(403);
            expect(res.json().error).toContain('guild/tenant membership required');
        });

        it('enforces "any authenticated user grants no global mutation" for customer users', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            // Customer user attempting plugin installation or storage upload
            const res = await app.inject({
                method: 'POST',
                url: '/api/plugins/install',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                },
            });

            expect(res.statusCode).toBe(403);
            expect(res.json().error).toMatch(
                /customer user has no global mutation authority|principal type "customer_user" not allowed/,
            );
        });

        it('allows tenant member to access tenant-scoped route in their own guild', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            vi.mocked(musicPlayer.seekQueue).mockResolvedValue({
                success: true,
                position: 45,
                track: {
                    title: 'Test Song',
                    url: 'https://example.com/song',
                    durationInSec: 180,
                } as unknown as import('@jasper/types').Song,
            });

            const res = await app.inject({
                method: 'POST',
                url: '/api/player/seek',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                    'x-jasper-guild-id': 'guild-alpha',
                },
                payload: { voiceChannelId: 'vc-alpha-1', position: 45 },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().success).toBe(true);
            expect(res.json().position).toBe(45);
        });

        it('allows staff principal to access operator routes via Bearer token', async () => {
            const app = createSelfHostedApp();
            const res = await app.inject({
                method: 'GET',
                url: '/api/operator/health',
                headers: {
                    authorization: `Bearer ${TEST_OPERATOR_TOKEN}`,
                },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().status).toBe('ok');
        });

        it('allows staff principal to access operator routes via x-jasper-operator-token header', async () => {
            const app = createSelfHostedApp();
            const res = await app.inject({
                method: 'GET',
                url: '/api/operator/workers',
                headers: {
                    'x-jasper-operator-token': TEST_OPERATOR_TOKEN,
                },
            });

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.json().workers)).toBe(true);
        });

        it('denies customer user and tenant member access to operator routes with 403 Forbidden', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            const res = await app.inject({
                method: 'GET',
                url: '/api/operator/health',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                    'x-jasper-guild-id': 'guild-alpha',
                },
            });

            expect(res.statusCode).toBe(403);
            expect(res.json().error).toContain('not allowed for this route');
        });

        it('allows runtime workload to access workload endpoints', async () => {
            const app = createSelfHostedApp();
            const res = await app.inject({
                method: 'POST',
                url: '/api/workload/heartbeat',
                headers: {
                    'x-jasper-workload-token': TEST_WORKLOAD_TOKEN,
                },
                payload: { epoch: 10 },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().acknowledged).toBe(true);
            expect(res.json().echo).toBe(10);
        });

        it('denies non-workload principals access to workload routes with 403 Forbidden', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            const res = await app.inject({
                method: 'POST',
                url: '/api/workload/heartbeat',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                },
                payload: { epoch: 10 },
            });

            expect(res.statusCode).toBe(403);
            expect(res.json().error).toContain('not allowed for this route');
        });
    });

    describe('2. Cross-Guild Denial', () => {
        it('denies Alice (member of guild-alpha) from accessing or seeking in guild-beta', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            // Alice provides her session, but attempts to operate on guild-beta
            const res = await app.inject({
                method: 'POST',
                url: '/api/player/seek',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                    'x-jasper-guild-id': 'guild-beta',
                },
                payload: { voiceChannelId: 'vc-beta-1', position: 30, guildId: 'guild-beta' },
            });

            expect(res.statusCode).toBe(403);
            expect(res.json().error).toMatch(
                /cross-guild access denied|guild\/tenant membership required/,
            );
        });

        it('denies Bob (owner of guild-beta) from accessing resources in guild-alpha', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-bob-session', TEST_COOKIE_SECRET);

            const res = await app.inject({
                method: 'POST',
                url: '/api/player/seek',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                    'x-jasper-guild-id': 'guild-alpha',
                },
                payload: { voiceChannelId: 'vc-alpha-1', position: 15 },
            });

            expect(res.statusCode).toBe(403);
            expect(res.json().error).toMatch(
                /cross-guild access denied|guild\/tenant membership required/,
            );
        });
    });

    describe('3. Hosted Runtime Profile Safety & Disabled Routes', () => {
        it('hosted server does not expose legacy /api/auth/* routes', async () => {
            const app = buildServer({ profile: 'hosted' });
            const res = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
            });
            expect(res.statusCode).toBe(404);
        });

        it('hosted server does not expose DevTools routes', async () => {
            const app = buildServer({ profile: 'hosted' });
            const res = await app.inject({
                method: 'GET',
                url: '/api/devtools/stats',
            });
            expect(res.statusCode).toBe(404);
        });

        it('hosted server does not expose global dashboard routes', async () => {
            const app = buildServer({ profile: 'hosted' });
            const res = await app.inject({
                method: 'GET',
                url: '/api/status',
            });
            expect(res.statusCode).toBe(404);
        });

        it('hosted server does not expose customer plugin installation routes', async () => {
            const app = buildServer({ profile: 'hosted' });
            const res = await app.inject({
                method: 'POST',
                url: '/api/plugins/install',
            });
            expect(res.statusCode).toBe(404);
        });

        it('fails closed on startup if legacy auth routes are enabled in hosted profile', () => {
            expect(() => {
                buildServer({ profile: 'hosted', enableLegacyAuth: true });
            }).toThrow(
                /Hosted startup validation failed: legacy \/api\/auth\/\* routes cannot be enabled in hosted profile/,
            );
        });

        it('fails closed on startup if devtools routes are enabled in hosted profile', () => {
            expect(() => {
                buildServer({ profile: 'hosted', enableDevtools: true });
            }).toThrow(
                /Hosted startup validation failed: DevTools routes cannot be enabled in hosted profile/,
            );
        });

        it('fails closed on startup if global dashboard routes are enabled in hosted profile', () => {
            expect(() => {
                buildServer({ profile: 'hosted', enableLegacyDashboard: true });
            }).toThrow(
                /Hosted startup validation failed: global dashboard routes cannot be enabled in hosted profile/,
            );
        });

        it('fails closed on startup if plugin management routes are enabled in hosted profile', () => {
            expect(() => {
                buildServer({ profile: 'hosted', enablePluginManagement: true });
            }).toThrow(
                /Hosted startup validation failed: customer plugin-management routes cannot be enabled in hosted profile/,
            );
        });

        it('identifies forbidden hosted route patterns correctly', () => {
            expect(isForbiddenHostedRoute('/api/auth/login').forbidden).toBe(true);
            expect(isForbiddenHostedRoute('/api/auth/callback').forbidden).toBe(true);
            expect(isForbiddenHostedRoute('/api/devtools/users').forbidden).toBe(true);
            expect(isForbiddenHostedRoute('/api/status').forbidden).toBe(true);
            expect(isForbiddenHostedRoute('/api/queues').forbidden).toBe(true);
            expect(isForbiddenHostedRoute('/api/plugins/install').forbidden).toBe(true);
            expect(isForbiddenHostedRoute('/api/player/seek').forbidden).toBe(false);
            expect(isForbiddenHostedRoute('/api/operator/health').forbidden).toBe(false);
        });

        it('assertHostedRouteSafety throws when hosted profile server has legacy routes enabled', () => {
            const selfHostedApp = buildServer({ profile: 'self-hosted', enableLegacyAuth: true });
            expect(() => {
                assertHostedRouteSafety(selfHostedApp, 'hosted');
            }).toThrow(/Hosted startup validation failed/);
        });
    });

    describe('4. Token & Media Cookie Sanitization (No Leaks)', () => {
        it('never returns decrypted or raw OAuth tokens in user management responses', async () => {
            const app = createSelfHostedApp();
            const res = await app.inject({
                method: 'GET',
                url: '/api/devtools/users',
                headers: {
                    'x-jasper-operator-token': TEST_OPERATOR_TOKEN,
                },
            });

            expect(res.statusCode).toBe(200);
            const data = res.json();
            expect(data.users.length).toBeGreaterThan(0);
            for (const user of data.users) {
                expect(user.accessToken).toBeUndefined();
                expect(user.refreshToken).toBeUndefined();
            }
        });

        it('never returns raw media cookie contents in cookie management responses', async () => {
            const app = createSelfHostedApp();
            const res = await app.inject({
                method: 'GET',
                url: '/api/devtools/cookies',
                headers: {
                    'x-jasper-operator-token': TEST_OPERATOR_TOKEN,
                },
            });

            expect(res.statusCode).toBe(200);
            const data = res.json();
            expect(data.cookies.length).toBeGreaterThan(0);
            for (const cookie of data.cookies) {
                expect(cookie.content).toBeUndefined();
                expect(cookie.hasContent).toBe(true);
                expect(cookie.contentLength).toBeGreaterThan(0);
            }
        });

        it('never returns tokens in /api/auth/me response', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            const res = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                },
            });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.user.id).toBe(testUserAlice.id);
            expect(body.user.accessToken).toBeUndefined();
            expect(body.user.refreshToken).toBeUndefined();
        });
    });

    describe('5. Signed Session Behavior', () => {
        it('denies tampered or corrupted session cookie with 401 Unauthorized', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);
            // Tamper with the signed cookie value
            const tamperedCookie = signedCookie + 'tampered';

            const res = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    cookie: `session_id=${tamperedCookie}`,
                },
            });

            expect(res.statusCode).toBe(401);
            expect(res.json().error).toContain('authentication required');
        });

        it('denies unsigned session cookie when cookie secret is enforced', async () => {
            const app = createSelfHostedApp();
            // Raw unsigned session ID
            const unsignedCookie = 'valid-alice-session';

            const res = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    cookie: `session_id=${unsignedCookie}`,
                },
            });

            expect(res.statusCode).toBe(401);
            expect(res.json().error).toContain('authentication required');
        });

        it('accepts authentic signed session cookie', async () => {
            const app = createSelfHostedApp();
            const signedCookie = sign('valid-alice-session', TEST_COOKIE_SECRET);

            const res = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    cookie: `session_id=${signedCookie}`,
                },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().user.username).toBe('Alice');
        });
    });
});
