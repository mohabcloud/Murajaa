// تعطيل عميل Base44 تماماً - استخدام كائن وهمي (Mock) لتجنب أي اتصال بالخادم

// إنشاء كائن وهمي يحتوي على نفس دوال SDK ولكنها لا تفعل شيئاً
export const base44 = {
  auth: {
    me: async () => ({ id: 'local_user', name: 'Local User' }),
    loginViaEmailPassword: async () => {},
    loginWithProvider: async () => {},
    logout: () => {},
    redirectToLogin: () => {},
    register: async () => {},
    verifyOtp: async () => ({}),
    resetPasswordRequest: async () => {},
    resetPassword: async () => {},
    resendOtp: async () => {},
    setToken: () => {},
  },
};