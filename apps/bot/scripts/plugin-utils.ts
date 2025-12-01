import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../src/core/db/index.js';
import { isProduction } from '../src/config/env.js';
import { TEST_PLUGINS } from '../src/config/plugins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.join(__dirname, '..', 'src', 'plugins');

export interface PluginStatus {
    id: string;
    name: string;
    version: string;
    enabled: boolean;
    statusSource?: string;
}

/**
 * Get all plugin statuses by reading plugin metadata and resolving enabled status
 * from database or production defaults.
 * 
 * @returns Array of plugin status objects
 */
export async function getPluginStatuses(): Promise<PluginStatus[]> {
    const dbMeta = await db.getAllPluginMeta();
    const dbEnabledMap = new Map(dbMeta.map(m => [m.pluginId, m.enabled]));

    if (!fs.existsSync(PLUGINS_DIR)) {
        return [];
    }

    const entries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });
    const plugins: PluginStatus[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

        try {
            const metadataPath = path.join(PLUGINS_DIR, entry.name, 'jasper-plugin.json');
            if (!fs.existsSync(metadataPath)) continue;

            const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));

            let enabled = false;
            let statusSource = 'Default';

            if (dbEnabledMap.has(metadata.id)) {
                enabled = dbEnabledMap.get(metadata.id)!;
                statusSource = 'Database';
            } else {
                const isTestPlugin = TEST_PLUGINS.includes(metadata.id);
                if (isProduction && isTestPlugin) {
                    enabled = false;
                } else {
                    enabled = true;
                }
            }

            plugins.push({
                id: metadata.id,
                name: metadata.name,
                version: metadata.version,
                enabled,
                statusSource
            });
        } catch (e) {
            console.error(`Failed to process plugin metadata for ${entry.name}:`, e);
        }
    }

    return plugins;
}
