import fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import db from '../../db/index.js';
import { YtDlpCookie } from '../../db/types.js';
import { CookieManager } from '../cookie-manager.js';

vi.mock('../../db/index.js', () => ({
    default: {
        getBestCookie: vi.fn(),
        rotateCookieStats: vi.fn(),
    },
}));

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true),
        promises: {
            writeFile: vi.fn(),
            unlink: vi.fn(),
        },
    },
}));

describe('CookieManager withCookieRetry', () => {
    let cookieManager: CookieManager;

    beforeEach(() => {
        vi.resetAllMocks();
        cookieManager = CookieManager.getInstance();
    });

    it('should successfully execute operation and report usage on success', async () => {
        const mockCookie = { id: 42, name: 'test-cookie', content: 'cookie content' };
        vi.mocked(db.getBestCookie).mockResolvedValue(mockCookie as unknown as YtDlpCookie);
        vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
        vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);

        const operation = vi.fn().mockResolvedValue('success-result');

        const result = await cookieManager.withCookieRetry(operation);

        expect(result).toBe('success-result');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(db.rotateCookieStats).toHaveBeenCalledWith(42, true);
    });

    it('should retry operation on auth error and report failure', async () => {
        const mockCookie = { id: 101, name: 'bad-cookie', content: 'bad content' };
        vi.mocked(db.getBestCookie).mockResolvedValue(mockCookie as unknown as YtDlpCookie);
        vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
        vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);

        // First attempt: throws a string "Sign in to confirm you’re not a bot"
        // Second attempt: succeeds
        const operation = vi
            .fn()
            .mockRejectedValueOnce('Sign in to confirm you’re not a bot')
            .mockResolvedValueOnce('success-after-retry');

        const result = await cookieManager.withCookieRetry(operation, 2);

        expect(result).toBe('success-after-retry');
        expect(operation).toHaveBeenCalledTimes(2);
        // Should report failure for first cookie/attempt
        expect(db.rotateCookieStats).toHaveBeenCalledWith(101, false);
    });

    it('should wrap non-Error caught values and throw a fallback error at the end if retry limit is reached', async () => {
        const mockCookie = { id: 202, name: 'failing-cookie', content: 'failing content' };
        vi.mocked(db.getBestCookie).mockResolvedValue(mockCookie as unknown as YtDlpCookie);
        vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
        vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);

        // Always throws non-Error value
        const operation = vi.fn().mockRejectedValue('Some arbitrary string error');

        await expect(cookieManager.withCookieRetry(operation, 1)).rejects.toThrow(
            'Some arbitrary string error',
        );
        expect(operation).toHaveBeenCalledTimes(2); // Initial (0) + 1 retry = 2
    });
});
