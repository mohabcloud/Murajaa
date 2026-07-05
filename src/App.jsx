import React, { useState, useEffect } from 'react';
import { Toaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import Home from '@/pages/Home';
import SplashScreen from '@/components/SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // إذا كانت شاشة البداية ظاهرة، نعرضها فقط
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // بعد انتهاء شاشة البداية، نعرض التطبيق الرئيسي
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <Toaster
          position="bottom-right"
          richColors
          duration={4000}
          dir="rtl"
          closeButton={false}
          toastOptions={{
            className: "murajaa-toast",
            style: {
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
            },
          }}
        />
      </Router>
    </QueryClientProvider>
  );
}

export default App;