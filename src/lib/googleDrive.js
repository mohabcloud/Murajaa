// src/lib/googleDrive.js
const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "97284826819-kl6ohtb6vnlofocg89p9oku69ag3i453.apps.googleusercontent.com";
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'plans.json';
const PLANS_KEY = 'quran_review_plans_v2';

let gapiInited = false;
let gisInited = false;
let tokenClient = null;
let isSignedIn = false;
let initPromise = null;

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

// 1. تحميل وتهيئة Google APIs (محمي ضد التكرار في StrictMode)
export function initGoogleDrive() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (gapiInited && gisInited) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const checkAllReady = () => {
      if (gapiInited && gisInited) {
        const savedToken = localStorage.getItem('google_drive_token');
        if (savedToken && window.gapi?.client) {
          try {
            const parsed = JSON.parse(savedToken);
            if (parsed.access_token) {
              window.gapi.client.setToken({ access_token: parsed.access_token });
              isSignedIn = true;
            }
          } catch (e) {
            localStorage.removeItem('google_drive_token');
          }
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

    if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      const script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.async = true;
      script1.defer = true;
      script1.onload = loadGapi;
      script1.onerror = () => {
        initPromise = null;
        reject(new Error('فشل تحميل Google API'));
      };
      document.body.appendChild(script1);
    } else if (window.gapi) {
      loadGapi();
    }

    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.async = true;
      script2.defer = true;
      script2.onload = loadGis;
      script2.onerror = () => {
        initPromise = null;
        reject(new Error('فشل تحميل Google Identity'));
      };
      document.body.appendChild(script2);
    } else if (window.google?.accounts?.oauth2) {
      loadGis();
    }
  });

  return initPromise;
}

// 2. تسجيل الدخول
export function signInToDrive() {
  return new Promise(async (resolve, reject) => {
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
      isSignedIn = true;
      localStorage.setItem('google_drive_token', JSON.stringify(resp));
      resolve(resp);
    };

    if (window.gapi?.client?.getToken() === null) {
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
    if (token !== null && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken('');
        isSignedIn = false;
        localStorage.removeItem('google_drive_token');
        resolve();
      });
    } else {
      isSignedIn = false;
      localStorage.removeItem('google_drive_token');
      resolve();
    }
  });
}

export function checkSignedIn() {
  return isSignedIn && !!window.gapi?.client?.getToken();
}

// 4. البحث عن ملف الخطط في appDataFolder
async function findPlansFile() {
  const response = await window.gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name = '${FILE_NAME}' and trashed = false`,
    fields: 'files(id, name, modifiedTime)',
    pageSize: 10,
  });
  const files = response.result.files;
  return files && files.length > 0 ? files[0].id : null;
}

// 5. رفع الخطط إلى Google Drive
export async function savePlansToDrive(plans) {
  if (!checkSignedIn()) return false;

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
      isSignedIn = false;
      localStorage.removeItem('google_drive_token');
    }
    throw new Error('فشل رفع الملف إلى Google Drive');
  }
  return true;
}

// 6. تحميل الخطط من Google Drive
export async function loadPlansFromDrive() {
  if (!checkSignedIn()) return null;

  const fileId = await findPlansFile();
  if (!fileId) return null;

  const token = window.gapi.client.getToken().access_token;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      isSignedIn = false;
      localStorage.removeItem('google_drive_token');
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
  if (!checkSignedIn()) return null;

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
  if (!checkSignedIn()) return false;
  const localRaw = localStorage.getItem(PLANS_KEY);
  const localPlans = localRaw ? JSON.parse(localRaw) : [];
  return await savePlansToDrive(localPlans);
}