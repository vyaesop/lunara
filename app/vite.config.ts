import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      // The Capacitor shells load the bundle from disk and own notifications
      // natively, so the service worker and manifest exist only in the web build.
      disable: mode === 'native',
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Lunara',
        short_name: 'Lunara',
        description: 'A private, local-first cycle companion.',
        theme_color: '#fff8fa',
        background_color: '#fff8fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        globIgnores: ['push-sw.js'],
        // Daily check-in handlers (public/push-sw.js), loaded into the generated worker.
        importScripts: ['/push-sw.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
