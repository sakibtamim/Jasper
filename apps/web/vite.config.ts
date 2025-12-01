import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@plugins': path.resolve(__dirname, '../bot/src/plugins'),
            'react': path.resolve(__dirname, './node_modules/react'),
            'react-dom': path.resolve(__dirname, './node_modules/react-dom')
        }
    },
    publicDir: 'public/assets',
    base: '/',
    server: {
        fs: {
            allow: [
                // Allow serving files from the project root
                path.resolve(__dirname, '../..')
            ]
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/auth': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/legacy': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/api/plugins': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/plugins/, '/plugins')
            }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
});
