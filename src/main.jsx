import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// ✅ استيراد جميع خطوط التطبيق وشاشة البداية والمصحف محلياً لضمان عملها ١٠٠٪ بدون إنترنت
import '@fontsource/noto-sans-arabic/400.css'
import '@fontsource/noto-sans-arabic/500.css'
import '@fontsource/noto-sans-arabic/600.css'
import '@fontsource/noto-sans-arabic/700.css'
import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import '@fontsource/scheherazade-new/400.css'
import '@fontsource/scheherazade-new/700.css'
import App from '@/App.jsx'
import '@/index.css'

// ✅ تسجيل Service Worker بالتحديث الصامت التلقائي وفحص التحديث فور عودة الإنترنت أو إعادة فتح التطبيق
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const checkForUpdate = () => {
      if (navigator.onLine) {
        registration.update().catch(() => {})
      }
    }
    window.addEventListener('online', checkForUpdate)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    })
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)