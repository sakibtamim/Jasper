import { Readable } from 'node:stream';

import logger from '../logger.js';
import {
    OperationalSafetyError,
    getOperationalSafetyManager,
} from '../safety/operational-safety.js';
import { safeFetch } from './ssrf.js';
import {
    IngestRemoteMediaOptions,
    PluginAssetStore,
    SharedMediaCache,
    StoredAsset,
    TenantAssetStore,
} from './types.js';

export interface IngestDestination {
    type: 'tenant' | 'plugin' | 'cache';
    tenant?: {
        store: TenantAssetStore;
        installationId: string;
        path: string;
    };
    plugin?: {
        store: PluginAssetStore;
        pluginId: string;
        installationId: string;
        path: string;
    };
    cache?: {
        store: SharedMediaCache;
        cacheKey: string;
    };
}

/**
 * Safely ingests media from a remote URL into a destination storage store.
 * Blocks SSRF, enforces redirect verification, streams bytes, and validates size & MIME.
 */
export async function ingestRemoteMedia(
    options: IngestRemoteMediaOptions,
    destination: IngestDestination,
): Promise<StoredAsset> {
    logger.info(`[storage:ingest] Starting safe remote ingestion from ${options.url}`);

    const response = await safeFetch(options.url, {
        timeoutMs: options.timeoutMs,
        maxRedirects: options.maxRedirects,
        dnsLookupFn: options.dnsLookupFn,
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch remote media: HTTP ${response.status} ${response.statusText}`,
        );
    }

    if (!response.body) {
        throw new Error('Remote media response contained no body');
    }

    const declaredMime = response.headers.get('content-type')?.split(';')[0]?.trim();
    // Convert Web ReadableStream to Node.js Readable
    const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);

    const contentLength = Number(response.headers.get('content-length') || 0);
    const installationId =
        destination.tenant?.installationId || destination.plugin?.installationId || 'global';
    if (contentLength > 0 && installationId) {
        const bandwidthCheck = getOperationalSafetyManager().checkAndRecordBandwidth(
            installationId,
            contentLength,
            'download',
        );
        if (!bandwidthCheck.allowed) {
            throw new OperationalSafetyError(bandwidthCheck);
        }
    }

    let asset: StoredAsset;
    if (destination.type === 'tenant') {
        if (!destination.tenant) {
            throw new Error('Tenant destination configuration is required');
        }
        asset = await destination.tenant.store.put(
            destination.tenant.installationId,
            destination.tenant.path,
            nodeStream,
            { mimeType: declaredMime },
        );
    } else if (destination.type === 'plugin') {
        if (!destination.plugin) {
            throw new Error('Plugin destination configuration is required');
        }
        asset = await destination.plugin.store.put(
            destination.plugin.pluginId,
            destination.plugin.installationId,
            destination.plugin.path,
            nodeStream,
            { mimeType: declaredMime },
        );
    } else if (destination.type === 'cache') {
        if (!destination.cache) {
            throw new Error('Cache destination configuration is required');
        }
        asset = await destination.cache.store.put(destination.cache.cacheKey, nodeStream, {
            mimeType: declaredMime,
        });
    } else {
        throw new Error(`Unsupported destination type: ${(destination as { type: string }).type}`);
    }

    // If Content-Length header was missing or zero, record bandwidth based on stored asset size
    if (contentLength <= 0 && asset.size > 0 && installationId) {
        const postCheck = getOperationalSafetyManager().checkAndRecordBandwidth(
            installationId,
            asset.size,
            'download',
        );
        if (!postCheck.allowed) {
            throw new OperationalSafetyError(postCheck);
        }
    }

    return asset;
}
