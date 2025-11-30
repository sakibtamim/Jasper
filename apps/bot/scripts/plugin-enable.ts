import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import db from '../src/core/db/index.js';
import { isProduction } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.join(__dirname, '..', 'src', 'plugins');

const TEST_PLUGINS = [
    "advanced-hooks-test-plugin",
    "db-test-plugin",
    "dashboard-notes",
    "media-gallery"
];

async function enablePlugin() {
    try {
        await db.init();
        const dbMeta = await db.getAllPluginMeta();
        const dbEnabledMap = new Map(dbMeta.map(m => [m.pluginId, m.enabled]));

        const entries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });
        const disabledPlugins = [];

        for (const entry of entries) {
            if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

            try {
                const metadataPath = path.join(PLUGINS_DIR, entry.name, 'jasper-plugin.json');
                if (!fs.existsSync(metadataPath)) continue;

                const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));

                let enabled = false;
                if (dbEnabledMap.has(metadata.id)) {
                    enabled = dbEnabledMap.get(metadata.id)!;
                } else {
                    const isTestPlugin = TEST_PLUGINS.includes(metadata.id);
                    if (isProduction && isTestPlugin) {
                        enabled = false;
                    } else {
                        enabled = true;
                    }
                }

                if (!enabled) {
                    disabledPlugins.push({
                        name: `${metadata.name} (${metadata.id})`,
                        value: metadata.id
                    });
                }
            } catch (e) {
                // Ignore
            }
        }

        if (disabledPlugins.length === 0) {
            console.log('No disabled plugins found.');
            return;
        }

        const { pluginId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'pluginId',
                message: 'Select a plugin to enable:',
                choices: disabledPlugins
            }
        ]);

        await db.setPluginEnabled(pluginId, true);
        console.log(`✅ Plugin '${pluginId}' enabled successfully.`);

    } catch (error) {
        console.error('Failed to enable plugin:', error);
    } finally {
        await db.close();
    }
}

enablePlugin();
