import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@plugins": path.resolve(__dirname, "../bot/src/plugins"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "@hooks/usePlugins":
        mode === "production"
          ? path.resolve(__dirname, "./hooks/usePlugins.prod.ts")
          : path.resolve(__dirname, "./hooks/usePlugins.dev.ts"),
    },
    publicDir: 'public',
    base: '/',
    server: {
      fs: {
        allow: [
          // Allow serving files from the project root
          path.resolve(__dirname, '../..'),
          // Allow serving root assets
          path.resolve(__dirname, '../../assets')
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
          rewrite: (path: string) => path.replace(/^\/api\/plugins/, '/plugins')
        }
      }
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // external: ['lucide-react'] // Do not externalize in main app
    },
  },
}));
