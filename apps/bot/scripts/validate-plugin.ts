import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, '../src/plugins');

const targetPlugin = process.argv[2];

async function validatePlugins() {
    if (!fs.existsSync(PLUGINS_DIR)) {
        console.error('❌ Plugins directory not found.');
        process.exit(1);
    }

    const plugins = targetPlugin ? [targetPlugin] : fs.readdirSync(PLUGINS_DIR);
    let hasErrors = false;

    console.log(`🔍 Validating ${plugins.length} plugin(s)...\n`);

    for (const pluginId of plugins) {
        const pluginDir = path.join(PLUGINS_DIR, pluginId);

        if (!fs.statSync(pluginDir).isDirectory()) continue;

        const errors: string[] = [];
        const manifestPath = path.join(pluginDir, 'jasper-plugin.json');

        // 1. Check Manifest Existence
        if (!fs.existsSync(manifestPath)) {
            errors.push('Missing jasper-plugin.json');
        } else {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

                // 2. Check Manifest Schema
                if (!manifest.id) errors.push('Manifest missing "id"');
                if (manifest.id !== pluginId) errors.push(`Manifest ID "${manifest.id}" does not match directory name "${pluginId}"`);
                if (!manifest.name) errors.push('Manifest missing "name"');
                if (!manifest.version) errors.push('Manifest missing "version"');

                // 3. Check Entry Files
                if (manifest.entry) {
                    const entryPath = path.join(pluginDir, manifest.entry);
                    if (!fs.existsSync(entryPath)) {
                        // Try .ts if .js is specified (dev mode compatibility)
                        if (manifest.entry.endsWith('.js')) {
                            const tsPath = entryPath.replace(/\.js$/, '.ts');
                            if (!fs.existsSync(tsPath)) {
                                errors.push(`Entry file "${manifest.entry}" (or .ts) not found`);
                            }
                        } else {
                            errors.push(`Entry file "${manifest.entry}" not found`);
                        }
                    }
                }

                // 4. Check Frontend Entry
                if (manifest.web && manifest.web.entry) {
                    const webEntryPath = path.join(pluginDir, manifest.web.entry);
                    if (!fs.existsSync(webEntryPath)) {
                        errors.push(`Web entry file "${manifest.web.entry}" not found`);
                    }
                }

            } catch (e) {
                errors.push('Invalid JSON in jasper-plugin.json');
            }
        }

        if (errors.length > 0) {
            hasErrors = true;
            console.log(`❌ ${pluginId}:`);
            errors.forEach(e => console.log(`   - ${e}`));
        } else {
            console.log(`✅ ${pluginId}`);
        }
    }

    if (hasErrors) {
        console.log('\n❌ Validation failed.');
        process.exit(1);
    } else {
        console.log('\n✨ All plugins valid.');
    }
}

validatePlugins().catch(console.error);
