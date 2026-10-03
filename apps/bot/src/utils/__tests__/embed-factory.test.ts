import { describe, expect, it } from 'vitest';

import { nowPlayingEmbed, radioEmbed, sanitizeUrl, songAddedEmbed } from '../embed-factory.js';

describe('embed-factory', () => {
    describe('sanitizeUrl', () => {
        it('should accept valid http and https URLs', () => {
            expect(sanitizeUrl('https://example.com/image.png')).toBe(
                'https://example.com/image.png',
            );
            expect(sanitizeUrl('http://example.com/image.png')).toBe(
                'http://example.com/image.png',
            );
            expect(sanitizeUrl('https://example.com/image with spaces.png')).toBe(
                'https://example.com/image%20with%20spaces.png',
            );
        });

        it('should return null for relative URLs', () => {
            expect(sanitizeUrl('/api/plugins/garage-band/storage/audio/123.mp3')).toBeNull();
            expect(sanitizeUrl('relative/path.png')).toBeNull();
            expect(sanitizeUrl('./path.png')).toBeNull();
        });

        it('should return null for non-http protocols', () => {
            expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
            expect(sanitizeUrl('data:image/png;base64,...')).toBeNull();
            expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
        });

        it('should return null for empty or whitespace strings', () => {
            expect(sanitizeUrl('')).toBeNull();
            expect(sanitizeUrl('   ')).toBeNull();
        });
    });

    describe('embed builders with thumbnail sanitization', () => {
        const title = 'Test Track';
        const url = 'https://example.com/track';
        const workerName = 'TestWorker';
        const devPrefix = '';

        it('should not throw and should omit thumbnail when relative path is passed', () => {
            const relativeThumbnail = '/api/plugins/garage-band/storage/audio/track.mp3';

            expect(() => {
                const addedEmbed = songAddedEmbed(
                    title,
                    url,
                    relativeThumbnail,
                    workerName,
                    devPrefix,
                );
                expect(addedEmbed.data.thumbnail).toBeUndefined();
            }).not.toThrow();

            expect(() => {
                const npEmbed = nowPlayingEmbed(
                    title,
                    url,
                    relativeThumbnail,
                    workerName,
                    devPrefix,
                );
                expect(npEmbed.data.thumbnail).toBeUndefined();
            }).not.toThrow();

            expect(() => {
                const rEmbed = radioEmbed(title, url, relativeThumbnail, 'Jasper', devPrefix);
                expect(rEmbed.data.thumbnail).toBeUndefined();
            }).not.toThrow();
        });

        it('should set thumbnail when valid https URL is passed', () => {
            const validThumbnail = 'https://example.com/thumb.jpg';

            const addedEmbed = songAddedEmbed(title, url, validThumbnail, workerName, devPrefix);
            expect(addedEmbed.data.thumbnail?.url).toBe(validThumbnail);

            const npEmbed = nowPlayingEmbed(title, url, validThumbnail, workerName, devPrefix);
            expect(npEmbed.data.thumbnail?.url).toBe(validThumbnail);

            const rEmbed = radioEmbed(title, url, validThumbnail, 'Jasper', devPrefix);
            expect(rEmbed.data.thumbnail?.url).toBe(validThumbnail);
        });

        it('should handle undefined or empty thumbnail gracefully', () => {
            const addedEmbed = songAddedEmbed(title, url, undefined, workerName, devPrefix);
            expect(addedEmbed.data.thumbnail).toBeUndefined();

            const npEmbed = nowPlayingEmbed(title, url, '', workerName, devPrefix);
            expect(npEmbed.data.thumbnail).toBeUndefined();
        });
    });
});
