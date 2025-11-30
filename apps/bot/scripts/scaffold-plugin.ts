import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, '../src/plugins');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer.trim());
        });
    });
};

async function main() {
    console.log('🚀 Jasper Plugin Scaffolder\n');

    // 1. Get Plugin ID
    let id = '';
    while (!id) {
        id = await question('Plugin ID (kebab-case, e.g. my-cool-plugin): ');
        if (!/^[a-z0-9-]+$/.test(id)) {
            console.log('❌ Invalid ID. Use lowercase letters, numbers, and dashes only.');
            id = '';
        } else if (fs.existsSync(path.join(PLUGINS_DIR, id))) {
            console.log('❌ Plugin with this ID already exists.');
            id = '';
        }
    }

    // 2. Get Metadata
    const name = await question('Plugin Name (e.g. My Cool Plugin): ') || id;
    const description = await question('Description: ') || 'A Jasper plugin';
    const author = await question('Author: ') || '';

    // 3. Features
    console.log('\nSelect features (y/n):');
    const hasBackend = (await question('Include Backend (index.ts)? [Y/n]: ')).toLowerCase() !== 'n';
    const hasFrontend = (await question('Include Frontend (web/index.tsx)? [Y/n]: ')).toLowerCase() !== 'n';

    if (!hasBackend && !hasFrontend) {
        console.log('❌ You must select at least one feature.');
        process.exit(1);
    }

    const pluginDir = path.join(PLUGINS_DIR, id);
    fs.mkdirSync(pluginDir, { recursive: true });

    // 4. Create Manifest
    const manifest: any = {
        id,
        name,
        version: '1.0.0',
        description,
        author,
        jasperVersion: '^1.0.0'
    };

    if (hasBackend) {
        manifest.entry = 'index.ts';
    }

    if (hasFrontend) {
        manifest.web = {
            entry: 'web/index.tsx',
            navItems: [
                {
                    id: `${id}-nav`,
                    label: name,
                    icon: 'package',
                    href: `/plugins/${id}`
                }
            ],
            pages: [
                {
                    id: `${id}-page`,
                    path: `/plugins/${id}`,
                    component: 'PluginPage'
                }
            ]
        };
    }

    fs.writeFileSync(path.join(pluginDir, 'jasper-plugin.json'), JSON.stringify(manifest, null, 4));

    // 5. Create Backend Entry
    if (hasBackend) {
        const backendContent = `import { Plugin, PluginContext } from "../../core/plugins/plugin-interface.js";

const ${toPascalCase(id)}Plugin: Plugin = {
    name: "${name}",
    version: "1.0.0",

    onLoad: async (context: PluginContext) => {
        context.logger.info("${name} loaded!");
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("${name} unloaded!");
    }
};

export default ${toPascalCase(id)}Plugin;
`;
        fs.writeFileSync(path.join(pluginDir, 'index.ts'), backendContent);
    }

    // 6. Create Frontend Entry
    if (hasFrontend) {
        const webDir = path.join(pluginDir, 'web');
        fs.mkdirSync(webDir);

        const frontendContent = `import React from 'react';
import { Card } from '@jasper/ui';

export const PluginPage = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">${name}</h1>
            <Card>
                <p>Welcome to ${name}!</p>
            </Card>
        </div>
    );
};
`;
        fs.writeFileSync(path.join(webDir, 'index.tsx'), frontendContent);
    }

    console.log(`\n✅ Plugin created at apps/bot/src/plugins/${id}`);
    rl.close();
}

function toPascalCase(str: string) {
    return str.replace(/(^\w|-\w)/g, clearAndUpper);
}

function clearAndUpper(text: string) {
    return text.replace(/-/, "").toUpperCase();
}

main().catch(console.error);
