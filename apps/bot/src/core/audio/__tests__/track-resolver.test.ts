import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTrack } from '../track-resolver.js';
import * as streamHandler from '../stream-handler.js';
import ytSearch from 'yt-search';
import * as cacheManager from '../../cache-manager.js';

// Mocks
vi.mock('../stream-handler.js', () => ({
    fetchVideoData: vi.fn(),
    isUrl: vi.fn(),
    isAttachmentUrl: vi.fn().mockReturnValue(false),
}));

vi.mock('yt-search', () => ({
    default: vi.fn(),
}));

vi.mock('../../cache-manager.js', () => ({
    isCacheEnabled: vi.fn(),
    getCacheStorage: vi.fn(),
}));

describe('resolveTrack', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should resolve a URL directly', async () => {
        vi.mocked(streamHandler.isUrl).mockReturnValue(true);
        vi.mocked(streamHandler.fetchVideoData).mockResolvedValue({
            title: 'Test Song',
            webpage_url: 'http://example.com/song',
            duration: 120,
            thumbnail: 'thumb.jpg',
            url: 'http://example.com/stream',
        } as any);

        const track = await resolveTrack('http://example.com/song');

        expect(track).toEqual({
            title: 'Test Song',
            url: 'http://example.com/song',
            durationInSec: 120,
            requestedBy: 'Unknown',
            thumbnail: 'thumb.jpg',
            sourceType: 'youtube',
        });
    });

    it('should search YouTube if not a URL', async () => {
        vi.mocked(streamHandler.isUrl).mockReturnValue(false);
        vi.mocked(ytSearch).mockResolvedValue({
            videos: [{
                title: 'Search Result',
                url: 'http://youtube.com/watch?v=123',
                seconds: 180,
                thumbnail: 'thumb.jpg',
            }],
        } as any);

        const track = await resolveTrack('search query');

        expect(track).toEqual({
            title: 'Search Result',
            url: 'http://youtube.com/watch?v=123',
            durationInSec: 180,
            requestedBy: 'Unknown',
            thumbnail: 'thumb.jpg',
            sourceType: 'youtube',
        });
    });

    it('should use cache if enabled', async () => {
        vi.mocked(streamHandler.isUrl).mockReturnValue(false);
        vi.mocked(cacheManager.isCacheEnabled).mockReturnValue(true);

        const mockStorage = {
            getCachedSearchResult: vi.fn().mockResolvedValue({
                title: 'Cached Song',
                url: 'http://cached.com',
                durationInSec: 200,
            }),
            setCachedSearchResult: vi.fn(),
        };
        vi.mocked(cacheManager.getCacheStorage).mockReturnValue(mockStorage as any);

        const track = await resolveTrack('cached query');

        expect(track).toEqual({
            title: 'Cached Song',
            url: 'http://cached.com',
            durationInSec: 200,
        });
        expect(ytSearch).not.toHaveBeenCalled();
    });

    it('should throw error if no results found', async () => {
        vi.mocked(streamHandler.isUrl).mockReturnValue(false);
        vi.mocked(ytSearch).mockResolvedValue({ videos: [] } as any);

        await expect(resolveTrack('no results')).rejects.toThrow('No results found on YouTube.');
    });
});
