import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
    SizeAndMimeValidatorStream,
    detectMimeType,
    validateMediaBuffer,
} from './mime-validation.js';
import { resolveSafePath, sanitizeIdentifier, sanitizeRelativePath } from './path-security.js';
import { AssetPutOptions, LocalStorageOptions, PluginAssetStore, StoredAsset } from './types.js';

export class LocalPluginAssetStore implements PluginAssetStore {
    private baseDir: string;
    private maxFileSizeBytes: number;
    private allowedMimeTypes?: string[];

    constructor(options?: LocalStorageOptions) {
        this.baseDir = options?.baseDir ?? path.join(process.cwd(), 'data', 'storage');
        this.maxFileSizeBytes = options?.maxFileSizeBytes ?? 50 * 1024 * 1024;
        this.allowedMimeTypes = options?.allowedMimeTypes;
    }

    private get pluginsRoot(): string {
        return path.join(this.baseDir, 'plugins');
    }

    private getSafeFilePath(pluginId: string, installationId: string, relPath: string): string {
        const cleanPluginId = sanitizeIdentifier(pluginId, 'pluginId');
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const cleanRelPath = sanitizeRelativePath(relPath);
        return resolveSafePath(this.pluginsRoot, cleanPluginId, cleanInstallationId, cleanRelPath);
    }

    async put(
        pluginId: string,
        installationId: string,
        itemPath: string,
        data: Buffer | Uint8Array | NodeJS.ReadableStream,
        options?: AssetPutOptions,
    ): Promise<StoredAsset> {
        const targetPath = this.getSafeFilePath(pluginId, installationId, itemPath);
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

        const cleanPluginId = sanitizeIdentifier(pluginId, 'pluginId');
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const cleanRelPath = sanitizeRelativePath(itemPath);

        const asset: StoredAsset = {
            key: `plugin://${cleanPluginId}/${cleanInstallationId}/${cleanRelPath}`,
            size: fileSize,
            mimeType,
            updatedAt: new Date(),
            metadata: options?.metadata,
        };

        return asset;
    }

    async get(pluginId: string, installationId: string, itemPath: string): Promise<Buffer | null> {
        const targetPath = this.getSafeFilePath(pluginId, installationId, itemPath);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        return fs.promises.readFile(targetPath);
    }

    async getStream(
        pluginId: string,
        installationId: string,
        itemPath: string,
    ): Promise<NodeJS.ReadableStream | null> {
        const targetPath = this.getSafeFilePath(pluginId, installationId, itemPath);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        return fs.createReadStream(targetPath);
    }

    async delete(pluginId: string, installationId: string, itemPath: string): Promise<boolean> {
        const targetPath = this.getSafeFilePath(pluginId, installationId, itemPath);
        if (fs.existsSync(targetPath)) {
            await fs.promises.unlink(targetPath);
            return true;
        }
        return false;
    }

    async list(pluginId: string, installationId: string, prefix?: string): Promise<StoredAsset[]> {
        const cleanPluginId = sanitizeIdentifier(pluginId, 'pluginId');
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const root = resolveSafePath(this.pluginsRoot, cleanPluginId, cleanInstallationId);

        if (!fs.existsSync(root)) {
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

                    assets.push({
                        key: `plugin://${cleanPluginId}/${cleanInstallationId}/${relItemPath}`,
                        size: stat.size,
                        mimeType: detectMimeType(headBuffer) || 'application/octet-stream',
                        updatedAt: stat.mtime,
                    });
                }
            }
        };

        await walk(root, '');
        return assets;
    }

    async stat(
        pluginId: string,
        installationId: string,
        itemPath: string,
    ): Promise<StoredAsset | null> {
        const targetPath = this.getSafeFilePath(pluginId, installationId, itemPath);
        if (!fs.existsSync(targetPath)) {
            return null;
        }
        const stat = await fs.promises.stat(targetPath);
        const headBuffer = Buffer.alloc(32);
        const fd = await fs.promises.open(targetPath, 'r');
        await fd.read(headBuffer, 0, 32, 0);
        await fd.close();

        const cleanPluginId = sanitizeIdentifier(pluginId, 'pluginId');
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const cleanRelPath = sanitizeRelativePath(itemPath);

        return {
            key: `plugin://${cleanPluginId}/${cleanInstallationId}/${cleanRelPath}`,
            size: stat.size,
            mimeType: detectMimeType(headBuffer) || 'application/octet-stream',
            updatedAt: stat.mtime,
        };
    }

    resolve(
        pluginId: string,
        installationId: string,
        itemPath: string,
    ): { fsPath?: string; uri: string } {
        const targetPath = this.getSafeFilePath(pluginId, installationId, itemPath);
        const cleanPluginId = sanitizeIdentifier(pluginId, 'pluginId');
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');
        const cleanRelPath = sanitizeRelativePath(itemPath);

        return {
            fsPath: targetPath,
            uri: `plugin://${cleanPluginId}/${cleanInstallationId}/${cleanRelPath}`,
        };
    }
}
