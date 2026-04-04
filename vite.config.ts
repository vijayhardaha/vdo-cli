/**
 * ========================================================================
 * Vite Configuration
 * ========================================================================
 * Builds the CLI as a Node.js library (CJS format) for distribution.
 * Entry point: src/bin/vdo.ts → dist/vdo.js
 * Docs: https://vitejs.dev/config/
 * ========================================================================
 */

import { builtinModules } from 'module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // Shorthand for src/ imports
  resolve: { alias: { '@': resolve(__dirname, 'src') } },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: true,
    target: 'node18',
    ssr: true,

    // CLI entry point - produces dist/vdo.js
    lib: { entry: resolve(__dirname, 'src/bin/vdo.ts'), name: 'vdo', fileName: 'vdo', formats: ['cjs'] },

    rollupOptions: {
      // Mark Node built-ins and runtime deps as external
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        'commander',
        'cli-progress',
        'ora',
        'axios',
      ],
      output: { preserveModules: false, entryFileNames: '[name].js' },
    },
  },
});
