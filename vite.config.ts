import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    root: 'web',
    publicDir: '../public/assets',
    base: '/',
    build: {
        outDir: '../dist/public',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                bypass(req) {
                    // Don't proxy if it's requesting a .ts or .tsx file
                    if (req.url?.match(/\.(ts|tsx)$/)) {
                        return req.url;
                    }
                }
            },
            '/plugins': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    }
});
