import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
    plugins: [react()],
    resolve: {
        alias: {
            '@plugins': path.resolve(__dirname, '../bot/src/plugins'),
            react: path.resolve(__dirname, './node_modules/react'),
            'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
            '@hooks/usePlugins':
                mode === 'production'
                    ? path.resolve(__dirname, './hooks/usePlugins.prod.ts')
                    : path.resolve(__dirname, './hooks/usePlugins.dev.ts'),
            '@jasper/elements': path.resolve(__dirname, '../../packages/elements/src'),
            '@jasper/ui': path.resolve(__dirname, '../../packages/ui/src'),
        },
    },
    publicDir: 'public',
    base: '/',
    server: {
        fs: {
            allow: [
                // Allow serving files from the project root
                path.resolve(__dirname, '../..'),
                // Allow serving root assets
                path.resolve(__dirname, '../../assets'),
            ],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/auth': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/legacy': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/plugins': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path: string) => {
                    // Don't rewrite the API endpoints, only static assets if needed
                    // Actually, if it's an API call, we SHOULD NOT rewrite it to /plugins
                    // Let's check headers or just remove this rewrite if not strictly needed
                    // For now, let's skip rewriting if it ends with /install or /storage
                    if (path.includes('/install') || path.includes('/storage')) {
                        return path;
                    }
                    return path.replace(/^\/api\/plugins/, '/plugins');
                },
            },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            // external: ['lucide-react'] // Do not externalize in main app
        },
    },
}));
