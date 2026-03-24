import { defineConfig } from 'vite'
import { resolve as pathResolve } from 'node:path'
import { builtinModules } from 'node:module'

/**
 * Single source of truth for path aliases.
 * tsconfig.json paths must mirror these for IDE support.
 */
const aliases = {
  '@sag/utils': pathResolve(__dirname, 'src/utils'),
  '@sag/menu': pathResolve(__dirname, 'src/menu'),
  '@sag/types': pathResolve(__dirname, 'src/types.ts'),
  '@sag/shared/core': pathResolve(__dirname, '../shared/src/core'),
  '@sag/shared/schemas': pathResolve(__dirname, '../shared/src/schemas'),
  '@sag/providers': pathResolve(__dirname, 'src/providers'),
  '@sag/topics': pathResolve(__dirname, 'src/topics'),
}

export const config = defineConfig({
  resolve: {
    alias: aliases,
    extensions: ['.ts', '.js', '.json'],
  },
  build: {
    target: 'node22',
    sourcemap: true,
    lib: {
      entry: pathResolve(__dirname, 'src/main.ts'),
      formats: ['es'],
      fileName: 'sag',
    },
    rollupOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`), 'qrcode-terminal'],
      output: {
        entryFileNames: 'sag.mjs',
        banner: '#!/usr/bin/env node\n',
      },
    },
    outDir: 'dist',
    minify: false,
    emptyOutDir: true,
  },
})

// eslint-disable-next-line import/no-default-export
export default config
