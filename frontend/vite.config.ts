import { defineConfig } from 'vite';
// @ts-ignore
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import eslint from 'vite-plugin-eslint';
import tailwindcss from 'tailwindcss';

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [react(), tsconfigPaths(), eslint()],
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
  },
  build: {
    outDir: 'dist',
  },
});
