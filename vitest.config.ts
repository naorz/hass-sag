import { defineConfig } from 'vitest/config'
import { resolve as pathResolve } from 'node:path'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  resolve: {
    alias: {
      '@sag/utils': pathResolve(__dirname, 'src/utils'),
      '@sag/menu': pathResolve(__dirname, 'src/menu'),
      '@sag/types': pathResolve(__dirname, 'src/types.ts'),
      '@sag/schemas': pathResolve(__dirname, 'src/schemas'),
      '@sag/core': pathResolve(__dirname, 'src/core'),
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
