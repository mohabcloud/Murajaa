// src/lib/googleDrive.js

/* eslint-disable no-undef */

const CLIENT_ID = '97284826819-kl6ohtb6vnlofocg89p9oku69ag3i453.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDJdFgHrzBDsvxkzZ3mnpvgs7uZE6tmxGI';
const TOKEN_STORAGE_KEY = 'google_drive_token';

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let isSignedIn = false;

// ===== حفظ واسترجاع التوكن =====
const saveToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const loadToken = () => {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

// ===== التهيئة =====
export const initGoogleDrive = () => {
  return new Promise((resolve, reject) => {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiInited = true;

          const savedToken = loadToken();
          if (savedToken) {
            window.gapi.client.setToken(savedToken);
            isSignedIn = true;
            console.log('✅ Restored token from localStorage');
          }

          console.log('✅ Google API initialized');
          checkReady(resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    };
    script1.onerror = () => reject(new Error('Failed to load Google API'));
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
      });
      gisInited = true;
      console.log('✅ GIS initialized');
      checkReady(resolve, reject);
    };
    script2.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(script2);
  });
};

const checkReady = (resolve, reject) => {
  if (gapiInited && gisInited) {
    const token = window.gapi.client.getToken();
    if (token) {
      isSignedIn = true;
      saveToken(token);
    }
    resolve(true);
  }
};

// ===== تسجيل الدخول والخروج =====
export const signInToDrive = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Drive not initialized'));
      return;
    }

    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(resp.error);
        return;
      }
      window.gapi.client.setToken(resp);
      isSignedIn = true;
      saveToken(resp);
      console.log('✅ Signed in to Google Drive');
      resolve(resp);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const signOutFromDrive = () => {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      window.gapi.client.setToken(null);
      isSignedIn = false;
      saveToken(null);
      console.log('✅ Signed out from Google Drive');
    });
  }
};

export const checkSignedIn = () => {
  const token = window.gapi?.client?.getToken?.();
  return token !== null && token !== undefined && isSignedIn;
};

// ===== دوال مساعدة =====
export const listAllFiles = async () => {
  try {
    if (!checkSignedIn()) return null;
    const response = await window.gapi.client.drive.files.list({
      pageSize: 100,
      fields: 'files(id, name, mimeType, parents)',
      spaces: 'appDataFolder',
    });
    console.log('📂 All files in appDataFolder:', response.result.files);
    return response.result.files;
  } catch (error) {
    console.error('❌ Error listing files:', error);
    return null;
  }
};

// ===== تحميل الخطط =====
export const loadPlansFromDrive = async () => {
  try {
    if (!checkSignedIn()) {
      console.warn('⚠️ Not signed in');
      return null;
    }

    console.log('🔍 Searching for plans.json in appDataFolder...');
    const response = await window.gapi.client.drive.files.list({
      q: "name='plans.json' and trashed=false",
      spaces: 'appDataFolder',
      fields: 'files(id, name, createdTime, modifiedTime)',
    });

    const files = response.result.files;
    if (files.length === 0) {
      console.log('⚠️ No plans file found. Listing all files for debugging:');
      await listAllFiles();
      return null;
    }

    console.log(`📄 Found file: ${files[0].name} (ID: ${files[0].id})`);
    const fileId = files[0].id;
    const fileResponse = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });

    return JSON.parse(fileResponse.body);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      console.warn('⚠️ Auth error, clearing session');
      window.gapi.client.setToken(null);
      isSignedIn = false;
      saveToken(null);
      return null;
    }
    console.error('❌ Error loading plans from Drive:', error);
    return null;
  }
};

// ===== حفظ الخطط =====
export const savePlansToDrive = async (plans) => {
  try {
    if (!checkSignedIn()) {
      console.warn('⚠️ Not signed in, cannot save to Drive');
      return false;
    }

    const token = window.gapi.client.getToken();
    if (!token) throw new Error('No access token');

    console.log(`💾 Saving ${plans.length} plans to Drive...`);
    const content = JSON.stringify(plans, null, 2);

    const listResponse = await window.gapi.client.drive.files.list({
      q: "name='plans.json' and trashed=false",
      spaces: 'appDataFolder',
      fields: 'files(id)',
    });
    const existingFile = listResponse.result.files[0];

    let url, method;
    let metadata = { name: 'plans.json' };

    if (existingFile) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
      method = 'PATCH';
    } else {
      url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      method = 'POST';
      metadata.parents = ['appDataFolder'];
    }

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch(url, {
      method: method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', response.status, errorText);
      if (response.status === 401 || response.status === 403) {
        console.warn('⚠️ Auth error, clearing session');
        window.gapi.client.setToken(null);
        isSignedIn = false;
        saveToken(null);
      }
      return false;
    }

    const result = await response.json();
    console.log(`✅ ${existingFile ? 'Updated' : 'Created'} file:`, result);

    if (!existingFile && result.name !== 'plans.json') {
      console.warn(`⚠️ File name is "${result.name}" instead of "plans.json". Renaming...`);
      const renameResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${result.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'plans.json' }),
        }
      );
      if (renameResponse.ok) {
        console.log('✅ File renamed to plans.json');
      } else {
        console.warn('⚠️ Could not rename file');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error saving plans to Drive:', error);
    return false;
  }
};

// ===== ✅ دالة دمج الخطط =====
const mergePlans = (localPlans, drivePlans) => {
  // إنشاء خريطة للخطط المحلية (مفتاح = id)
  const plansMap = new Map();
  
  // إضافة الخطط المحلية أولاً
  localPlans.forEach(plan => {
    plansMap.set(plan.id, { ...plan, _source: 'local' });
  });
  
  // إضافة أو تحديث الخطط من Drive
  drivePlans.forEach(plan => {
    if (plansMap.has(plan.id)) {
      // إذا كانت الخطة موجودة محلياً، نقارن التواريخ
      const localPlan = plansMap.get(plan.id);
      const localDate = new Date(localPlan.updatedAt || localPlan.createdAt || 0);
      const driveDate = new Date(plan.updatedAt || plan.createdAt || 0);
      
      if (driveDate > localDate) {
        // خطة Drive أحدث، نستبدلها
        plansMap.set(plan.id, { ...plan, _source: 'drive' });
        console.log(`🔄 Updated plan "${plan.name}" from Drive (newer)`);
      } else {
        // الخطة المحلية أحدث أو متساوية، نحتفظ بها
        console.log(`🔄 Keeping local plan "${localPlan.name}" (newer or same)`);
      }
    } else {
      // خطة جديدة من Drive
      plansMap.set(plan.id, { ...plan, _source: 'drive' });
      console.log(`➕ Added new plan "${plan.name}" from Drive`);
    }
  });
  
  // تحويل الخريطة إلى مصفوفة وإزالة خاصية _source
  const mergedPlans = Array.from(plansMap.values()).map(({ _source, ...plan }) => plan);
  
  console.log(`✅ Merged ${mergedPlans.length} plans (${localPlans.length} local + ${drivePlans.length} drive)`);
  return mergedPlans;
};

// ===== ✅ المزامنة مع دمج البيانات =====
export const syncFromDrive = async () => {
  try {
    // 1. تحميل الخطط من Drive
    const drivePlans = await loadPlansFromDrive();
    
    // 2. تحميل الخطط المحلية
    const localPlans = JSON.parse(localStorage.getItem('quran_review_plans_v2') || '[]');
    
    // 3. إذا لم توجد خطط في Drive، نرفع المحلية إلى Drive
    if (!drivePlans || drivePlans.length === 0) {
      if (localPlans.length > 0) {
        await savePlansToDrive(localPlans);
        console.log('🔄 Uploaded local plans to Drive');
        return localPlans;
      }
      console.log('⚠️ No plans found anywhere');
      return [];
    }
    
    // 4. دمج الخطط المحلية مع خطط Drive
    const mergedPlans = mergePlans(localPlans, drivePlans);
    
    // 5. حفظ المدمج في localStorage
    localStorage.setItem('quran_review_plans_v2', JSON.stringify(mergedPlans));
    
    // 6. رفع المدمج إلى Drive
    await savePlansToDrive(mergedPlans);
    console.log('🔄 Synced merged plans to Drive');
    
    return mergedPlans;
  } catch (error) {
    console.error('❌ Sync failed:', error);
    return null;
  }
};

// ===== رفع البيانات المحلية إلى Drive =====
export const uploadToDrive = async () => {
  try {
    const localPlans = JSON.parse(localStorage.getItem('quran_review_plans_v2') || '[]');
    if (localPlans.length === 0) {
      console.log('⚠️ No local data to upload');
      return false;
    }
    const result = await savePlansToDrive(localPlans);
    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return false;
  }
};