import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({
    default: {
        config: vi.fn(),
    },
}));

describe('Runtime Profile & Bot Catalog Provider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        Object.keys(process.env).forEach((key) => {
            if (key.endsWith('_TOKEN') || key.startsWith('JASPER_')) {
                delete process.env[key];
            }
        });
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should configure controller-only when no worker tokens are present', async () => {
        process.env.DISCORD_TOKEN = 'jasper-main-token';

        const { getBotConfigs } = await import('../bots.js');
        const configs = getBotConfigs();

        expect(configs).toHaveLength(1);
        expect(configs[0]).toEqual({
            name: 'Jasper',
            token: 'jasper-main-token',
            role: 'controller',
        });
    });

    it('should ignore infrastructure tokens like NPM_TOKEN and GITHUB_TOKEN', async () => {
        process.env.DISCORD_TOKEN = 'jasper-main-token';
        process.env.NPM_TOKEN = 'npm_secret_val';
        process.env.GITHUB_TOKEN = 'ghp_secret_val';
        process.env.AWS_SESSION_TOKEN = 'aws_secret_val';
        process.env.MISTY_TOKEN = 'misty-bot-token';

        const { getBotConfigs } = await import('../bots.js');
        const configs = getBotConfigs();

        expect(configs).toHaveLength(2);
        expect(configs.map((c) => c.name)).toEqual(['Jasper', 'Misty']);
    });

    it('should support explicit JASPER_WORKER_<NAME>_TOKEN format', async () => {
        process.env.DISCORD_TOKEN = 'jasper-main-token';
        process.env.JASPER_WORKER_TUKI_TOKEN = 'tuki-bot-token';
        process.env.JASPER_WORKER_MOCHI_TOKEN = 'mochi-bot-token';

        const { getBotConfigs } = await import('../bots.js');
        const configs = getBotConfigs();

        expect(configs).toHaveLength(3);
        expect(configs.map((c) => c.name)).toEqual(['Jasper', 'Tuki', 'Mochi']);
    });
});
