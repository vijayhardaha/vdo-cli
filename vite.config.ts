import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';
import { fileURLToPath, URL } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/bin/vdo.ts'),
      name: 'vdo',
      fileName: 'vdo',
      formats: ['es'],
    },
    outDir: 'dist/bin',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        'commander',
        'cli-progress',
        'ora',
        'axios',
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
    target: 'node18',
    minify: false,
    sourcemap: true,
    ssr: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
