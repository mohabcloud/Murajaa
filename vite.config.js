import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  logLevel: 'error',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['manifest.json', 'logo_v2.svg'],
      manifest: false, // نستخدم manifest.json الموجود في الجذر
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,ico,png,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // سنة
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // شهر
              },
            },
          },
          {
            // تخزين بيانات المصحف (quran_complete_data.json)
            urlPattern: /quran_complete_data\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-data-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 365, // سنة
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // تفعيل PWA في وضع التطوير لتسهيل الاختبار
        type: 'module',
      },
    }),
  ],
});