import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/Jasper/',
    server: {
        port: 5174,
        strictPort: true,
    },
});
