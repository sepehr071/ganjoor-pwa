import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

const POET_IMG = /^https:\/\/api\.ganjoor\.net\/api\/ganjoor\/poet\/image\//
// '/' locally and on Android; '/ganjoor-pwa/' for GitHub Pages (set by the Pages workflow).
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icon.svg', 'fonts/*.woff2'],
      manifest: {
        name: 'بیت: شعر فارسی بر پایهٔ گنجور',
        short_name: 'بیت',
        description: 'برنامهٔ مستقل و غیررسمی خواندن شعر فارسی با خوانش و معنی، ساختهٔ گنجور نیست. متن\u200cها از گنجور.',
        lang: 'fa',
        dir: 'rtl',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f4eedf',
        theme_color: '#0b1330',
        icons: [
          { src: 'icons/beyt-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/beyt-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/beyt-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}', 'art/*.webp', 'fonts/*.woff2', 'assets/*arabic*.woff2', 'daily-poems.json'],
        navigateFallback: base + 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.destination === 'font' && url.origin === self.location.origin,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 10 } },
          },
          {
            // Poet portraits: opaque (no-cors <img>) responses are fine here.
            urlPattern: POET_IMG,
            handler: 'CacheFirst',
            options: {
              cacheName: 'poet-images',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Everything the app reads: poems you opened stay readable offline.
            // Serialized into the service worker: it must not reference variables from this file.
            urlPattern: ({ url, request }) => request.method === 'GET' && url.origin === 'https://api.ganjoor.net' && url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ganjoor-api',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
})
