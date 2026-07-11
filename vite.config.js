import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/padelbroowww/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
