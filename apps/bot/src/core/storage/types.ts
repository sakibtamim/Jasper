import type {
    AssetPutOptions,
    PluginAssetStore,
    SharedMediaCache,
    StorageProvider,
    StoredAsset,
    TenantAssetStore,
} from '@jasper/types';

export type {
    AssetPutOptions,
    PluginAssetStore,
    SharedMediaCache,
    StorageProvider,
    StoredAsset,
    TenantAssetStore,
};

export class StorageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StorageError';
    }
}

export class PathTraversalError extends StorageError {
    constructor(message: string = 'Access denied: path traversal attempt detected') {
        super(message);
        this.name = 'PathTraversalError';
    }
}

export class SsrfBlockedError extends StorageError {
    constructor(
        message: string = 'SSRF blocked: request to private, link-local, or restricted host is denied',
    ) {
        super(message);
        this.name = 'SsrfBlockedError';
    }
}

export class FileTooLargeError extends StorageError {
    constructor(maxBytes: number, actualBytes?: number) {
        super(
            actualBytes
                ? `File size (${actualBytes} bytes) exceeds maximum allowed limit (${maxBytes} bytes)`
                : `File exceeds maximum allowed limit (${maxBytes} bytes)`,
        );
        this.name = 'FileTooLargeError';
    }
}

export class InvalidMimeTypeError extends StorageError {
    constructor(detectedMime: string | null, allowedMimeTypes: string[]) {
        super(
            `Invalid media type "${detectedMime || 'unknown'}". Allowed MIME types: ${allowedMimeTypes.join(', ')}`,
        );
        this.name = 'InvalidMimeTypeError';
    }
}

export class AssetNotFoundError extends StorageError {
    constructor(key: string) {
        super(`Asset not found: ${key}`);
        this.name = 'AssetNotFoundError';
    }
}

export interface LocalStorageOptions {
    baseDir?: string;
    maxFileSizeBytes?: number;
    allowedMimeTypes?: string[];
}

export interface SafeFetchOptions {
    timeoutMs?: number;
    maxRedirects?: number;
    headers?: Record<string, string>;
    allowedPorts?: number[];
    dnsLookupFn?: (hostname: string) => Promise<string[]>;
}

export interface IngestRemoteMediaOptions {
    url: string;
    maxBytes?: number;
    allowedMimeTypes?: string[];
    timeoutMs?: number;
    maxRedirects?: number;
    dnsLookupFn?: (hostname: string) => Promise<string[]>;
}
