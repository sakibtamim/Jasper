import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../src/core/db/index.js';
import { isProduction } from '../src/config/env.js';
import logger from '../src/core/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.join(__dirname, '..', 'src', 'plugins');

// Test plugins to disable in production by default
const TEST_PLUGINS = [
    "advanced-hooks-test-plugin",
    "db-test-plugin",
    "dashboard-notes",
    "media-gallery"
];

async function listPlugins() {
    try {
        await db.init();
        const dbMeta = await db.getAllPluginMeta();
        const dbEnabledMap = new Map(dbMeta.map(m => [m.pluginId, m.enabled]));

        if (!fs.existsSync(PLUGINS_DIR)) {
            console.log('Plugins directory not found.');
            return;
        }

        const entries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });
        const plugins = [];

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
                // Ignore errors
            }
        }

        console.table(plugins);
    } catch (error) {
        console.error('Failed to list plugins:', error);
    } finally {
        await db.close();
    }
}

listPlugins();
