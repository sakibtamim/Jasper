import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
    SizeAndMimeValidatorStream,
    detectMimeType,
    validateMediaBuffer,
} from './mime-validation.js';
import { resolveSafePath, sanitizeIdentifier } from './path-security.js';
import { AssetPutOptions, LocalStorageOptions, SharedMediaCache, StoredAsset } from './types.js';

export class LocalSharedMediaCache implements SharedMediaCache {
    private baseDir: string;
    private maxFileSizeBytes: number;
    private allowedMimeTypes?: string[];

    constructor(options?: LocalStorageOptions) {
        this.baseDir = options?.baseDir ?? path.join(process.cwd(), 'data', 'storage');
        this.maxFileSizeBytes = options?.maxFileSizeBytes ?? 100 * 1024 * 1024;
        this.allowedMimeTypes = options?.allowedMimeTypes;
    }

    private get cacheRoot(): string {
        return path.join(this.baseDir, 'cache');
    }

    private getSafeCachePath(cacheKey: string): string {
        const cleanKey = sanitizeIdentifier(cacheKey, 'cacheKey');
        return resolveSafePath(this.cacheRoot, cleanKey);
    }

    async put(
        cacheKey: string,
        data: Buffer | Uint8Array | NodeJS.ReadableStream,
        options?: AssetPutOptions,
    ): Promise<StoredAsset> {
        const targetPath = this.getSafeCachePath(cacheKey);
        const parentDir = path.dirname(targetPath);

        if (!fs.existsSync(parentDir)) {
            await fs.promises.mkdir(parentDir, { recursive: true });
        }

        let mimeType = options?.mimeType || 'application/octet-stream';
        let fileSize = 0;

        if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            const validated = validateMediaBuffer(buf, {
                maxSizeBytes: this.maxFileSizeBytes,
                allowedMimeTypes: this.allowedMimeTypes,
                declaredMime: options?.mimeType,
            });
            mimeType = validated.mimeType;
            fileSize = validated.size;

            await fs.promises.writeFile(targetPath, buf);
        } else {
            const validator = new SizeAndMimeValidatorStream({
                maxSizeBytes: this.maxFileSizeBytes,
                allowedMimeTypes: this.allowedMimeTypes,
                declaredMime: options?.mimeType,
            });

            const writeStream = fs.createWriteStream(targetPath);

            try {
                await pipeline(data, validator, writeStream);
                fileSize = validator.bytesRead;
                mimeType = validator.validatedMimeType;
            } catch (err) {
                if (fs.existsSync(targetPath)) {
                    await fs.promises.unlink(targetPath).catch(() => {});
                }
                throw err;
            }
        }

        const cleanKey = sanitizeIdentifier(cacheKey, 'cacheKey');
        return {
            key: `cache://${cleanKey}`,
            size: fileSize,
            mimeType,
            updatedAt: new Date(),
            metadata: options?.metadata,
        };
    }

    async get(cacheKey: string): Promise<Buffer | null> {
        const targetPath = this.getSafeCachePath(cacheKey);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        return fs.promises.readFile(targetPath);
    }

    async getStream(cacheKey: string): Promise<NodeJS.ReadableStream | null> {
        const targetPath = this.getSafeCachePath(cacheKey);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        return fs.createReadStream(targetPath);
    }

    async delete(cacheKey: string): Promise<boolean> {
        const targetPath = this.getSafeCachePath(cacheKey);
        if (fs.existsSync(targetPath)) {
            await fs.promises.unlink(targetPath);
            return true;
        }
        return false;
    }

    async has(cacheKey: string): Promise<boolean> {
        const targetPath = this.getSafeCachePath(cacheKey);
        return fs.existsSync(targetPath);
    }

    async stat(cacheKey: string): Promise<StoredAsset | null> {
        const targetPath = this.getSafeCachePath(cacheKey);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        const stat = await fs.promises.stat(targetPath);
        const headBuffer = Buffer.alloc(32);
        const fd = await fs.promises.open(targetPath, 'r');
        await fd.read(headBuffer, 0, 32, 0);
        await fd.close();

        const cleanKey = sanitizeIdentifier(cacheKey, 'cacheKey');
        return {
            key: `cache://${cleanKey}`,
            size: stat.size,
            mimeType: detectMimeType(headBuffer) || 'application/octet-stream',
            updatedAt: stat.mtime,
        };
    }

    async prune(olderThan: Date): Promise<number> {
        if (!fs.existsSync(this.cacheRoot)) {
            return 0;
        }

        let prunedCount = 0;
        const entries = await fs.promises.readdir(this.cacheRoot, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                const filePath = path.join(this.cacheRoot, entry.name);
                const stat = await fs.promises.stat(filePath);
                if (stat.mtime < olderThan) {
                    await fs.promises.unlink(filePath);
                    prunedCount++;
                }
            }
        }

        return prunedCount;
    }
}
