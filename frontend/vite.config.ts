import { defineConfig } from 'vite';
// @ts-ignore
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from 'tailwindcss';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [react(), tsconfigPaths()],
  base: '/app/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: 4343,
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
