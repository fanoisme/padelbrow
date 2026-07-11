import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/padelbroowww/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PADEL BROW',
        short_name: 'PADEL BROW',
        description: 'Organize padel meets, matches, and competitions with your club.',
        theme_color: '#FFAF03',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/padelbroowww/#/',
        scope: '/padelbroowww/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js']
  }
})
