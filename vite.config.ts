import { defineConfig } from 'vite';
import { resolve as pathResolve } from 'node:path';
import { builtinModules } from 'node:module';

export const config = defineConfig({
  resolve: {
    alias: {
      '@sag': pathResolve(__dirname, './src'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
  build: {
    target: 'node22',
    lib: {
      entry: pathResolve(__dirname, 'src/main.ts'),
      formats: ['es'],
      fileName: 'sag',
    },
    rollupOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
      output: {
        entryFileNames: 'sag.mjs',
        banner: '#!/usr/bin/env node\n',
      },
    },
    outDir: 'dist',
    minify: false,
    emptyOutDir: true,
  },
});

// eslint-disable-next-line import/no-default-export
export default config;
