import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
// @ts-ignore-next-line
import eslint from 'vite-plugin-eslint';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    tsconfigPaths(),
    eslint({ failOnError: false }),
  ],
  base: '/app/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    // DEV: Proxy /api and urls not starting with /app/ to backend,
    // PROD: httpd is used
    proxy: {
      '/api': {
        target: 'http://backend:3050',
      },
      '^(?!/app/).*': {
        target: 'http://backend:3050',
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
