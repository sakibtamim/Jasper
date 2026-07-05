import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, '../src/plugins');
const DIST_DIR = path.resolve(__dirname, '../dist/plugins');

async function buildPlugins() {
    if (!fs.existsSync(PLUGINS_DIR)) {
        console.log('No plugins directory found.');
        return;
    }

    const args = process.argv.slice(2);
    const targetPlugin = args[0];

    const plugins = fs.readdirSync(PLUGINS_DIR).filter((file) => {
        const isDir = fs.statSync(path.join(PLUGINS_DIR, file)).isDirectory();
        if (!isDir) return false;
        if (targetPlugin && file !== targetPlugin) return false;
        return true;
    });

    console.log(`Found ${plugins.length} plugins to check for frontend code...`);

    for (const pluginId of plugins) {
        const pluginDir = path.join(PLUGINS_DIR, pluginId);
        const webDir = path.join(pluginDir, 'web');
        const entryFile = path.join(webDir, 'index.tsx'); // Default entry
        // Check for .ts or .js if .tsx doesn't exist
        const entry = [
            entryFile,
            path.join(webDir, 'index.ts'),
            path.join(webDir, 'index.js'),
        ].find((f) => fs.existsSync(f));

        // Copy jasper-plugin.json
        const manifestPath = path.join(pluginDir, 'jasper-plugin.json');
        if (fs.existsSync(manifestPath)) {
            const distPluginDir = path.join(DIST_DIR, pluginId);
            if (!fs.existsSync(distPluginDir)) {
                fs.mkdirSync(distPluginDir, { recursive: true });
            }
            fs.copyFileSync(manifestPath, path.join(distPluginDir, 'jasper-plugin.json'));
            console.log(`✅ Copied manifest for ${pluginId}`);

            // Copy static assets (mp3, wav, ogg, png, jpg, etc.)
            // We explicitly exclude source files and system files
            // Copy static assets (mp3, wav, ogg, png, jpg, etc.)
            // We explicitly exclude source files and system files
            // Use a recursive function to handle nested assets
            const copyAssets = (src: string, dest: string) => {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }

                const items = fs.readdirSync(src);
                for (const item of items) {
                    const srcPath = path.join(src, item);
                    const destPath = path.join(dest, item);
                    const stat = fs.statSync(srcPath);

                    if (stat.isDirectory()) {
                        // Skip web source, hidden folders, and output dirs
                        if (['web', 'node_modules', 'dist', '.git'].includes(item)) continue;
                        copyAssets(srcPath, destPath);
                    } else if (stat.isFile()) {
                        const ext = path.extname(item).toLowerCase();
                        // Skip source code and config files
                        if (
                            [
                                '.ts',
                                '.tsx',
                                '.js',
                                '.jsx',
                                '.json',
                                '.md',
                                '.lock',
                                '.yaml',
                                '.yml',
                            ].includes(ext) ||
                            item === '.git'
                        ) {
                            continue;
                        }

                        fs.copyFileSync(srcPath, destPath);
                        console.log(`   Copied asset: ${path.relative(distPluginDir, destPath)}`);
                    }
                }
            };

            copyAssets(pluginDir, distPluginDir);
        }

        if (entry) {
            console.log(`Building frontend for plugin: ${pluginId}`);
            console.log(`Entry: ${entry}`);
            // ... (rest of the build logic)
            const outDir = path.join(DIST_DIR, pluginId, 'web');

            // Read dependencies from the plugin's package.json to configure Vite resolve aliases
            const pluginPkgPath = path.join(pluginDir, 'package.json');
            const aliases: Record<string, string> = {};
            if (fs.existsSync(pluginPkgPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf-8'));
                    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                    for (const dep of Object.keys(deps)) {
                        aliases[dep] = path.resolve(pluginDir, 'node_modules', dep);
                    }
                } catch (e) {
                    console.warn(`Warning: Failed to parse package.json for alias mapping:`, e);
                }
            }

            try {
                await build({
                    mode: 'production',
                    configFile: false,
                    resolve: {
                        alias: aliases,
                    },
                    plugins: [react({ jsxRuntime: 'classic' })],
                    define: {
                        'process.env.NODE_ENV': JSON.stringify('production'),
                    },
                    build: {
                        lib: {
                            entry: entry,
                            name: 'JasperPlugin_' + pluginId.replace(/-/g, '_'),
                            fileName: () => 'index.js',
                            formats: ['iife'],
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
                                'lucide-react',
                            ],
                            output: {
                                extend: true,
                                globals: {
                                    react: 'JasperElements.React',
                                    'react-dom': 'JasperElements.ReactDOM',
                                    'react/jsx-runtime': 'JasperElements.JSXRuntime',
                                    'react-router-dom': 'JasperElements.ReactRouterDOM',
                                    '@jasper/elements': 'JasperElements',
                                    '@jasper/ui': 'JasperUI',
                                    '@jasper/hooks': 'JasperHooks',
                                    'lucide-react': 'LucideReact',
                                },
                            },
                        },
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
