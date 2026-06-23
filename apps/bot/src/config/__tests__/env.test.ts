import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dotenv to prevent it from loading .env file and overriding our test setup
vi.mock('dotenv', () => ({
    default: {
        config: vi.fn(),
    },
}));

describe('env.ts', () => {
    // Store original env vars
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset modules to re-import env.ts with fresh state
        vi.resetModules();
        // Clone process.env
        process.env = { ...originalEnv };
        // Delete all _TOKEN env vars to ensure a clean slate for token tests
        Object.keys(process.env).forEach((key) => {
            if (key.endsWith('_TOKEN')) {
                delete process.env[key];
            }
        });
    });

    afterEach(() => {
        // Restore original env vars
        process.env = originalEnv;
    });

    describe('validateBotConfig', () => {
        it('should throw when DISCORD_TOKEN is missing', async () => {
            delete process.env.DISCORD_TOKEN;
            const { validateBotConfig } = await import('../env.js');
            expect(() => validateBotConfig()).toThrow(
                'Missing required environment variable: DISCORD_TOKEN',
            );
        });

        it('should not throw when DISCORD_TOKEN is set', async () => {
            process.env.DISCORD_TOKEN = 'test-token';
            const { validateBotConfig } = await import('../env.js');
            expect(() => validateBotConfig()).not.toThrow();
        });
    });

    describe('validateAuthConfig', () => {
        it('should throw when auth vars are missing', async () => {
            delete process.env.DISCORD_CLIENT_ID;
            delete process.env.DISCORD_CLIENT_SECRET;
            delete process.env.COOKIE_SECRET;
            delete process.env.ENCRYPTION_KEY;

            const { validateAuthConfig } = await import('../env.js');
            expect(() => validateAuthConfig()).toThrow(/Authentication configuration error/);
        });

        it('should not throw when all auth vars are set', async () => {
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.DISCORD_CLIENT_SECRET = 'test-secret';
            process.env.COOKIE_SECRET = 'test-cookie-secret-that-is-long-enough';
            process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-long-enough';

            const { validateAuthConfig } = await import('../env.js');
            expect(() => validateAuthConfig()).not.toThrow();
        });

        it('should throw when COOKIE_SECRET is too short in production', async () => {
            process.env.NODE_ENV = 'production';
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.DISCORD_CLIENT_SECRET = 'test-secret';
            process.env.COOKIE_SECRET = 'short';
            process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-long-enough';

            const { validateAuthConfig } = await import('../env.js');
            expect(() => validateAuthConfig()).toThrow(
                /COOKIE_SECRET must be at least 32 characters long in production/,
            );
        });

        it('should throw when ENCRYPTION_KEY is too short in production', async () => {
            process.env.NODE_ENV = 'production';
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.DISCORD_CLIENT_SECRET = 'test-secret';
            process.env.COOKIE_SECRET = 'test-cookie-secret-that-is-long-enough';
            process.env.ENCRYPTION_KEY = 'short';

            const { validateAuthConfig } = await import('../env.js');
            expect(() => validateAuthConfig()).toThrow(
                /ENCRYPTION_KEY must be at least 32 characters long in production/,
            );
        });

        it('should allow short secrets in development', async () => {
            process.env.NODE_ENV = 'development';
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.DISCORD_CLIENT_SECRET = 'test-secret';
            process.env.COOKIE_SECRET = 'short';
            process.env.ENCRYPTION_KEY = 'short';

            const { validateAuthConfig } = await import('../env.js');
            expect(() => validateAuthConfig()).not.toThrow();
        });
    });

    describe('validateDeployConfig', () => {
        it('should throw when deploy vars are missing', async () => {
            delete process.env.DISCORD_CLIENT_ID;
            delete process.env.GUILD_ID;
            delete process.env.DISCORD_TOKEN;

            const { validateDeployConfig } = await import('../env.js');
            expect(() => validateDeployConfig()).toThrow(
                /Missing required environment variables for command deployment/,
            );
        });

        it('should not throw when all deploy vars are set', async () => {
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.GUILD_ID = 'test-guild-id';
            process.env.DISCORD_TOKEN = 'test-token';

            const { validateDeployConfig } = await import('../env.js');
            expect(() => validateDeployConfig()).not.toThrow();
        });
    });

    describe('getWorkerTokens', () => {
        it('should find worker tokens from env vars', async () => {
            process.env.MISTY_TOKEN = 'misty-token';
            process.env.TUKI_TOKEN = 'tuki-token';

            const { getWorkerTokens } = await import('../env.js');
            const workers = getWorkerTokens();

            expect(workers).toHaveLength(2);
            expect(workers).toContainEqual({ name: 'Misty', token: 'misty-token' });
            expect(workers).toContainEqual({ name: 'Tuki', token: 'tuki-token' });
        });

        it('should not include DISCORD_TOKEN as a worker', async () => {
            process.env.DISCORD_TOKEN = 'main-token';
            process.env.MISTY_TOKEN = 'misty-token';

            const { getWorkerTokens } = await import('../env.js');
            const workers = getWorkerTokens();

            expect(workers).toHaveLength(1);
            expect(workers[0].name).toBe('Misty');
        });

        it('should convert multi-word names correctly', async () => {
            process.env.MY_COOL_BOT_TOKEN = 'cool-bot-token';

            const { getWorkerTokens } = await import('../env.js');
            const workers = getWorkerTokens();

            expect(workers).toContainEqual({
                name: 'My Cool Bot',
                token: 'cool-bot-token',
            });
        });
    });

    describe('default values', () => {
        it('should use default values for optional vars', async () => {
            // Clear optional vars
            delete process.env.CACHE_ENABLED;
            delete process.env.AFR_JASPER_WEIGHT;
            delete process.env.PORT;

            const env = await import('../env.js');

            expect(env.CACHE_ENABLED).toBe(false);
            expect(env.AFR_JASPER_WEIGHT).toBe(0.5);
            expect(env.PORT).toBe(0);
        });

        it('should parse env var values correctly', async () => {
            process.env.CACHE_ENABLED = 'true';
            process.env.AFR_JASPER_WEIGHT = '0.75';
            process.env.PORT = '3000';

            const env = await import('../env.js');

            expect(env.CACHE_ENABLED).toBe(true);
            expect(env.AFR_JASPER_WEIGHT).toBe(0.75);
            expect(env.PORT).toBe(3000);
        });
    });

    describe('AFR_JASPER_WEIGHT validation', () => {
        it('should throw for invalid AFR_JASPER_WEIGHT', async () => {
            process.env.AFR_JASPER_WEIGHT = '1.5';

            await expect(import('../env.js')).rejects.toThrow(/must be <= 1/);
        });

        it('should throw for negative AFR_JASPER_WEIGHT', async () => {
            process.env.AFR_JASPER_WEIGHT = '-0.5';

            await expect(import('../env.js')).rejects.toThrow(/must be >= 0/);
        });
    });
});
