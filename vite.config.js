import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/',
  // ✅ يتيح فتح التطبيق من الهاتف على نفس الشبكة بمجرد كتابة npm run dev
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    // ✅ تفعيل وضع التطبيق التقدمي (Offline-First PWA) مع التحديث الصامت التلقائي
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['assets/quranicon.png', 'assets/shadow.png'],
      manifest: {
        id: '/',
        name: 'مُراجِع · إدارة حفظ ومراجعة القرآن',
        short_name: 'مُراجِع',
        description: 'تطبيق شخصي لإدارة حفظ ومراجعة القرآن الكريم يعمل بدون إنترنت',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1A6E5A',
        theme_color: '#1A6E5A',
        icons: [
          {
            src: '/assets/quranicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/quranicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // ✅ رفع حد التخزين المسبق إلى ١٠ ميجابايت ليشمل حزمة التطبيق المدمج بها بيانات المصحف الكاملة
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,json}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});