import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve as pathResolve } from 'node:path'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@sag/shared/core': pathResolve(__dirname, '../shared/src/core'),
      '@sag/shared/schemas': pathResolve(__dirname, '../shared/src/schemas'),
      '@': pathResolve(__dirname, 'src'),
    },
  },
  // BASE_URL is '/' in dev, '/hass-sag/' in production (set via CI env)
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
