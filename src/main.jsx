import React from 'react'
import ReactDOM from 'react-dom/client'
// ✅ استيراد خط Scheherazade New محلياً لضمان عرض الرسم العثماني وعلاماته بدقة على Chrome وكل الأجهزة
import '@fontsource/scheherazade-new/400.css'
import '@fontsource/scheherazade-new/700.css'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)