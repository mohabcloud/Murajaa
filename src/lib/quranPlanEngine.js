/**
 * محرك حساب خطة مراجعة القرآن - يعتمد على بيانات من quranData.js
 */

import { getVersesBetween as getVersesBetweenData, getPageRange as getPageRangeData, getPageVerseCount as getPageVerseCountData, getQuranData } from './quranData';
import { formatQuranUnits, smartQuranDisplay } from './utils';

export const DAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// ==================== دوال مساعدة للبيانات ====================

export function getPagesMap() {
  const data = getQuranData();
  if (!data) return {};
  return data.pageMap;
}

export function getPageVerseCount(pageNum) {
  return getPageVerseCountData(pageNum);
}

export function getVersesBetween(startPage, endPage) {
  return getVersesBetweenData(startPage, endPage);
}

export function getPageRange(pageNum) {
  return getPageRangeData(pageNum);
}

// ==================== دوال إضافية ====================

export function getSurahsList() {
  const data = getQuranData();
  if (!data) return [];
  const surahsMap = {};
  for (let page in data.pageMap) {
    const p = data.pageMap[page];
    const surahId = p.startChapter;
    if (!surahsMap[surahId]) {
      surahsMap[surahId] = {
        id: surahId,
        name: `سورة ${surahId}`,
        startPage: parseInt(page),
        endPage: parseInt(page),
        versesCount: 0,
      };
    }
    surahsMap[surahId].versesCount += p.verseCount;
    surahsMap[surahId].endPage = Math.max(surahsMap[surahId].endPage, parseInt(page));
  }
  return Object.values(surahsMap).sort((a, b) => a.id - b.id);
}

export function getVersesCountBetweenPoints(startSurah, startVerse, endSurah, endVerse) {
  const data = getQuranData();
  if (!data) return 0;
  let count = 0;
  let startPage = null;
  let endPage = null;
  for (let p in data.pageMap) {
    const page = data.pageMap[p];
    if (page.startChapter === startSurah && page.startVerse === startVerse) {
      startPage = parseInt(p);
    }
    if (page.endChapter === endSurah && page.endVerse === endVerse) {
      endPage = parseInt(p);
    }
    if (startPage !== null && endPage !== null) break;
  }
  if (startPage === null || endPage === null) return 0;
  for (let i = startPage; i <= endPage; i++) {
    count += data.pageMap[i]?.verseCount || 0;
  }
  return count;
}

// ==================== محرك التخطيط ====================

export function versesToPages(verses, startPage = 1) {
  const map = getPagesMap();
  let remaining = verses;
  let pages = 0;
  let currentPage = startPage;
  while (remaining > 0 && currentPage <= 604) {
    remaining -= (map[currentPage]?.verseCount || 10);
    pages++;
    currentPage++;
  }
  return Math.max(1, pages);
}

export function flexibleInputToVerses(input, startPage = 1) {
  if (!input) return 0;
  const juzPages = (input.juz || 0) * 20;
  const hizbPages = (input.hizb || 0) * 10;
  const rubPages = (input.rub || 0) * 2.5;
  const directPages = (input.pages || 0);
  const totalPages = Math.round(juzPages + hizbPages + rubPages + directPages);
  
  let versesFromPages = 0;
  if (totalPages > 0) {
    const endPage = Math.min(604, startPage + totalPages - 1);
    versesFromPages = getVersesBetween(startPage, endPage);
  }
  return versesFromPages + (parseInt(input.verses || 0, 10) || 0);
}

export function createPlan({ name, startDate, endDate, startPage, endPage, offDays = [], vacationPattern = null }) {
  const totalVerses = getVersesBetween(startPage, endPage);
  const totalPages = endPage - startPage + 1;
  const totalDays = daysBetween(startDate, endDate);

  // استخراج إعدادات التناوب
  let daysOn = 0;
  let daysOff = 0;
  let vacationEnabled = false;
  if (vacationPattern && vacationPattern.enabled) {
    vacationEnabled = true;
    daysOn = vacationPattern.daysOn || 2;
    daysOff = vacationPattern.daysOff || 2;
  }

  // توليد الجدول
  const result = generateSchedule({
    startDate,
    endDate,
    startPage,
    endPage,
    offDays: new Set(offDays),
    totalPages,
    vacationEnabled,
    daysOn,
    daysOff,
  });

  if (result.error) return { error: result.error };

  const schedule = result.schedule;
  // أيام المراجعة الفعلية (التي تحتوي على ورد جديد)
  const workDays = schedule.filter(d => d.isReviewDay === false && d.isOff === false).length;
  const reviewDays = schedule.filter(d => d.isReviewDay === true).length;
  const totalOffDays = schedule.filter(d => d.isOff === true).length;

  if (workDays <= 0) return { error: "لا توجد أيام مراجعة كافية." };

  // حساب الورد اليومي للمراجعة
  const dailyVerses = Math.ceil(totalVerses / workDays);

  return {
    id: 'plan_' + Date.now(),
    name,
    startDate,
    endDate,
    startPage,
    endPage,
    totalVerses,
    totalPages,
    schedule,
    createdAt: new Date().toISOString(),
    workDays,
    reviewDays,
    dailyVerses,
    totalDays,
    offDayCount: totalOffDays,
  };
}

export function daysBetween(startDate, endDate) {
  return Math.floor((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
}

export function toLocalDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLocalToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return toLocalDateStr(now);
}

// ==================== توليد الجدول ====================

function generateSchedule({ startDate, endDate, startPage, endPage, offDays, totalPages, vacationEnabled, daysOn, daysOff }) {
  const schedule = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);

  // 1. حساب أيام العمل الفعلية (تجاهل أيام الإجازة الأسبوعية)
  let workDayCount = 0;
  let temp = new Date(startDate);
  while (temp <= end) {
    const dateStr = toLocalDateStr(temp);
    if (!offDays.has(new Date(dateStr).getDay())) {
      workDayCount++;
    }
    temp.setDate(temp.getDate() + 1);
  }
  if (workDayCount === 0) return { error: "لا توجد أيام عمل (جميع الأيام إجازة)", schedule: [] };

  // 2. توزيع الصفحات على أيام المراجعة (وليس أيام التثبيت)
  // سنقوم بتوليد الجدول مع تحديد نوع كل يوم (مراجعة، تثبيت، إجازة) ثم نوزع الصفحات لاحقاً
  let phase = 'review'; // 'review' أو 'consolidation'
  let daysInPhase = 0;

  // نجمع الأيام أولاً
  const days = [];
  while (cur <= end) {
    const dateStr = toLocalDateStr(cur);
    const dayOfWeek = cur.getDay();
    const isScheduledOff = offDays.has(dayOfWeek);

    let isOff = false;
    let isReviewDay = false;

    if (isScheduledOff) {
      // إجازة أسبوعية (راحة تامة)
      isOff = true;
      isReviewDay = false;
    } else if (vacationEnabled) {
      // نظام التناوب
      if (phase === 'review') {
        isOff = false;
        isReviewDay = false;
        daysInPhase++;
        if (daysInPhase >= daysOn) {
          phase = 'consolidation';
          daysInPhase = 0;
        }
      } else { // consolidation
        isOff = false;
        isReviewDay = true;
        daysInPhase++;
        if (daysInPhase >= daysOff) {
          phase = 'review';
          daysInPhase = 0;
        }
      }
    } else {
      // لا يوجد تناوب، كل الأيام مراجعة
      isOff = false;
      isReviewDay = false;
    }

    days.push({
      date: dateStr,
      isOff,
      isReviewDay,
      dayOfWeek,
    });

    cur.setDate(cur.getDate() + 1);
  }

  // 3. توزيع الصفحات على أيام المراجعة فقط
  const reviewDaysIndices = days.map((d, idx) => d.isOff === false && d.isReviewDay === false ? idx : -1).filter(i => i >= 0);
  const totalReviewDays = reviewDaysIndices.length;

  for (let i = 0; i < totalReviewDays; i++) {
    const idx = reviewDaysIndices[i];
    const progress = (i + 1) / totalReviewDays;
    const endPageForDay = Math.min(endPage, startPage + Math.round(progress * totalPages) - 1);
    const startPageForDay = (i === 0) ? startPage : Math.min(endPage, startPage + Math.round((i) / totalReviewDays * totalPages));
    // نضمن عدم تجاوز البداية للنهاية
    const realStart = Math.min(startPageForDay, endPageForDay);
    const realEnd = Math.max(startPageForDay, endPageForDay);
    const verses = getVersesBetween(realStart, realEnd);
    days[idx].targetVerses = verses;
    days[idx].targetStartPage = realStart;
    days[idx].targetEndPage = realEnd;
  }

  // 4. أيام التثبيت: نعطيها ورداً مرجعياً (من آخر يوم مراجعة)
  const consolidationIndices = days.map((d, idx) => d.isReviewDay === true ? idx : -1).filter(i => i >= 0);
  for (let idx of consolidationIndices) {
    // نبحث عن آخر يوم مراجعة قبله
    let prevReviewIdx = -1;
    for (let j = idx - 1; j >= 0; j--) {
      if (days[j].isOff === false && days[j].isReviewDay === false) {
        prevReviewIdx = j;
        break;
      }
    }
    if (prevReviewIdx >= 0) {
      const prevDay = days[prevReviewIdx];
      days[idx].targetVerses = prevDay.targetVerses || 0;
      days[idx].targetStartPage = prevDay.targetStartPage || startPage;
      days[idx].targetEndPage = prevDay.targetEndPage || endPage;
    } else {
      days[idx].targetVerses = 0;
      days[idx].targetStartPage = null;
      days[idx].targetEndPage = null;
    }
  }

  // 5. أيام الإجازة الأسبوعية: targetVerses = 0
  for (let d of days) {
    if (d.isOff) {
      d.targetVerses = 0;
      d.targetStartPage = null;
      d.targetEndPage = null;
    }
    // إضافة حالة pending
    d.status = 'pending';
    d.completedVerses = 0;
  }

  return { schedule: days };
}

// ==================== دوال التقدم والإحصائيات ====================

export function getTodayData(plan) {
  const today = getLocalToday();
  const day = plan.schedule.find(d => d.date === today);
  if (!day) return null;
  return {
    ...day,
    targetQuarterName: day.targetStartPage ? `الجزء ${Math.ceil(day.targetStartPage / 20)}` : null,
    completedVerses: day.completedVerses || 0,
  };
}

export function getProgress(plan) {
  const total = plan.totalVerses || 1;
  const completed = plan.schedule.reduce((sum, d) => sum + (d.completedVerses || 0), 0);
  return Math.min(100, Math.round((completed / total) * 100));
}

export function getStats(plan) {
  const days = plan.schedule || [];
  const totalDays = days.length;
  const completedDays = days.filter(d => d.status === 'completed').length;
  const partialDays = days.filter(d => d.status === 'partial').length;
  const skippedDays = days.filter(d => d.status === 'skipped').length;
  const pendingDays = days.filter(d => d.status === 'pending' && !d.isOff && !d.isReviewDay).length;
  const avgDailyPages = plan.totalPages / (totalDays - days.filter(d => d.isOff).length) || 0;
  return { totalDays, completedDays, partialDays, skippedDays, pendingDays, avgDailyPages: Math.round(avgDailyPages * 10) / 10 };
}

// ==================== دوال التقدم (مع تحديث updatedAt) ====================

export function recordDayProgressFlexible(plan, dateStr, input) {
  const updatedPlan = { ...plan, schedule: plan.schedule.map(day => {
    if (day.date === dateStr) {
      const completed = flexibleInputToVerses(input, day.targetStartPage || plan.startPage);
      const status = completed >= day.targetVerses ? 'completed' : (completed > 0 ? 'partial' : 'pending');
      return { ...day, completedVerses: completed, status };
    }
    return day;
  })};
  updatedPlan.completedVerses = updatedPlan.schedule.reduce((sum, d) => sum + (d.completedVerses || 0), 0);
  updatedPlan.updatedAt = new Date().toISOString(); // ✅ تحديث وقت التعديل
  return updatedPlan;
}

export function undoDayProgress(plan, dateStr) {
  const updatedPlan = { ...plan, schedule: plan.schedule.map(day => {
    if (day.date === dateStr) {
      return { ...day, completedVerses: 0, status: 'pending' };
    }
    return day;
  })};
  updatedPlan.completedVerses = updatedPlan.schedule.reduce((sum, d) => sum + (d.completedVerses || 0), 0);
  updatedPlan.updatedAt = new Date().toISOString(); // ✅ تحديث وقت التعديل
  return updatedPlan;
}

// ==================== دمج التقدم عند التعديل ====================

/**
 * دمج خطة جديدة مع تقدم خطة قديمة
 * @param {Object} oldPlan - الخطة القديمة (التي تحتوي على التقدم)
 * @param {Object} newPlanData - الخطة الجديدة (التي تم إنشاؤها بواسطة createPlan)
 * @returns {Object} الخطة المدمجة مع الاحتفاظ بالتقدم للأيام المتطابقة
 */
export function mergePlanWithProgress(oldPlan, newPlanData) {
  // 1. إنشاء خريطة للأيام القديمة (مفتاح = التاريخ)
  const oldScheduleMap = {};
  if (oldPlan && oldPlan.schedule) {
    oldPlan.schedule.forEach(day => {
      oldScheduleMap[day.date] = day;
    });
  }

  // 2. دمج الجدول الجديد مع التقدم القديم
  const mergedSchedule = newPlanData.schedule.map(newDay => {
    const oldDay = oldScheduleMap[newDay.date];
    if (oldDay) {
      // إذا كان اليوم موجوداً في الخطة القديمة، نحتفظ بالتقدم والحالة
      return {
        ...newDay,
        status: oldDay.status || 'pending',
        completedVerses: oldDay.completedVerses || 0,
      };
    }
    // إذا كان اليوم جديداً (لم يكن موجوداً في الخطة القديمة)
    return {
      ...newDay,
      status: 'pending',
      completedVerses: 0,
    };
  });

  // 3. حساب إجمالي الآيات المنجزة من الجدول المدمج
  const totalCompletedVerses = mergedSchedule.reduce((sum, day) => sum + (day.completedVerses || 0), 0);

  // 4. إرجاع الخطة المدمجة مع الاحتفاظ بالخصائص الجديدة
  return {
    ...newPlanData,
    schedule: mergedSchedule,
    completedVerses: totalCompletedVerses,
  };
}

// تصدير دوال التنسيق من utils
export { formatQuranUnits, smartQuranDisplay };