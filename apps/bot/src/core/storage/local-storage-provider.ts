import fs from 'node:fs';
import path from 'node:path';

import { LocalPluginAssetStore } from './local-plugin-asset-store.js';
import { LocalSharedMediaCache } from './local-shared-media-cache.js';
import { LocalTenantAssetStore } from './local-tenant-asset-store.js';
import { resolveSafePath, sanitizeIdentifier } from './path-security.js';
import {
    LocalStorageOptions,
    PluginAssetStore,
    SharedMediaCache,
    StorageProvider,
    TenantAssetStore,
} from './types.js';

export class LocalStorageProvider implements StorageProvider {
    readonly tenantAssets: TenantAssetStore;
    readonly pluginAssets: PluginAssetStore;
    readonly sharedCache: SharedMediaCache;
    private baseDir: string;

    constructor(options?: LocalStorageOptions) {
        this.baseDir = options?.baseDir ?? path.join(process.cwd(), 'data', 'storage');
        this.tenantAssets = new LocalTenantAssetStore(options);
        this.pluginAssets = new LocalPluginAssetStore(options);
        this.sharedCache = new LocalSharedMediaCache(options);
    }

    /**
     * Purges all tenant and plugin storage for an installation.
     * Useful when a guild uninstalls Jasper or is deleted.
     */
    async deleteInstallation(installationId: string): Promise<void> {
        const cleanInstallationId = sanitizeIdentifier(installationId, 'installationId');

        // 1. Delete tenant assets
        const tenantDir = resolveSafePath(path.join(this.baseDir, 'tenants'), cleanInstallationId);
        if (fs.existsSync(tenantDir)) {
            await fs.promises.rm(tenantDir, { recursive: true, force: true });
        }

        // 2. Delete plugin assets across all plugins for this installation
        const pluginsRoot = path.join(this.baseDir, 'plugins');
        if (fs.existsSync(pluginsRoot)) {
            const pluginDirs = await fs.promises.readdir(pluginsRoot, { withFileTypes: true });
            for (const pluginDir of pluginDirs) {
                if (pluginDir.isDirectory()) {
                    const pluginInstDir = path.join(
                        pluginsRoot,
                        pluginDir.name,
                        cleanInstallationId,
                    );
                    if (fs.existsSync(pluginInstDir)) {
                        await fs.promises.rm(pluginInstDir, { recursive: true, force: true });
                    }
                }
            }
        }
    }
}
