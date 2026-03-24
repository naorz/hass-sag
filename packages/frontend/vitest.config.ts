import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve as pathResolve } from 'node:path'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sag/shared/core': pathResolve(__dirname, '../shared/src/core'),
      '@sag/shared/schemas': pathResolve(__dirname, '../shared/src/schemas'),
      '@': pathResolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
