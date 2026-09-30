import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    DefaultOperationalSafetyManager,
    OperationalSafetyError,
    setOperationalSafetyManager,
} from '../../safety/operational-safety.js';
import { LocalPluginAssetStore } from '../local-plugin-asset-store.js';
import { LocalSharedMediaCache } from '../local-shared-media-cache.js';
import { LocalTenantAssetStore } from '../local-tenant-asset-store.js';
import { ingestRemoteMedia } from '../safe-media-ingestion.js';
import { FileTooLargeError, InvalidMimeTypeError, SsrfBlockedError } from '../types.js';

const SAMPLE_WAV = Buffer.from(
    'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00',
);
const SAMPLE_PNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const SAMPLE_WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);

describe('Safe Media Ingestion', () => {
    let tempDir: string;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'jasper-ingest-test-'));
        fetchSpy = vi.spyOn(globalThis, 'fetch');
    });

    afterEach(async () => {
        fetchSpy.mockRestore();
        if (fs.existsSync(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    });

    it('should safely ingest remote audio into tenant asset store', async () => {
        const tenantStore = new LocalTenantAssetStore({ baseDir: tempDir });

        fetchSpy.mockResolvedValueOnce(
            new Response(SAMPLE_WAV, {
                status: 200,
                headers: { 'content-type': 'audio/wav' },
            }),
        );

        const asset = await ingestRemoteMedia(
            {
                url: 'https://cdn.example.com/sound.wav',
                dnsLookupFn: async () => ['93.184.216.34'],
            },
            {
                type: 'tenant',
                tenant: {
                    store: tenantStore,
                    installationId: 'inst_1',
                    path: 'sounds/sound.wav',
                },
            },
        );

        expect(asset.key).toBe('tenant://inst_1/sounds/sound.wav');
        expect(asset.size).toBe(SAMPLE_WAV.length);
        expect(asset.mimeType).toBe('audio/wav');

        const saved = await tenantStore.get('inst_1', 'sounds/sound.wav');
        expect(saved).not.toBeNull();
        expect(saved!.equals(SAMPLE_WAV)).toBe(true);
    });

    it('should safely ingest remote image into plugin asset store', async () => {
        const pluginStore = new LocalPluginAssetStore({ baseDir: tempDir });

        fetchSpy.mockResolvedValueOnce(
            new Response(SAMPLE_PNG, {
                status: 200,
                headers: { 'content-type': 'image/png' },
            }),
        );

        const asset = await ingestRemoteMedia(
            {
                url: 'https://cdn.example.com/logo.png',
                dnsLookupFn: async () => ['93.184.216.34'],
            },
            {
                type: 'plugin',
                plugin: {
                    store: pluginStore,
                    pluginId: 'soundboard',
                    installationId: 'inst_1',
                    path: 'icons/logo.png',
                },
            },
        );

        expect(asset.key).toBe('plugin://soundboard/inst_1/icons/logo.png');
        expect(asset.mimeType).toBe('image/png');

        const saved = await pluginStore.get('soundboard', 'inst_1', 'icons/logo.png');
        expect(saved).not.toBeNull();
        expect(saved!.equals(SAMPLE_PNG)).toBe(true);
    });

    it('should safely ingest remote media into shared cache', async () => {
        const cacheStore = new LocalSharedMediaCache({ baseDir: tempDir });

        fetchSpy.mockResolvedValueOnce(
            new Response(SAMPLE_WEBM, {
                status: 200,
                headers: { 'content-type': 'audio/webm' },
            }),
        );

        const asset = await ingestRemoteMedia(
            {
                url: 'https://cdn.example.com/stream.webm',
                dnsLookupFn: async () => ['93.184.216.34'],
            },
            {
                type: 'cache',
                cache: {
                    store: cacheStore,
                    cacheKey: 'yt_stream_webm_001',
                },
            },
        );

        expect(asset.key).toBe('cache://yt_stream_webm_001');
        expect(asset.mimeType).toBe('audio/webm');

        const saved = await cacheStore.get('yt_stream_webm_001');
        expect(saved).not.toBeNull();
        expect(saved!.equals(SAMPLE_WEBM)).toBe(true);
    });

    it('should block SSRF attempts to loopback or metadata IPs', async () => {
        const tenantStore = new LocalTenantAssetStore({ baseDir: tempDir });

        await expect(
            ingestRemoteMedia(
                { url: 'http://127.0.0.1/secret.wav' },
                {
                    type: 'tenant',
                    tenant: {
                        store: tenantStore,
                        installationId: 'inst_1',
                        path: 'audio.wav',
                    },
                },
            ),
        ).rejects.toThrow(SsrfBlockedError);

        await expect(
            ingestRemoteMedia(
                { url: 'http://169.254.169.254/latest/meta-data' },
                {
                    type: 'tenant',
                    tenant: {
                        store: tenantStore,
                        installationId: 'inst_1',
                        path: 'audio.wav',
                    },
                },
            ),
        ).rejects.toThrow(SsrfBlockedError);

        // Fetch should never have been invoked
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should reject stream when size exceeds maxFileSizeBytes and clean up partial file', async () => {
        const smallLimitStore = new LocalTenantAssetStore({
            baseDir: tempDir,
            maxFileSizeBytes: 10, // 10 byte limit
        });

        // SAMPLE_WAV is > 10 bytes
        fetchSpy.mockResolvedValueOnce(
            new Response(SAMPLE_WAV, {
                status: 200,
                headers: { 'content-type': 'audio/wav' },
            }),
        );

        await expect(
            ingestRemoteMedia(
                {
                    url: 'https://cdn.example.com/toolarge.wav',
                    dnsLookupFn: async () => ['93.184.216.34'],
                },
                {
                    type: 'tenant',
                    tenant: {
                        store: smallLimitStore,
                        installationId: 'inst_1',
                        path: 'large.wav',
                    },
                },
            ),
        ).rejects.toThrow(FileTooLargeError);

        // Verify partial file was cleaned up
        const partial = await smallLimitStore.get('inst_1', 'large.wav');
        expect(partial).toBeNull();
    });

    it('should reject disallowed MIME type during remote ingestion', async () => {
        const tenantStore = new LocalTenantAssetStore({ baseDir: tempDir });

        const htmlContent = Buffer.from('<html><body>malicious payload</body></html>');
        fetchSpy.mockResolvedValueOnce(
            new Response(htmlContent, {
                status: 200,
                headers: { 'content-type': 'text/html' },
            }),
        );

        await expect(
            ingestRemoteMedia(
                {
                    url: 'https://cdn.example.com/exploit.html',
                    dnsLookupFn: async () => ['93.184.216.34'],
                },
                {
                    type: 'tenant',
                    tenant: {
                        store: tenantStore,
                        installationId: 'inst_1',
                        path: 'exploit.html',
                    },
                },
            ),
        ).rejects.toThrow(InvalidMimeTypeError);
    });

    it('should reject non-200 responses', async () => {
        const tenantStore = new LocalTenantAssetStore({ baseDir: tempDir });

        fetchSpy.mockResolvedValueOnce(
            new Response('Not Found', {
                status: 404,
                statusText: 'Not Found',
            }),
        );

        await expect(
            ingestRemoteMedia(
                {
                    url: 'https://cdn.example.com/missing.wav',
                    dnsLookupFn: async () => ['93.184.216.34'],
                },
                {
                    type: 'tenant',
                    tenant: {
                        store: tenantStore,
                        installationId: 'inst_1',
                        path: 'missing.wav',
                    },
                },
            ),
        ).rejects.toThrow(/HTTP 404/);
    });

    it('should reject ingestion when download bandwidth quota is exceeded', async () => {
        const tenantStore = new LocalTenantAssetStore({ baseDir: tempDir });
        const smallSafetyManager = new DefaultOperationalSafetyManager({
            installationLimits: {
                maxDownloadBytesPerMinute: 50,
            },
        });
        setOperationalSafetyManager(smallSafetyManager);

        fetchSpy.mockResolvedValueOnce(
            new Response(SAMPLE_WAV, {
                status: 200,
                headers: {
                    'content-type': 'audio/wav',
                    'content-length': String(SAMPLE_WAV.length),
                },
            }),
        );

        // First download under limit
        const asset = await ingestRemoteMedia(
            {
                url: 'https://cdn.example.com/sound1.wav',
                dnsLookupFn: async () => ['93.184.216.34'],
            },
            {
                type: 'tenant',
                tenant: {
                    store: tenantStore,
                    installationId: 'inst_bandwidth',
                    path: 'sounds/sound1.wav',
                },
            },
        );
        expect(asset).toBeDefined();

        // Second download exceeds quota
        fetchSpy.mockResolvedValueOnce(
            new Response(SAMPLE_WAV, {
                status: 200,
                headers: {
                    'content-type': 'audio/wav',
                    'content-length': String(SAMPLE_WAV.length),
                },
            }),
        );

        await expect(
            ingestRemoteMedia(
                {
                    url: 'https://cdn.example.com/sound2.wav',
                    dnsLookupFn: async () => ['93.184.216.34'],
                },
                {
                    type: 'tenant',
                    tenant: {
                        store: tenantStore,
                        installationId: 'inst_bandwidth',
                        path: 'sounds/sound2.wav',
                    },
                },
            ),
        ).rejects.toThrow(OperationalSafetyError);

        // Reset default safety manager
        setOperationalSafetyManager(new DefaultOperationalSafetyManager());
    });
});
