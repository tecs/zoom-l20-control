import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import checker from 'vite-plugin-checker';
import eslint from 'vite-plugin-eslint2';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'client',
  base: './', // relative asset paths
  plugins: [
    solid(),
    eslint({
      include: ['{client,core,libs,tools}/**/*.{ts,tsx}'],
      emitErrorAsWarning: true,
    }),
    checker({ typescript: true }),
  ],
  server: {
    fs: {
      allow: [repoRoot],
    },
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  build: {
    emptyOutDir: true,
    outDir: '../dist',
  },
});
