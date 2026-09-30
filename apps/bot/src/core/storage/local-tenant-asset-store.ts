import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
    SizeAndMimeValidatorStream,
    detectMimeType,
    validateMediaBuffer,
} from './mime-validation.js';
import { resolveSafePath, sanitizeIdentifier, sanitizeRelativePath } from './path-security.js';
import { AssetPutOptions, LocalStorageOptions, StoredAsset, TenantAssetStore } from './types.js';

export class LocalTenantAssetStore implements TenantAssetStore {
    private baseDir: string;
    private maxFileSizeBytes: number;
    private allowedMimeTypes?: string[];

    constructor(options?: LocalStorageOptions) {
        this.baseDir = options?.baseDir ?? path.join(process.cwd(), 'data', 'storage');
        this.maxFileSizeBytes = options?.maxFileSizeBytes ?? 50 * 1024 * 1024;
        this.allowedMimeTypes = options?.allowedMimeTypes;
    }

    private get tenantsRoot(): string {
        return path.join(this.baseDir, 'tenants');
    }

    private getSafeFilePath(installationId: string, relPath: string): string {
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const cleanRelPath = sanitizeRelativePath(relPath);
        return resolveSafePath(this.tenantsRoot, cleanInstallationId, cleanRelPath);
    }

    async put(
        installationId: string,
        itemPath: string,
        data: Buffer | Uint8Array | NodeJS.ReadableStream,
        options?: AssetPutOptions,
    ): Promise<StoredAsset> {
        const targetPath = this.getSafeFilePath(installationId, itemPath);
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
            // Stream ingestion with real-time size & MIME verification
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
                // Cleanup incomplete file on failure
                if (fs.existsSync(targetPath)) {
                    await fs.promises.unlink(targetPath).catch(() => {});
                }
                throw err;
            }
        }

        const cleanRelPath = sanitizeRelativePath(itemPath);
        const asset: StoredAsset = {
            key: `tenant://${sanitizeIdentifier(installationId, 'installationId')}/${cleanRelPath}`,
            size: fileSize,
            mimeType,
            updatedAt: new Date(),
            metadata: options?.metadata,
        };

        return asset;
    }

    async get(installationId: string, itemPath: string): Promise<Buffer | null> {
        const targetPath = this.getSafeFilePath(installationId, itemPath);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        return fs.promises.readFile(targetPath);
    }

    async getStream(
        installationId: string,
        itemPath: string,
    ): Promise<NodeJS.ReadableStream | null> {
        const targetPath = this.getSafeFilePath(installationId, itemPath);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        return fs.createReadStream(targetPath);
    }

    async delete(installationId: string, itemPath: string): Promise<boolean> {
        const targetPath = this.getSafeFilePath(installationId, itemPath);
        if (fs.existsSync(targetPath)) {
            await fs.promises.unlink(targetPath);
            return true;
        }
        return false;
    }

    async list(installationId: string, prefix?: string): Promise<StoredAsset[]> {
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const installationRoot = resolveSafePath(this.tenantsRoot, cleanInstallationId);

        if (!fs.existsSync(installationRoot)) {
            return [];
        }

        const assets: StoredAsset[] = [];

        const walk = async (currentDir: string, currentPrefix: string) => {
            const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullEntryPath = path.join(currentDir, entry.name);
                const relItemPath = currentPrefix ? `${currentPrefix}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    await walk(fullEntryPath, relItemPath);
                } else if (entry.isFile()) {
                    if (prefix && !relItemPath.startsWith(prefix)) {
                        continue;
                    }
                    const stat = await fs.promises.stat(fullEntryPath);
                    const headBuffer = Buffer.alloc(32);
                    const fd = await fs.promises.open(fullEntryPath, 'r');
                    await fd.read(headBuffer, 0, 32, 0);
                    await fd.close();

                    const detectedMime = detectMimeType(headBuffer) || 'application/octet-stream';

                    assets.push({
                        key: `tenant://${cleanInstallationId}/${relItemPath}`,
                        size: stat.size,
                        mimeType: detectedMime,
                        updatedAt: stat.mtime,
                    });
                }
            }
        };

        await walk(installationRoot, '');
        return assets;
    }

    async stat(installationId: string, itemPath: string): Promise<StoredAsset | null> {
        const targetPath = this.getSafeFilePath(installationId, itemPath);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        const stat = await fs.promises.stat(targetPath);
        const headBuffer = Buffer.alloc(32);
        const fd = await fs.promises.open(targetPath, 'r');
        await fd.read(headBuffer, 0, 32, 0);
        await fd.close();

        const cleanRelPath = sanitizeRelativePath(itemPath);
        return {
            key: `tenant://${sanitizeIdentifier(installationId, 'installationId')}/${cleanRelPath}`,
            size: stat.size,
            mimeType: detectMimeType(headBuffer) || 'application/octet-stream',
            updatedAt: stat.mtime,
        };
    }

    resolve(installationId: string, itemPath: string): { fsPath?: string; uri: string } {
        const targetPath = this.getSafeFilePath(installationId, itemPath);
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const cleanRelPath = sanitizeRelativePath(itemPath);

        return {
            fsPath: targetPath,
            uri: `tenant://${cleanInstallationId}/${cleanRelPath}`,
        };
    }
}
