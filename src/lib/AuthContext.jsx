import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true); // تم التحقق تلقائياً
  const [isAuthenticated, setIsAuthenticated] = useState(true); // المصادقة ناجحة دوماً

  // ✅ تجاهل أي محاولة اتصال بالخادم
  useEffect(() => {
    // فقط نضع الحالة إلى مصادق، لا نفعل أي شيء آخر
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthError(null);
    setAuthChecked(true);
    setIsAuthenticated(true);
  }, []);

  const logout = () => {
    // لا حاجة لأي شيء
  };

  const navigateToLogin = () => {
    // لا حاجة لأي شيء
  };

  const checkUserAuth = () => {
    // لا حاجة لأي شيء
  };

  const checkAppState = () => {
    // لا حاجة لأي شيء
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