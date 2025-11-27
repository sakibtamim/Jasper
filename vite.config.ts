import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    root: 'web',
    publicDir: '../public/assets',
    build: {
        outDir: '../public/dist-react',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        proxy: {
            '^/api/.*': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            }
        }
    }
});
