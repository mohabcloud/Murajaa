// src/lib/AuthContext.jsx
/*
 * ⚠️ تنبيه: هذا الملف يحتوي على تنفيذ مؤقت للمصادقة.
 * تم تعيين isAuthenticated = true بشكل ثابت لتجاوز المصادقة أثناء التطوير.
 * قبل النشر في بيئة إنتاج، يجب استبدال هذا التنفيذ بنظام مصادقة حقيقي (JWT، OAuth، إلخ).
 */

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // تجاهل أي محاولة اتصال بالخادم - مؤقت للتطوير
  useEffect(() => {
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthError(null);
    setAuthChecked(true);
    setIsAuthenticated(true);
  }, []);

  const logout = () => {
    // لا حاجة لأي شيء في الوضع المؤقت
    console.warn('⚠️ logout() غير مفعل في وضع التطوير المؤقت.');
  };

  const navigateToLogin = () => {
    // لا حاجة لأي شيء في الوضع المؤقت
  };

  const checkUserAuth = () => {
    // لا حاجة لأي شيء في الوضع المؤقت
  };

  const checkAppState = () => {
    // لا حاجة لأي شيء في الوضع المؤقت
  };

  return (
    <AuthContext.Provider value={{
      user: null,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};