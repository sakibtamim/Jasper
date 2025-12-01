import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, '../src/plugins');
const DIST_DIR = path.resolve(__dirname, '../dist/plugins');

async function buildPlugins() {
    if (!fs.existsSync(PLUGINS_DIR)) {
        console.log('No plugins directory found.');
        return;
    }

    const plugins = fs.readdirSync(PLUGINS_DIR).filter(file => {
        return fs.statSync(path.join(PLUGINS_DIR, file)).isDirectory();
    });

    console.log(`Found ${plugins.length} plugins to check for frontend code...`);

    for (const pluginId of plugins) {
        const pluginDir = path.join(PLUGINS_DIR, pluginId);
        const webDir = path.join(pluginDir, 'web');
        const entryFile = path.join(webDir, 'index.tsx'); // Default entry
        // Check for .ts or .js if .tsx doesn't exist
        const entry = [entryFile, path.join(webDir, 'index.ts'), path.join(webDir, 'index.js')].find(f => fs.existsSync(f));

        // Copy jasper-plugin.json
        const manifestPath = path.join(pluginDir, 'jasper-plugin.json');
        if (fs.existsSync(manifestPath)) {
            const distPluginDir = path.join(DIST_DIR, pluginId);
            if (!fs.existsSync(distPluginDir)) {
                fs.mkdirSync(distPluginDir, { recursive: true });
            }
            fs.copyFileSync(manifestPath, path.join(distPluginDir, 'jasper-plugin.json'));
            console.log(`✅ Copied manifest for ${pluginId}`);
        }

        if (entry) {
            console.log(`Building frontend for plugin: ${pluginId}`);
            console.log(`Entry: ${entry}`);
            // ... (rest of the build logic)
            const outDir = path.join(DIST_DIR, pluginId, 'web');

            try {
                await build({
                    mode: 'production',
                    configFile: false,
                    plugins: [react({ jsxRuntime: 'classic' })],
                    define: {
                        'process.env.NODE_ENV': JSON.stringify('production')
                    },
                    build: {
                        lib: {
                            entry: entry,
                            name: 'JasperPlugin_' + pluginId.replace(/-/g, '_'),
                            fileName: () => 'index.js',
                            formats: ['iife']
                        },
                        outDir: outDir,
                        emptyOutDir: true,
                        rollupOptions: {
                            external: [
                                'react',
                                'react-dom',
                                'react/jsx-runtime',
                                'react-router-dom',
                                '@jasper/elements',
                                '@jasper/ui',
                                '@jasper/hooks',
                                'lucide-react'
                            ],
                            output: {
                                extend: true,
                                globals: {
                                    'react': 'JasperElements.React',
                                    'react-dom': 'JasperElements.ReactDOM',
                                    'react/jsx-runtime': 'JasperElements.JSXRuntime',
                                    'react-router-dom': 'JasperElements.ReactRouterDOM',
                                    '@jasper/elements': 'JasperElements',
                                    '@jasper/ui': 'JasperUI',
                                    '@jasper/hooks': 'JasperHooks',
                                    'lucide-react': 'LucideReact'
                                }
                            }
                        }
                    },
                });
                console.log(`✅ Built ${pluginId} frontend`);
            } catch (e) {
                console.error(`❌ Failed to build ${pluginId}:`, e);
                process.exit(1);
            }
        } else {
            // console.log(`Skipping ${pluginId} (no web/index.tsx found)`);
        }
    }
}

buildPlugins();
