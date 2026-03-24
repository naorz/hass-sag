import { defineConfig } from 'vitest/config'
import { resolve as pathResolve } from 'node:path'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  resolve: {
    alias: {
      '@sag/utils': pathResolve(__dirname, 'src/utils'),
      '@sag/menu': pathResolve(__dirname, 'src/menu'),
      '@sag/types': pathResolve(__dirname, 'src/types.ts'),
      '@sag/shared/core': pathResolve(__dirname, '../shared/src/core'),
      '@sag/shared/schemas': pathResolve(__dirname, '../shared/src/schemas'),
      '@sag/providers': pathResolve(__dirname, 'src/providers'),
      '@sag/topics': pathResolve(__dirname, 'src/topics'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
