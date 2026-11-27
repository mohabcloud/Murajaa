// src/lib/googleDrive.js
const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "97284826819-kl6ohtb6vnlofocg89p9oku69ag3i453.apps.googleusercontent.com";
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'plans.json';
const PLANS_KEY = 'quran_review_plans_v2';
const TOKEN_KEY = 'google_drive_token';

let gapiInited = false;
let gisInited = false;
let tokenClient = null;
let isSignedIn = false;
let initPromise = null;

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

// ✅ دالة مساعدة لتطبيع أي خطة قديمة أو مستوردة من Drive قبل الدمج
function normalizePlanItem(plan) {
  if (!plan || typeof plan !== 'object') return null;
  return {
    ...plan,
    id: plan.id || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    planType: plan.planType || 'review',
    schedule: Array.isArray(plan.schedule) ? plan.schedule : [],
    updatedAt: plan.updatedAt || plan.createdAt || '1970-01-01T00:00:00.000Z',
  };
}

// ✅ مسح الجلسة المنتهية الصلاحية بأمان
function clearExpiredSession() {
  isSignedIn = false;
  if (window.gapi?.client) {
    try {
      window.gapi.client.setToken('');
    } catch (e) {
      // تجاهل أي خطأ أثناء تفريغ الرمز
    }
  }
  localStorage.removeItem(TOKEN_KEY);
}

// ✅ التحقق من صلاحية الرمز المخزن زمنياً قبل إرسال أي طلب للسحابة
function getValidStoredToken() {
  const savedToken = localStorage.getItem(TOKEN_KEY);
  if (!savedToken) return null;
  try {
    const parsed = JSON.parse(savedToken);
    if (!parsed || !parsed.access_token) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    if (parsed.expires_at && Date.now() >= parsed.expires_at) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

// 1. تحميل وتهيئة Google APIs (محمي ضد التكرار وحالة عدم الاتصال)
export function initGoogleDrive() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  // ✅ عدم حقن سكربتات Google عند فتح التطبيق أوفلاين لتجنب تعليق التهيئة لاحقاً عند عودة الاتصال
  if (!isBrowserOnline()) return Promise.resolve(false);
  if (gapiInited && gisInited) {
    const validToken = getValidStoredToken();
    if (validToken && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: validToken.access_token });
      isSignedIn = true;
    }
    return Promise.resolve(true);
  }
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const checkAllReady = () => {
      if (gapiInited && gisInited) {
        const validToken = getValidStoredToken();
        if (validToken && window.gapi?.client) {
          window.gapi.client.setToken({ access_token: validToken.access_token });
          isSignedIn = true;
        } else {
          isSignedIn = false;
        }
        resolve(true);
      }
    };

    const loadGapi = () => {
      if (window.gapi) {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({});
            await window.gapi.client.load('drive', 'v3');
            gapiInited = true;
            checkAllReady();
          } catch (err) {
            initPromise = null;
            reject(err);
          }
        });
      }
    };

    const loadGis = () => {
      if (window.google?.accounts?.oauth2) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '',
        });
        gisInited = true;
        checkAllReady();
      }
    };

    const existingApiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    if (!existingApiScript) {
      const script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.async = true;
      script1.defer = true;
      script1.onload = loadGapi;
      script1.onerror = () => {
        // ✅ إزالة السكربت الفاشل حتى تنجح إعادة المحاولة فور عودة الإنترنت
        script1.remove();
        initPromise = null;
        reject(new Error('فشل تحميل Google API'));
      };
      document.body.appendChild(script1);
    } else if (window.gapi) {
      loadGapi();
    } else {
      existingApiScript.addEventListener('load', loadGapi, { once: true });
    }

    const existingGisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!existingGisScript) {
      const script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.async = true;
      script2.defer = true;
      script2.onload = loadGis;
      script2.onerror = () => {
        script2.remove();
        initPromise = null;
        reject(new Error('فشل تحميل Google Identity'));
      };
      document.body.appendChild(script2);
    } else if (window.google?.accounts?.oauth2) {
      loadGis();
    } else {
      existingGisScript.addEventListener('load', loadGis, { once: true });
    }
  });

  return initPromise;
}

// 2. تسجيل الدخول
export function signInToDrive() {
  return new Promise(async (resolve, reject) => {
    if (!isBrowserOnline()) {
      return reject(
        new Error('أنت غير متصل بالإنترنت حالياً. ستبقى بياناتك محفوظة على جهازك حتى يعود الاتصال.')
      );
    }

    // ✅ تنبيه واضح عند محاولة الربط من عنوان IP محلي (مثل 192.168.x.x) الذي ترفضه سياسة Google OAuth
    const host = window.location.hostname;
    const isLanIp =
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);

    if (isLanIp) {
      return reject(
        new Error(
          'سياسة Google تمنع تسجيل الدخول من عنوان الشبكة المحلية. افتح الرابط الرسمي https://murajaa.pages.dev لربط Google Drive.'
        )
      );
    }

    try {
      await initGoogleDrive();
    } catch (err) {
      return reject(err);
    }

    if (!tokenClient) {
      return reject(new Error('Google Identity غير جاهز بعد.'));
    }

    tokenClient.callback = (resp) => {
      if (resp.error !== undefined) {
        return reject(resp);
      }
      const expiresInSec = Number(resp.expires_in) || 3500;
      const tokenPayload = {
        ...resp,
        expires_at: Date.now() + Math.max(60, expiresInSec - 60) * 1000,
      };
      isSignedIn = true;
      localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenPayload));
      resolve(tokenPayload);
    };

    if (!getValidStoredToken() || window.gapi?.client?.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

// 3. تسجيل الخروج (تُعيد Promise بشكل متسق)
export function signOutFromDrive() {
  return new Promise((resolve) => {
    const token = window.gapi?.client?.getToken();
    if (isBrowserOnline() && token !== null && token?.access_token && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        clearExpiredSession();
        resolve();
      });
    } else {
      clearExpiredSession();
      resolve();
    }
  });
}

export function checkSignedIn() {
  if (!isSignedIn || !window.gapi?.client?.getToken()) return false;
  if (!getValidStoredToken()) {
    clearExpiredSession();
    return false;
  }
  return true;
}

// 4. البحث عن ملف الخطط في appDataFolder (مع معالجة 401 عند انتهاء صلاحية الجلسة)
async function findPlansFile() {
  try {
    const response = await window.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: `name = '${FILE_NAME}' and trashed = false`,
      fields: 'files(id, name, modifiedTime)',
      pageSize: 10,
    });
    const files = response.result.files;
    return files && files.length > 0 ? files[0].id : null;
  } catch (err) {
    const status = err?.status || err?.result?.error?.code;
    if (status === 401) {
      clearExpiredSession();
      const authError = new Error('انتهت صلاحية جلسة Google Drive. يرجى إعادة الربط.');
      authError.isAuthExpired = true;
      throw authError;
    }
    throw err;
  }
}

// 5. رفع الخطط إلى Google Drive
export async function savePlansToDrive(plans) {
  if (!isBrowserOnline() || !checkSignedIn()) return false;

  const normalizedPlans = (Array.isArray(plans) ? plans : [])
    .map(normalizePlanItem)
    .filter(Boolean);

  const fileContent = JSON.stringify(normalizedPlans, null, 2);
  const file = new Blob([fileContent], { type: 'application/json' });
  const fileId = await findPlansFile();

  const token = window.gapi.client.getToken().access_token;
  const metadata = {
    name: FILE_NAME,
    mimeType: 'application/json',
    ...(fileId ? {} : { parents: ['appDataFolder'] }),
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearExpiredSession();
      const authError = new Error('انتهت صلاحية جلسة Google Drive. يرجى إعادة الربط.');
      authError.isAuthExpired = true;
      throw authError;
    }
    throw new Error('فشل رفع الملف إلى Google Drive');
  }
  return true;
}

// 6. تحميل الخطط من Google Drive
export async function loadPlansFromDrive() {
  if (!isBrowserOnline() || !checkSignedIn()) return null;

  const fileId = await findPlansFile();
  if (!fileId) return null;

  const token = window.gapi.client.getToken().access_token;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearExpiredSession();
      const authError = new Error('انتهت صلاحية جلسة Google Drive. يرجى إعادة الربط.');
      authError.isAuthExpired = true;
      throw authError;
    }
    throw new Error('فشل قراءة الملف من Google Drive');
  }

  const parsed = await res.json();
  if (!Array.isArray(parsed)) return null;
  return parsed.map(normalizePlanItem).filter(Boolean);
}

// ✅ 7. دمج الخطط المحلية والسحابية دون فقدان أي خطة قديمة أو حديثة
export function mergePlans(localPlans, drivePlans) {
  const localNormalized = (Array.isArray(localPlans) ? localPlans : []).map(normalizePlanItem).filter(Boolean);
  const driveNormalized = (Array.isArray(drivePlans) ? drivePlans : []).map(normalizePlanItem).filter(Boolean);

  if (driveNormalized.length === 0) return localNormalized;
  if (localNormalized.length === 0) return driveNormalized;

  const mergedMap = new Map();

  for (const plan of localNormalized) {
    mergedMap.set(plan.id, plan);
  }

  for (const drivePlan of driveNormalized) {
    const existing = mergedMap.get(drivePlan.id);
    if (!existing) {
      mergedMap.set(drivePlan.id, drivePlan);
    } else {
      const localTime = new Date(existing.updatedAt || 0).getTime();
      const driveTime = new Date(drivePlan.updatedAt || 0).getTime();
      if (driveTime > localTime) {
        mergedMap.set(drivePlan.id, drivePlan);
      }
    }
  }

  return Array.from(mergedMap.values());
}

// ✅ 8. المزامنة الكاملة (جلب السحابة + دمجها مع الخطط المحلية + حفظ النتيجة محلياً وعلى السحابة)
export async function syncFromDrive() {
  if (!isBrowserOnline() || !checkSignedIn()) return null;

  const drivePlans = await loadPlansFromDrive();
  const localRaw = localStorage.getItem(PLANS_KEY);
  let localPlans = [];
  try {
    localPlans = localRaw ? JSON.parse(localRaw) : [];
  } catch (e) {
    localPlans = [];
  }

  if (!drivePlans) {
    if (localPlans.length > 0) {
      await savePlansToDrive(localPlans);
      return localPlans;
    }
    return null;
  }

  const merged = mergePlans(localPlans, drivePlans);
  localStorage.setItem(PLANS_KEY, JSON.stringify(merged));

  await savePlansToDrive(merged);
  return merged;
}

// 9. رفع يدوي إجباري إلى Drive
export async function uploadToDrive() {
  if (!isBrowserOnline() || !checkSignedIn()) return false;
  const localRaw = localStorage.getItem(PLANS_KEY);
  const localPlans = localRaw ? JSON.parse(localRaw) : [];
  return await savePlansToDrive(localPlans);
}