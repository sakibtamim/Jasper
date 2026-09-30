import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SqliteAdapter } from '../sqlite-adapter.js';

describe('SqliteAdapter', () => {
    let adapter: SqliteAdapter;
    const testDbPath = path.join(process.cwd(), 'data', 'test-jasper.db');

    beforeEach(async () => {
        const dir = path.dirname(testDbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Clean up previous test DB if exists
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        adapter = new SqliteAdapter(testDbPath);
        await adapter.init();
    });

    afterEach(async () => {
        await adapter.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    it('should initialize the database', () => {
        expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should track plays and retrieve stats', async () => {
        const playRecord = {
            userId: 'user123',
            guildId: 'guild123',
            channelId: 'channel123',
            botName: 'TestBot',
            songTitle: 'Test Song',
            songUrl: 'http://example.com/song',
            duration: 180,
            playedAt: new Date(),
        };

        await adapter.trackPlay(playRecord);

        const topSongs = await adapter.getTopSongs(1);
        expect(topSongs).toHaveLength(1);
        expect(topSongs[0].songTitle).toBe('Test Song');
        expect(topSongs[0].playCount).toBe(1);

        const topUsers = await adapter.getTopUsers(1);
        expect(topUsers).toHaveLength(1);
        expect(topUsers[0].userId).toBe('user123');
        expect(topUsers[0].playCount).toBe(1);

        const globalStats = await adapter.getGlobalStats();
        expect(globalStats.totalPlays).toBe(1);
        expect(globalStats.totalDuration).toBe(180);
    });

    it('should aggregate stats correctly', async () => {
        const record1 = {
            userId: 'user1',
            guildId: 'guild1',
            channelId: 'channel1',
            botName: 'TestBot',
            songTitle: 'Song A',
            songUrl: 'https://example.com/a',
            duration: 180,
            playedAt: new Date('2024-01-01'),
        };
        const record2 = {
            userId: 'user1',
            guildId: 'guild1',
            channelId: 'channel1',
            botName: 'TestBot',
            songTitle: 'Song A',
            songUrl: 'https://example.com/a',
            duration: 180,
            playedAt: new Date('2024-01-01'),
        };
        const record3 = {
            userId: 'user2',
            guildId: 'guild1',
            channelId: 'channel1',
            botName: 'TestBot',
            songTitle: 'Song B',
            songUrl: 'https://example.com/b',
            duration: 200,
            playedAt: new Date('2024-01-02'),
        };

        await adapter.trackPlay(record1);
        await adapter.trackPlay(record2);
        await adapter.trackPlay(record3);

        const topSongs = await adapter.getTopSongs(5);
        expect(topSongs).toHaveLength(2);
        expect(topSongs[0].songTitle).toBe('Song A');
        expect(topSongs[0].playCount).toBe(2);

        const topUsers = await adapter.getTopUsers(5);
        expect(topUsers).toHaveLength(2);
        expect(topUsers[0].userId).toBe('user1');
        expect(topUsers[0].playCount).toBe(2);

        const globalStats = await adapter.getGlobalStats();
        expect(globalStats.totalPlays).toBe(3);
        expect(globalStats.totalDuration).toBe(560);
    });

    it('should map null DB thumbnails to undefined in cache getters', async () => {
        // Test search cache
        await adapter.setCachedSearchResult(
            'test query',
            'Song A',
            'https://example.com/a',
            180,
            undefined,
            1,
        );

        const cachedSearch = await adapter.getCachedSearchResult('test query');
        expect(cachedSearch).not.toBeNull();
        expect(cachedSearch!.thumbnail).toBeUndefined();

        // Test audio metadata
        await adapter.setAudioMetadata(
            'video123',
            'Song A',
            'https://example.com/a',
            180,
            undefined,
            ['tag1'],
            1,
        );

        const metadata = await adapter.getAudioMetadata('video123');
        expect(metadata).not.toBeNull();
        expect(metadata!.thumbnail).toBeUndefined();

        const randomSong = await adapter.getRandomCachedSong();
        expect(randomSong).not.toBeNull();
        expect(randomSong!.thumbnail).toBeUndefined();
    });

    it('should isolate plays and stats by installationId', async () => {
        const record1 = {
            userId: 'user1',
            guildId: 'guild1',
            channelId: 'channel1',
            botName: 'Bot1',
            songTitle: 'Tenant 1 Song',
            songUrl: 'https://example.com/1',
            duration: 100,
            playedAt: new Date(),
            installationId: 'inst-1',
        };
        const record2 = {
            userId: 'user2',
            guildId: 'guild2',
            channelId: 'channel2',
            botName: 'Bot2',
            songTitle: 'Tenant 2 Song',
            songUrl: 'https://example.com/2',
            duration: 200,
            playedAt: new Date(),
            installationId: 'inst-2',
        };
        const recordDefault = {
            userId: 'user3',
            guildId: 'guild3',
            channelId: 'channel3',
            botName: 'Bot3',
            songTitle: 'Self-Hosted Song',
            songUrl: 'https://example.com/3',
            duration: 300,
            playedAt: new Date(),
        };

        await adapter.trackPlay(record1);
        await adapter.trackPlay(record2);
        await adapter.trackPlay(recordDefault);

        // Scoped stats for inst-1
        const inst1Songs = await adapter.getTopSongs(10, 'inst-1');
        expect(inst1Songs).toHaveLength(1);
        expect(inst1Songs[0].songTitle).toBe('Tenant 1 Song');

        const inst1Stats = await adapter.getGlobalStats('inst-1');
        expect(inst1Stats.totalPlays).toBe(1);
        expect(inst1Stats.totalDuration).toBe(100);

        const inst1Channels = await adapter.getTopChannels(10, 'inst-1');
        expect(inst1Channels).toHaveLength(1);
        expect(inst1Channels[0].channelId).toBe('channel1');

        const inst1Bots = await adapter.getTopBots(10, 'inst-1');
        expect(inst1Bots).toHaveLength(1);
        expect(inst1Bots[0].botName).toBe('Bot1');

        // Scoped stats for inst-2
        const inst2Songs = await adapter.getTopSongs(10, 'inst-2');
        expect(inst2Songs).toHaveLength(1);
        expect(inst2Songs[0].songTitle).toBe('Tenant 2 Song');

        // Scoped stats for default (local:guild3)
        const defaultSongs = await adapter.getTopSongs(10, 'local:guild3');
        expect(defaultSongs).toHaveLength(1);
        expect(defaultSongs[0].songTitle).toBe('Self-Hosted Song');

        // Unscoped global stats returns all
        const allSongs = await adapter.getTopSongs(10);
        expect(allSongs).toHaveLength(3);
        const globalStats = await adapter.getGlobalStats();
        expect(globalStats.totalPlays).toBe(3);
        expect(globalStats.totalDuration).toBe(600);
    });

    it('should isolate plugin storage by installationId', async () => {
        await adapter.setPluginData('soundboard', 'theme', { mode: 'dark' }, 'inst-1');
        await adapter.setPluginData('soundboard', 'theme', { mode: 'light' }, 'inst-2');
        await adapter.setPluginData('soundboard', 'theme', { mode: 'system' });

        expect(await adapter.getPluginData('soundboard', 'theme', 'inst-1')).toEqual({
            mode: 'dark',
        });
        expect(await adapter.getPluginData('soundboard', 'theme', 'inst-2')).toEqual({
            mode: 'light',
        });
        expect(await adapter.getPluginData('soundboard', 'theme')).toEqual({ mode: 'system' });

        // Delete from inst-1
        await adapter.deletePluginData('soundboard', 'theme', 'inst-1');
        expect(await adapter.getPluginData('soundboard', 'theme', 'inst-1')).toBeNull();
        expect(await adapter.getPluginData('soundboard', 'theme', 'inst-2')).toEqual({
            mode: 'light',
        });
        expect(await adapter.getPluginData('soundboard', 'theme')).toEqual({ mode: 'system' });

        // Clear inst-2
        await adapter.clearPluginData('soundboard', 'inst-2');
        expect(await adapter.getPluginData('soundboard', 'theme', 'inst-2')).toBeNull();
        expect(await adapter.getPluginData('soundboard', 'theme')).toEqual({ mode: 'system' });
    });
});
