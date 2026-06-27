import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cosis/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
