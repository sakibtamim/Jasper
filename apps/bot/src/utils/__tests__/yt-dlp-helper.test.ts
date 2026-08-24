import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dotenv to ensure test hermeticity and prevent local .env files from overriding test env
vi.mock('dotenv', () => ({
    default: {
        config: vi.fn(),
    },
}));

describe('yt-dlp-helper.ts', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getBaseYtDlpArgs', () => {
        it('should omit --extractor-args when YT_DLP_PLAYER_CLIENT is default', async () => {
            process.env.YT_DLP_PLAYER_CLIENT = 'default';
            process.env.YT_DLP_JS_RUNTIME = 'node';

            const { getBaseYtDlpArgs } = await import('../yt-dlp-helper.js');
            const args = getBaseYtDlpArgs();

            expect(args).toEqual(['--js-runtimes', 'node']);
        });

        it('should include --extractor-args when YT_DLP_PLAYER_CLIENT is set to custom client', async () => {
            process.env.YT_DLP_PLAYER_CLIENT = 'tv,web_creator';
            process.env.YT_DLP_JS_RUNTIME = 'node';

            const { getBaseYtDlpArgs } = await import('../yt-dlp-helper.js');
            const args = getBaseYtDlpArgs();

            expect(args).toEqual([
                '--js-runtimes',
                'node',
                '--extractor-args',
                'youtube:player_client=tv,web_creator',
            ]);
        });
    });

    describe('findYtDlpPath', () => {
        it('should find local binary if present in project roots', async () => {
            const fs = await import('fs');
            const existsSpy = vi.spyOn(fs.default, 'existsSync').mockImplementation((p) => {
                return String(p).endsWith('yt-dlp');
            });

            const { findYtDlpPath } = await import('../yt-dlp-helper.js');
            const result = findYtDlpPath();

            expect(result).toBeTruthy();
            expect(result?.endsWith('yt-dlp')).toBe(true);

            existsSpy.mockRestore();
        });
    });
});
