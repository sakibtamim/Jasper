import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
});
