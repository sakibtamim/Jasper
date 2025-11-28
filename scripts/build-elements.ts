import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '../web');
const DIST_DIR = path.resolve(__dirname, '../dist/public');

async function buildElements() {
    console.log('Building @jasper/elements...');

    try {
        await build({
            configFile: false,
            root: WEB_DIR,
            build: {
                lib: {
                    entry: path.join(WEB_DIR, 'elements.ts'),
                    name: 'JasperElements',
                    fileName: () => 'elements.js',
                    formats: ['es']
                },
                outDir: DIST_DIR,
                emptyOutDir: false, // Don't wipe dist/public as it might contain other assets
                rollupOptions: {
                    // Bundle React and friends into this file
                    external: [],
                    output: {
                        // Ensure it's a single file
                        manualChunks: undefined,
                    }
                },
                minify: true
            },
            logLevel: 'info'
        });
        console.log('✅ Built @jasper/elements');
    } catch (e) {
        console.error('❌ Failed to build @jasper/elements:', e);
        process.exit(1);
    }
}

buildElements();
