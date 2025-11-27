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
        // Proxy temporarily disabled to test module loading
        // We'll add it back after verifying the app loads
    }
});
