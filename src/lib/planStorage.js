import { savePlansToDrive, loadPlansFromDrive, checkSignedIn, mergePlans } from './googleDrive';

const PLANS_KEY = "quran_review_plans_v2";
const ACTIVE_KEY = "quran_active_plan_id";

/** تحميل جميع الخطط من localStorage */
export function loadAllPlans() {
  const raw = localStorage.getItem(PLANS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/** حفظ جميع الخطط في localStorage + رفع إلى Drive إذا كان متصلاً */
export function saveAllPlans(plans, syncToCloud = true) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  if (syncToCloud && checkSignedIn()) {
    savePlansToDrive(plans).catch(err => {
      console.warn('⚠️ Could not save to Drive:', err);
    });
  }
  return plans;
}

/** ✅ دمج خطط مستوردة مع الخطط الحالية دون مسح الخطط الموجودة */
export function mergeImportedPlans(importedPlans) {
  const currentPlans = loadAllPlans();
  const normalizedImported = importedPlans.map((p) => ({
    ...p,
    planType: p.planType || 'review',
    updatedAt: p.updatedAt || new Date().toISOString(),
  }));
  const merged = mergePlans(currentPlans, normalizedImported);
  saveAllPlans(merged, true);
  return merged;
}

/** تحميل خطة واحدة */
export function loadPlan(id) {
  const plans = loadAllPlans();
  return plans.find(p => p.id === id) || null;
}

/** حفظ/تحديث خطة واحدة (مع تحديث updatedAt دائماً عند الحفظ) */
export function savePlan(plan) {
  const plans = loadAllPlans();
  const idx = plans.findIndex(p => p.id === plan.id);

  // ✅ تحديث updatedAt دائماً لضمان تفوّق النسخة المحلية الأحدث عند مزامنة Drive
  const updatedPlan = {
    ...plan,
    planType: plan.planType || 'review',
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    plans[idx] = updatedPlan;
  } else {
    plans.push(updatedPlan);
  }
  saveAllPlans(plans);
  setActivePlanId(updatedPlan.id);
  return updatedPlan;
}

/** حذف خطة */
export function deletePlan(id) {
  let plans = loadAllPlans();
  plans = plans.filter(p => p.id !== id);
  saveAllPlans(plans);
  if (getActivePlanId() === id) {
    setActivePlanId(plans.length > 0 ? plans[0].id : null);
  }
}

/** معرف الخطة النشطة */
export function getActivePlanId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActivePlanId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

/** الخطة النشطة */
export function loadActivePlan() {
  const id = getActivePlanId();
  if (!id) {
    const plans = loadAllPlans();
    if (plans.length > 0) {
      setActivePlanId(plans[0].id);
      return plans[0];
    }
    return null;
  }
  const found = loadPlan(id);
  if (!found) {
    const plans = loadAllPlans();
    if (plans.length > 0) {
      setActivePlanId(plans[0].id);
      return plans[0];
    }
    return null;
  }
  return found;
}

// ========== دوال Drive ==========

/** تحميل الخطط من Drive وتحديث localStorage */
export async function loadAllPlansFromDrive() {
  if (checkSignedIn()) {
    const drivePlans = await loadPlansFromDrive();
    if (drivePlans) {
      localStorage.setItem(PLANS_KEY, JSON.stringify(drivePlans));
      return drivePlans;
    }
  }
  return loadAllPlans();
}

/** رفع جميع الخطط إلى Drive */
export async function saveAllPlansToDrive(plans) {
  if (checkSignedIn()) {
    return await savePlansToDrive(plans);
  }
  return false;
}