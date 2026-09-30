import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalPluginAssetStore } from '../local-plugin-asset-store.js';
import { LocalSharedMediaCache } from '../local-shared-media-cache.js';
import { LocalStorageProvider } from '../local-storage-provider.js';
import { LocalTenantAssetStore } from '../local-tenant-asset-store.js';
import { PathTraversalError } from '../types.js';

// Valid test media buffers
const SAMPLE_WAV = Buffer.from(
    'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00',
);
const SAMPLE_PNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const SAMPLE_MP3 = Buffer.from([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);
const SAMPLE_WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);

describe('Storage Providers & Stores', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'jasper-storage-test-'));
    });

    afterEach(async () => {
        if (fs.existsSync(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    });

    describe('LocalTenantAssetStore', () => {
        it('should put and get a buffer asset', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });

            const asset = await store.put('inst_123', 'audio/greeting.wav', SAMPLE_WAV, {
                metadata: { category: 'intro' },
            });

            expect(asset.key).toBe('tenant://inst_123/audio/greeting.wav');
            expect(asset.size).toBe(SAMPLE_WAV.length);
            expect(asset.mimeType).toBe('audio/wav');
            expect(asset.metadata).toEqual({ category: 'intro' });

            const retrieved = await store.get('inst_123', 'audio/greeting.wav');
            expect(retrieved).not.toBeNull();
            expect(retrieved!.equals(SAMPLE_WAV)).toBe(true);
        });

        it('should put and get a stream asset', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            const chunk1 = SAMPLE_MP3.subarray(0, 4);
            const chunk2 = SAMPLE_MP3.subarray(4);
            const stream = Readable.from([chunk1, chunk2]);

            const asset = await store.put('inst_123', 'streamed.mp3', stream);

            expect(asset.key).toBe('tenant://inst_123/streamed.mp3');
            expect(asset.size).toBe(SAMPLE_MP3.length);
            expect(asset.mimeType).toBe('audio/mpeg');

            const readStream = await store.getStream('inst_123', 'streamed.mp3');
            expect(readStream).not.toBeNull();

            const chunks: Buffer[] = [];
            for await (const chunk of readStream!) {
                chunks.push(Buffer.from(chunk));
            }
            expect(Buffer.concat(chunks).equals(SAMPLE_MP3)).toBe(true);
        });

        it('should return null for non-existent files', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            const result = await store.get('inst_123', 'missing.wav');
            expect(result).toBeNull();

            const streamResult = await store.getStream('inst_123', 'missing.wav');
            expect(streamResult).toBeNull();

            const statResult = await store.stat('inst_123', 'missing.wav');
            expect(statResult).toBeNull();
        });

        it('should stat existing asset accurately', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            await store.put('inst_456', 'sub/test.png', SAMPLE_PNG);

            const stat = await store.stat('inst_456', 'sub/test.png');
            expect(stat).not.toBeNull();
            expect(stat!.key).toBe('tenant://inst_456/sub/test.png');
            expect(stat!.size).toBe(SAMPLE_PNG.length);
            expect(stat!.mimeType).toBe('image/png');
        });

        it('should delete asset and return correct boolean', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            await store.put('inst_123', 'temp.wav', SAMPLE_WAV);

            const deletedFirst = await store.delete('inst_123', 'temp.wav');
            expect(deletedFirst).toBe(true);

            const deletedSecond = await store.delete('inst_123', 'temp.wav');
            expect(deletedSecond).toBe(false);

            const retrieved = await store.get('inst_123', 'temp.wav');
            expect(retrieved).toBeNull();
        });

        it('should list assets and support prefix filtering', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            await store.put('inst_list', 'sound/a.wav', SAMPLE_WAV);
            await store.put('inst_list', 'sound/b.mp3', SAMPLE_MP3);
            await store.put('inst_list', 'images/c.png', SAMPLE_PNG);

            const all = await store.list('inst_list');
            expect(all).toHaveLength(3);

            const sounds = await store.list('inst_list', 'sound');
            expect(sounds).toHaveLength(2);
            expect(sounds.map((s) => s.key).sort()).toEqual([
                'tenant://inst_list/sound/a.wav',
                'tenant://inst_list/sound/b.mp3',
            ]);
        });

        it('should enforce tenant isolation', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            await store.put('inst_alpha', 'secret.wav', SAMPLE_WAV);

            const betaGet = await store.get('inst_beta', 'secret.wav');
            expect(betaGet).toBeNull();

            const betaList = await store.list('inst_beta');
            expect(betaList).toEqual([]);
        });

        it('should resolve URI and fsPath', () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            const resolved = store.resolve('inst_123', 'custom/track.mp3');
            expect(resolved.uri).toBe('tenant://inst_123/custom/track.mp3');
            expect(resolved.fsPath).toBe(
                path.join(tempDir, 'tenants', 'inst_123', 'custom', 'track.mp3'),
            );
        });

        it('should reject path traversal in installationId or relative path', async () => {
            const store = new LocalTenantAssetStore({ baseDir: tempDir });
            await expect(store.put('../inst_evil', 'file.wav', SAMPLE_WAV)).rejects.toThrow(
                PathTraversalError,
            );

            await expect(store.put('inst_good', '../../etc/passwd', SAMPLE_WAV)).rejects.toThrow(
                PathTraversalError,
            );
        });
    });

    describe('LocalPluginAssetStore', () => {
        it('should scope assets by pluginId and installationId', async () => {
            const store = new LocalPluginAssetStore({ baseDir: tempDir });

            const asset = await store.put('soundboard', 'inst_1', 'airhorn.wav', SAMPLE_WAV);
            expect(asset.key).toBe('plugin://soundboard/inst_1/airhorn.wav');

            const fetched = await store.get('soundboard', 'inst_1', 'airhorn.wav');
            expect(fetched).not.toBeNull();
            expect(fetched!.equals(SAMPLE_WAV)).toBe(true);

            // Cannot be fetched by another plugin for same installation
            const otherPlugin = await store.get('radio', 'inst_1', 'airhorn.wav');
            expect(otherPlugin).toBeNull();

            // Cannot be fetched by another installation for same plugin
            const otherInst = await store.get('soundboard', 'inst_2', 'airhorn.wav');
            expect(otherInst).toBeNull();
        });

        it('should list assets per plugin and installation', async () => {
            const store = new LocalPluginAssetStore({ baseDir: tempDir });
            await store.put('soundboard', 'inst_1', 'tracks/1.mp3', SAMPLE_MP3);
            await store.put('soundboard', 'inst_1', 'tracks/2.mp3', SAMPLE_MP3);
            await store.put('soundboard', 'inst_2', 'tracks/3.mp3', SAMPLE_MP3);

            const inst1Tracks = await store.list('soundboard', 'inst_1', 'tracks');
            expect(inst1Tracks).toHaveLength(2);

            const inst2Tracks = await store.list('soundboard', 'inst_2');
            expect(inst2Tracks).toHaveLength(1);
        });

        it('should delete plugin assets correctly', async () => {
            const store = new LocalPluginAssetStore({ baseDir: tempDir });
            await store.put('soundboard', 'inst_1', 'test.wav', SAMPLE_WAV);

            const deleted = await store.delete('soundboard', 'inst_1', 'test.wav');
            expect(deleted).toBe(true);

            const nonExistent = await store.delete('soundboard', 'inst_1', 'test.wav');
            expect(nonExistent).toBe(false);
        });
    });

    describe('LocalSharedMediaCache', () => {
        it('should store and retrieve cached media', async () => {
            const cache = new LocalSharedMediaCache({ baseDir: tempDir });

            const asset = await cache.put('yt_track_abc123', SAMPLE_WEBM);
            expect(asset.key).toBe('cache://yt_track_abc123');

            expect(await cache.has('yt_track_abc123')).toBe(true);
            expect(await cache.has('yt_track_missing')).toBe(false);

            const retrieved = await cache.get('yt_track_abc123');
            expect(retrieved).not.toBeNull();
            expect(retrieved!.equals(SAMPLE_WEBM)).toBe(true);
        });

        it('should prune cached files older than specified date', async () => {
            const cache = new LocalSharedMediaCache({ baseDir: tempDir });
            await cache.put('file_old', SAMPLE_WAV);
            await cache.put('file_new', SAMPLE_MP3);

            const oldFilePath = path.join(tempDir, 'cache', 'file_old');
            // Backdate old file by 2 days
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            await fs.promises.utimes(oldFilePath, twoDaysAgo, twoDaysAgo);

            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const prunedCount = await cache.prune(oneDayAgo);

            expect(prunedCount).toBe(1);
            expect(await cache.has('file_old')).toBe(false);
            expect(await cache.has('file_new')).toBe(true);
        });
    });

    describe('LocalStorageProvider', () => {
        it('should initialize all stores and purge installation data upon deleteInstallation', async () => {
            const provider = new LocalStorageProvider({ baseDir: tempDir });

            // Seed tenant data for inst_A and inst_B
            await provider.tenantAssets.put('inst_A', 'profile.png', SAMPLE_PNG);
            await provider.tenantAssets.put('inst_B', 'profile.png', SAMPLE_PNG);

            // Seed plugin data for inst_A and inst_B
            await provider.pluginAssets.put('soundboard', 'inst_A', 'effect.wav', SAMPLE_WAV);
            await provider.pluginAssets.put('soundboard', 'inst_B', 'effect.wav', SAMPLE_WAV);

            // Seed shared cache
            await provider.sharedCache.put('shared_asset_1', SAMPLE_WEBM);

            // Purge inst_A
            await provider.deleteInstallation('inst_A');

            // inst_A should be deleted across tenant and plugin stores
            expect(await provider.tenantAssets.get('inst_A', 'profile.png')).toBeNull();
            expect(
                await provider.pluginAssets.get('soundboard', 'inst_A', 'effect.wav'),
            ).toBeNull();

            // inst_B must remain untouched
            expect(await provider.tenantAssets.get('inst_B', 'profile.png')).not.toBeNull();
            expect(
                await provider.pluginAssets.get('soundboard', 'inst_B', 'effect.wav'),
            ).not.toBeNull();

            // shared cache must remain untouched
            expect(await provider.sharedCache.has('shared_asset_1')).toBe(true);
        });
    });
});
