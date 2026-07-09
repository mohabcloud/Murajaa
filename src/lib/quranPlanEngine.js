// src/lib/quranPlanEngine.js
/**
 * محرك حساب خطة مراجعة القرآن
 */

import { getVersesBetween as getVersesBetweenData, getPageRange as getPageRangeData, getPageVerseCount as getPageVerseCountData, getQuranData } from './quranData';
import { formatQuranUnits, smartQuranDisplay } from './utils';

export const DAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

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

export function versesToPages(verses, startPage = 1) {
  return versesToPagesCount(verses, startPage);
}

export function versesToPagesCount(verses, startPage = 1) {
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

// ✅ دالة createPlan المحسنة مع سجلات
export function createPlan({ name, startDate, endDate, startPage, endPage, offDays = [], vacationPattern = null }) {
  console.log("🔍 createPlan called with:", { name, startDate, endDate, startPage, endPage, offDays, vacationPattern });

  try {
    // التحقق من صحة المدخلات
    if (!startDate || !endDate) {
      return { error: "تاريخ البداية والنهاية مطلوبان." };
    }
    if (startPage > endPage) {
      return { error: "صفحة البداية يجب أن تكون قبل صفحة النهاية." };
    }
    if (offDays.length === 7) {
      return { error: "لا يمكن تحديد جميع أيام الأسبوع كإجازة." };
    }

    const totalVerses = getVersesBetween(startPage, endPage);
    console.log("📊 totalVerses:", totalVerses);
    
    const totalPages = endPage - startPage + 1;
    console.log("📊 totalPages:", totalPages);
    
    const totalDays = daysBetween(startDate, endDate);
    console.log("📊 totalDays:", totalDays);

    let daysOn = 0;
    let daysOff = 0;
    let vacationEnabled = false;
    if (vacationPattern && vacationPattern.enabled) {
      vacationEnabled = true;
      daysOn = vacationPattern.daysOn || 2;
      daysOff = vacationPattern.daysOff || 2;
    }
    console.log("🔄 vacationEnabled:", vacationEnabled, "daysOn:", daysOn, "daysOff:", daysOff);

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
    console.log("📋 generateSchedule result:", result);

    if (result.error) {
      console.warn("⚠️ generateSchedule error:", result.error);
      return { error: result.error };
    }

    const schedule = result.schedule;
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      console.error("❌ schedule is invalid:", schedule);
      return { error: "فشل إنشاء الجدول." };
    }

    const workDays = schedule.filter(d => d.isReviewDay === false && d.isOff === false).length;
    const reviewDays = schedule.filter(d => d.isReviewDay === true).length;
    const totalOffDays = schedule.filter(d => d.isOff === true).length;
    console.log("📊 workDays:", workDays, "reviewDays:", reviewDays, "totalOffDays:", totalOffDays);

    if (workDays <= 0) {
      console.warn("⚠️ no work days");
      return { error: "لا توجد أيام مراجعة كافية." };
    }

    const dailyVerses = Math.ceil(totalVerses / workDays);
    console.log("📊 dailyVerses:", dailyVerses);

    const plan = {
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
    console.log("✅ Plan created successfully:", plan.id);
    return plan;

  } catch (err) {
    console.error("❌ Exception in createPlan:", err);
    return { error: "حدث خطأ داخلي: " + (err.message || "غير معروف") };
  }
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

function generateSchedule({ startDate, endDate, startPage, endPage, offDays, totalPages, vacationEnabled, daysOn, daysOff }) {
  const schedule = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);

  let workDayCount = 0;
  let temp = new Date(startDate);
  while (temp <= end) {
    const dateStr = toLocalDateStr(temp);
    if (!offDays.has(new Date(dateStr).getDay())) {
      workDayCount++;
    }
    temp.setDate(temp.getDate() + 1);
  }
  if (workDayCount === 0) {
    return { error: "لا توجد أيام عمل (جميع الأيام إجازة)", schedule: [] };
  }

  let phase = 'review';
  let daysInPhase = 0;

  const days = [];
  while (cur <= end) {
    const dateStr = toLocalDateStr(cur);
    const dayOfWeek = cur.getDay();
    const isScheduledOff = offDays.has(dayOfWeek);

    let isOff = false;
    let isReviewDay = false;

    if (isScheduledOff) {
      isOff = true;
      isReviewDay = false;
    } else if (vacationEnabled) {
      if (phase === 'review') {
        isOff = false;
        isReviewDay = false;
        daysInPhase++;
        if (daysInPhase >= daysOn) {
          phase = 'consolidation';
          daysInPhase = 0;
        }
      } else {
        isOff = false;
        isReviewDay = true;
        daysInPhase++;
        if (daysInPhase >= daysOff) {
          phase = 'review';
          daysInPhase = 0;
        }
      }
    } else {
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

  const reviewDaysIndices = days.map((d, idx) => d.isOff === false && d.isReviewDay === false ? idx : -1).filter(i => i >= 0);
  const totalReviewDays = reviewDaysIndices.length;

  if (totalReviewDays === 0) {
    return { error: "لا توجد أيام مراجعة", schedule: days };
  }

  for (let i = 0; i < totalReviewDays; i++) {
    const idx = reviewDaysIndices[i];
    const progress = (i + 1) / totalReviewDays;
    const endPageForDay = Math.min(endPage, startPage + Math.round(progress * totalPages) - 1);
    const startPageForDay = (i === 0) ? startPage : Math.min(endPage, startPage + Math.round((i) / totalReviewDays * totalPages));
    const realStart = Math.min(startPageForDay, endPageForDay);
    const realEnd = Math.max(startPageForDay, endPageForDay);
    const verses = getVersesBetween(realStart, realEnd);
    days[idx].targetVerses = verses;
    days[idx].targetStartPage = realStart;
    days[idx].targetEndPage = realEnd;
  }

  const consolidationIndices = days.map((d, idx) => d.isReviewDay === true ? idx : -1).filter(i => i >= 0);
  for (let idx of consolidationIndices) {
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

  for (let d of days) {
    if (d.isOff) {
      d.targetVerses = 0;
      d.targetStartPage = null;
      d.targetEndPage = null;
    }
    d.status = 'pending';
    d.completedVerses = 0;
  }

  return { schedule: days };
}

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
  updatedPlan.updatedAt = new Date().toISOString();
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
  updatedPlan.updatedAt = new Date().toISOString();
  return updatedPlan;
}

export function mergePlanWithProgress(oldPlan, newPlanData) {
  const oldScheduleMap = {};
  if (oldPlan && oldPlan.schedule) {
    oldPlan.schedule.forEach(day => {
      oldScheduleMap[day.date] = day;
    });
  }

  const mergedSchedule = newPlanData.schedule.map(newDay => {
    const oldDay = oldScheduleMap[newDay.date];
    if (oldDay) {
      return {
        ...newDay,
        status: oldDay.status || 'pending',
        completedVerses: oldDay.completedVerses || 0,
      };
    }
    return {
      ...newDay,
      status: 'pending',
      completedVerses: 0,
    };
  });

  const totalCompletedVerses = mergedSchedule.reduce((sum, day) => sum + (day.completedVerses || 0), 0);

  return {
    ...newPlanData,
    schedule: mergedSchedule,
    completedVerses: totalCompletedVerses,
  };
}

export { formatQuranUnits, smartQuranDisplay };