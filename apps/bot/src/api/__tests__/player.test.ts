import fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import musicPlayer from '../../core/music-player.js';
import playerRoutes from '../routes/player.js';

vi.mock('../../core/music-player.js', () => ({
    default: {
        seekQueue: vi.fn(),
    },
}));

describe('POST /api/player/seek', () => {
    const buildApp = async () => {
        const app = fastify();
        await app.register(playerRoutes);
        return app;
    };

    it('returns 400 when voiceChannelId is missing', async () => {
        const app = await buildApp();
        const response = await app.inject({
            method: 'POST',
            url: '/api/player/seek',
            payload: { position: 30 },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: 'voiceChannelId is required and must be a string',
        });
    });

    it('returns 400 when position is missing', async () => {
        const app = await buildApp();
        const response = await app.inject({
            method: 'POST',
            url: '/api/player/seek',
            payload: { voiceChannelId: 'vc-123' },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: 'position is required and must be a number or string',
        });
    });

    it('returns 404 when queue is not playing', async () => {
        const app = await buildApp();
        vi.mocked(musicPlayer.seekQueue).mockRejectedValue(
            new Error('There is nothing currently playing to seek in.'),
        );

        const response = await app.inject({
            method: 'POST',
            url: '/api/player/seek',
            payload: { voiceChannelId: 'vc-123', position: 50 },
        });
        expect(response.statusCode).toBe(404);
        expect(response.json().error).toContain('nothing currently playing');
    });

    it('returns 400 when seek position is invalid', async () => {
        const app = await buildApp();
        vi.mocked(musicPlayer.seekQueue).mockRejectedValue(
            new Error('Invalid seek position: "invalid". Please provide a valid timestamp.'),
        );

        const response = await app.inject({
            method: 'POST',
            url: '/api/player/seek',
            payload: { voiceChannelId: 'vc-123', position: 'invalid' },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json().error).toContain('Invalid seek position');
    });

    it('returns 200 with result when seek succeeds with numeric position', async () => {
        const app = await buildApp();
        vi.mocked(musicPlayer.seekQueue).mockResolvedValue({
            success: true,
            position: 90,
            track: {
                title: 'Bohemian Rhapsody',
                url: 'https://youtube.com/watch?v=123',
                durationInSec: 354,
            } as any,
        });

        const response = await app.inject({
            method: 'POST',
            url: '/api/player/seek',
            payload: { voiceChannelId: 'vc-123', position: 90 },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            success: true,
            position: 90,
            voiceChannelId: 'vc-123',
            track: {
                title: 'Bohemian Rhapsody',
                url: 'https://youtube.com/watch?v=123',
                duration: 354,
            },
        });
        expect(musicPlayer.seekQueue).toHaveBeenCalledWith('vc-123', 90);
    });

    it('returns 200 with result when seek succeeds with string timestamp', async () => {
        const app = await buildApp();
        vi.mocked(musicPlayer.seekQueue).mockResolvedValue({
            success: true,
            position: 120,
            track: {
                title: 'Bohemian Rhapsody',
                url: 'https://youtube.com/watch?v=123',
                durationInSec: 354,
            } as any,
        });

        const response = await app.inject({
            method: 'POST',
            url: '/api/player/seek',
            payload: { voiceChannelId: 'vc-123', position: '2:00' },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            success: true,
            position: 120,
            voiceChannelId: 'vc-123',
            track: {
                title: 'Bohemian Rhapsody',
                url: 'https://youtube.com/watch?v=123',
                duration: 354,
            },
        });
        expect(musicPlayer.seekQueue).toHaveBeenCalledWith('vc-123', '2:00');
    });
});
