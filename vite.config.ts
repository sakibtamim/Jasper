import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    root: 'web',
    publicDir: '../public/assets',
    base: '/',
    resolve: {
        alias: {
            '@jasper/ui': path.resolve(__dirname, './web/ui'),
            '@jasper/elements': path.resolve(__dirname, './web/elements.tsx')
        }
    },
    build: {
        outDir: '../dist/public',
        emptyOutDir: true,
        rollupOptions: {
            external: ['@jasper/elements'],
            output: {
                paths: {
                    '@jasper/elements': '/elements.js'
                }
            }
        }
    }
});
