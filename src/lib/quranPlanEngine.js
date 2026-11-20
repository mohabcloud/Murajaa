// src/lib/quranPlanEngine.js
/**
 * محرك حساب خطة مراجعة وحفظ القرآن
 */

import {
  getVersesBetween as getVersesBetweenData,
  getPageRange as getPageRangeData,
  getPageVerseCount as getPageVerseCountData,
  getQuranData,
} from './quranData';
import { formatQuranUnits, smartQuranDisplay, toArabicNumbers, formatArabicDate } from './utils';

export const DAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// ✅ التسميات الموحدة حسب نوع الخطة ('review' | 'memorization')
export function getPlanLabels(planType = "review") {
  const isMem = planType === "memorization";
  return {
    isMemorization: isMem,
    planTypeName: isMem ? "خطة حفظ" : "خطة مراجعة",
    workNoun: isMem ? "الحفظ" : "المراجعة",
    workNounNew: isMem ? "حفظ جديد" : "مراجعة",
    workDayLabel: isMem ? "يوم حفظ" : "يوم مراجعة",
    workDaysPlural: isMem ? "أيام الحفظ" : "أيام المراجعة",
    consolidationNoun: isMem ? "تثبيت" : "ربط وتجميع",
    consolidationDayLabel: isMem ? "يوم تثبيت" : "يوم ربط",
    consolidationDesc: isMem
      ? "أيام تُثبّت وتُكرّر فيها الآيات التي حفظتها في الدورة السابقة."
      : "أيام تُجمّع وتربط فيها الصفحات التي راجعتها في الدورة السابقة.",
  };
}

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

export function parseLocal(s) {
  if (!s) return new Date();
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const str = String(s);
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return new Date(s);
  return new Date(y, m - 1, d);
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
  if (!verses || verses <= 0) return 0;
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

// ✅ حساب نطاق الدورة السابقة الكاملة لكل يوم تثبيت/ربط
function assignConsolidationRanges(days, fallbackStartPage, fallbackEndPage) {
  let cycleWorkDays = [];
  let i = 0;

  while (i < days.length) {
    const d = days[i];
    if (d.isOff) {
      i++;
      continue;
    }

    if (!d.isReviewDay) {
      // يوم حفظ/مراجعة أساسي ضمن الدورة الحالية
      cycleWorkDays.push(d);
      i++;
    } else {
      // بداية كتلة أيام التثبيت/الربط المتتالية
      const blockIndices = [];
      while (i < days.length && (days[i].isReviewDay || days[i].isOff)) {
        if (days[i].isReviewDay) blockIndices.push(i);
        i++;
      }

      const validWorkDays = cycleWorkDays.filter(
        (wd) => wd.targetStartPage != null && wd.targetEndPage != null && (wd.targetVerses || 0) > 0
      );

      if (validWorkDays.length > 0) {
        const cycleStartPage = Math.min(...validWorkDays.map((wd) => wd.targetStartPage));
        const cycleEndPage = Math.max(...validWorkDays.map((wd) => wd.targetEndPage));
        const totalCyclePages = cycleEndPage - cycleStartPage + 1;
        const blockLen = blockIndices.length;

        for (let b = 0; b < blockLen; b++) {
          const idx = blockIndices[b];
          // إذا لم يُسجّل اليوم بعد، نوزع نطاق الدورة السابقة على أيام التثبيت
          if (days[idx].status === 'pending') {
            const pStart = cycleStartPage + Math.floor((b / blockLen) * totalCyclePages);
            const pEnd = Math.min(
              cycleEndPage,
              Math.max(pStart, cycleStartPage + Math.ceil(((b + 1) / blockLen) * totalCyclePages) - 1)
            );
            days[idx].targetStartPage = pStart;
            days[idx].targetEndPage = pEnd;
            days[idx].targetVerses = getVersesBetween(pStart, pEnd);
          }
        }
      } else {
        for (const idx of blockIndices) {
          if (days[idx].status === 'pending') {
            days[idx].targetStartPage = null;
            days[idx].targetEndPage = null;
            days[idx].targetVerses = 0;
          }
        }
      }

      // تصفير الدورة بعد انتهاء أيام التثبيت لبدء دورة جديدة
      cycleWorkDays = [];
    }
  }
}

export function createPlan({
  name,
  planType = "review",
  startDate,
  endDate,
  startPage,
  endPage,
  offDays = [],
  vacationPattern = null,
}) {
  try {
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
    const totalPages = endPage - startPage + 1;
    const totalDays = daysBetween(startDate, endDate);

    let daysOn = 0;
    let daysOff = 0;
    let vacationEnabled = false;
    if (vacationPattern && vacationPattern.enabled) {
      vacationEnabled = true;
      daysOn = vacationPattern.daysOn || 2;
      daysOff = vacationPattern.daysOff || 2;
    }

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

    if (result.error) {
      return { error: result.error };
    }

    const schedule = result.schedule;
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return { error: "فشل إنشاء الجدول." };
    }

    const workDays = schedule.filter(d => d.isReviewDay === false && d.isOff === false).length;
    const reviewDays = schedule.filter(d => d.isReviewDay === true).length;
    const totalOffDays = schedule.filter(d => d.isOff === true).length;

    if (workDays <= 0) {
      const labels = getPlanLabels(planType);
      return { error: `لا توجد ${labels.workDaysPlural} كافية.` };
    }

    const dailyVerses = Math.ceil(totalVerses / workDays);
    const dailyPages = Math.ceil(totalPages / workDays);

    const plan = {
      id: 'plan_' + Date.now(),
      name,
      planType,
      vacationPattern: vacationEnabled ? { enabled: true, daysOn, daysOff } : { enabled: false, daysOn: 2, daysOff: 2 },
      startDate,
      endDate,
      startPage,
      endPage,
      totalVerses,
      totalPages,
      schedule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workDays,
      reviewDays,
      dailyVerses,
      dailyPages,
      totalDays,
      offDayCount: totalOffDays,
      completedVerses: 0,
    };

    return syncPlanSchedule(plan).plan;
  } catch (err) {
    console.error("❌ Exception in createPlan:", err);
    return { error: "حدث خطأ داخلي: " + (err.message || "غير معروف") };
  }
}

export function daysBetween(startDate, endDate) {
  const s = parseLocal(startDate);
  const e = parseLocal(endDate);
  return Math.floor((e - s) / 86400000) + 1;
}

export function toLocalDateStr(date) {
  const d = date instanceof Date
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
    : parseLocal(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLocalToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return toLocalDateStr(now);
}

function generateSchedule({ startDate, endDate, startPage, endPage, offDays, totalPages, vacationEnabled, daysOn, daysOff }) {
  const cur = parseLocal(startDate);
  const end = parseLocal(endDate);

  let workDayCount = 0;
  let temp = parseLocal(startDate);
  while (temp <= end) {
    if (!offDays.has(temp.getDay())) {
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
      dayName: DAY_NAMES_AR[dayOfWeek],
      status: 'pending',
      completedVerses: 0,
      consolidationVerses: 0,
      note: '',
    });

    cur.setDate(cur.getDate() + 1);
  }

  const reviewDaysIndices = days.map((d, idx) => d.isOff === false && d.isReviewDay === false ? idx : -1).filter(i => i >= 0);
  const totalReviewDays = reviewDaysIndices.length;

  if (totalReviewDays === 0) {
    return { error: "لا توجد أيام عمل كافية في هذه الفترة", schedule: days };
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

  for (let d of days) {
    if (d.isOff) {
      d.targetVerses = 0;
      d.targetStartPage = null;
      d.targetEndPage = null;
    }
  }

  // ✅ تجميع نطاق الدورة السابقة كاملة لأيام التثبيت/الربط
  assignConsolidationRanges(days, startPage, endPage);

  return { schedule: days };
}

// ✅ إعادة التوزيع التلقائي للورد المتبقي وتحويل الأيام الفائتة إلى skipped
export function syncPlanSchedule(plan) {
  if (!plan || !Array.isArray(plan.schedule)) {
    return { plan, changed: false };
  }

  const today = getLocalToday();
  let changed = false;

  // 1. تحويل أيام العمل الماضية (الأساسية والتثبيت) التي بقيت pending إلى skipped
  const updatedSchedule = plan.schedule.map((day) => {
    if (day.date < today && !day.isOff && day.status === 'pending') {
      changed = true;
      return { ...day, status: 'skipped', completedVerses: 0, consolidationVerses: 0 };
    }
    return { ...day };
  });

  // 2. حساب المنجز الفعلي من الحفظ/المراجعة الأساسية فقط (لا نخلط معه آيات التثبيت)
  const totalCompletedVerses = updatedSchedule.reduce(
    (sum, d) => sum + (!d.isReviewDay ? (d.completedVerses || 0) : 0),
    0
  );
  const totalPlanVerses = plan.totalVerses || getVersesBetween(plan.startPage, plan.endPage);
  const totalPlanPages = plan.totalPages || (plan.endPage - plan.startPage + 1);

  const completedPagesCount = totalCompletedVerses > 0
    ? Math.min(totalPlanPages, versesToPagesCount(totalCompletedVerses, plan.startPage))
    : 0;

  const remainingVerses = Math.max(0, totalPlanVerses - totalCompletedVerses);
  const remainingPages = Math.max(0, totalPlanPages - completedPagesCount);
  const nextStartPage = Math.min(plan.endPage, plan.startPage + completedPagesCount);

  // 3. تحديد أيام الحفظ/المراجعة القادمة المتبقية (pending فقط)
  const upcomingReviewIndices = updatedSchedule
    .map((d, idx) => (!d.isOff && !d.isReviewDay && d.status === 'pending' && d.date >= today ? idx : -1))
    .filter((i) => i >= 0);

  let newDailyPages = plan.dailyPages ?? Math.ceil(totalPlanPages / Math.max(1, plan.workDays || 1));
  let newDailyVerses = plan.dailyVerses ?? Math.ceil(totalPlanVerses / Math.max(1, plan.workDays || 1));

  if (upcomingReviewIndices.length > 0) {
    const count = upcomingReviewIndices.length;

    if (remainingVerses === 0 || remainingPages === 0) {
      newDailyPages = 0;
      newDailyVerses = 0;
      for (const idx of upcomingReviewIndices) {
        if (updatedSchedule[idx].targetVerses !== 0) changed = true;
        updatedSchedule[idx].targetVerses = 0;
        updatedSchedule[idx].targetStartPage = null;
        updatedSchedule[idx].targetEndPage = null;
      }
    } else {
      newDailyPages = Math.ceil(remainingPages / count);
      newDailyVerses = Math.ceil(remainingVerses / count);

      for (let i = 0; i < count; i++) {
        const idx = upcomingReviewIndices[i];
        const progress = (i + 1) / count;
        const endPageForDay = Math.min(plan.endPage, nextStartPage + Math.round(progress * remainingPages) - 1);
        const startPageForDay = i === 0
          ? nextStartPage
          : Math.min(plan.endPage, nextStartPage + Math.round((i / count) * remainingPages));

        const realStart = Math.min(startPageForDay, endPageForDay);
        const realEnd = Math.max(startPageForDay, endPageForDay);
        const versesForDay = getVersesBetween(realStart, realEnd);

        if (
          updatedSchedule[idx].targetVerses !== versesForDay ||
          updatedSchedule[idx].targetStartPage !== realStart ||
          updatedSchedule[idx].targetEndPage !== realEnd
        ) {
          changed = true;
        }

        updatedSchedule[idx].targetVerses = versesForDay;
        updatedSchedule[idx].targetStartPage = realStart;
        updatedSchedule[idx].targetEndPage = realEnd;
      }
    }
  }

  // 4. تحديث نطاقات أيام التثبيت/الربط القادمة بناءً على الدورة السابقة لكل منها
  const beforeConsolidation = JSON.stringify(updatedSchedule.map((d) => [d.targetStartPage, d.targetEndPage, d.targetVerses]));
  assignConsolidationRanges(updatedSchedule, plan.startPage, plan.endPage);
  const afterConsolidation = JSON.stringify(updatedSchedule.map((d) => [d.targetStartPage, d.targetEndPage, d.targetVerses]));
  if (beforeConsolidation !== afterConsolidation) {
    changed = true;
  }

  if (
    plan.dailyPages !== newDailyPages ||
    plan.dailyVerses !== newDailyVerses ||
    plan.completedVerses !== totalCompletedVerses
  ) {
    changed = true;
  }

  const syncedPlan = {
    ...plan,
    planType: plan.planType || "review",
    schedule: updatedSchedule,
    completedVerses: totalCompletedVerses,
    dailyPages: newDailyPages,
    dailyVerses: newDailyVerses,
  };

  return { plan: syncedPlan, changed };
}

export function getTodayData(plan) {
  const today = getLocalToday();
  const day = plan.schedule.find(d => d.date === today);
  if (!day) return null;
  const range = day.targetStartPage ? getPageRange(day.targetStartPage) : null;
  return {
    ...day,
    targetQuarterName: range ? `الجزء ${toArabicNumbers(range.juzu)}` : null,
    completedVerses: day.isReviewDay ? (day.consolidationVerses || day.completedVerses || 0) : (day.completedVerses || 0),
  };
}

export function getProgress(plan) {
  const total = plan.totalVerses || 1;
  const completed = plan.schedule.reduce(
    (sum, d) => sum + (!d.isReviewDay ? (d.completedVerses || 0) : 0),
    0
  );
  return Math.min(100, Math.round((completed / total) * 100));
}

export function getStats(plan) {
  const today = getLocalToday();
  const days = plan.schedule || [];
  const totalDays = days.length;
  const completedDays = days.filter(d => d.status === 'completed').length;
  const partialDays = days.filter(d => d.status === 'partial').length;
  const skippedDays = days.filter(
    d => d.status === 'skipped' || (d.date < today && !d.isOff && d.status === 'pending')
  ).length;
  const pendingDays = days.filter(
    d => d.status === 'pending' && !d.isOff && !d.isReviewDay && d.date >= today
  ).length;
  const offCount = days.filter(d => d.isOff).length;
  const workDaysCount = totalDays - offCount;
  const avgDailyPages = workDaysCount > 0 ? (plan.totalPages || 0) / workDaysCount : 0;

  return {
    totalDays,
    completedDays,
    partialDays,
    skippedDays,
    pendingDays,
    avgDailyPages: Math.round(avgDailyPages * 10) / 10,
  };
}

export function recordDayProgressFlexible(plan, dateStr, input, note = "") {
  const basePlan = {
    ...plan,
    schedule: plan.schedule.map(day => {
      if (day.date === dateStr) {
        // في يوم التثبيت، قد يختار المستخدم أي صفحة في المصحف الكامل (١-٦٠٤)
        const refStartPage = day.isReviewDay
          ? (input.customStartPage || day.targetStartPage || 1)
          : (day.targetStartPage || plan.startPage);
        const completed = flexibleInputToVerses(input, refStartPage);
        const target = day.targetVerses || 0;
        const status = target > 0
          ? (completed >= target ? 'completed' : (completed > 0 ? 'partial' : 'pending'))
          : (completed > 0 ? 'completed' : 'pending');

        if (day.isReviewDay) {
          // ✅ فصل إنجاز التثبيت عن تقدم الصفحات الجديدة
          return {
            ...day,
            completedVerses: 0,
            consolidationVerses: completed,
            note: note !== undefined ? note : (day.note || ""),
            status,
          };
        }

        return {
          ...day,
          completedVerses: completed,
          note: note !== undefined ? note : (day.note || ""),
          status,
        };
      }
      return day;
    }),
  };

  const { plan: rescheduled } = syncPlanSchedule(basePlan);
  return {
    ...rescheduled,
    updatedAt: new Date().toISOString(),
  };
}

export function skipDayProgress(plan, dateStr) {
  const basePlan = {
    ...plan,
    schedule: plan.schedule.map(day => {
      if (day.date === dateStr) {
        return { ...day, completedVerses: 0, consolidationVerses: 0, status: 'skipped' };
      }
      return day;
    }),
  };

  const { plan: rescheduled } = syncPlanSchedule(basePlan);
  return {
    ...rescheduled,
    updatedAt: new Date().toISOString(),
  };
}

export function undoDayProgress(plan, dateStr) {
  const basePlan = {
    ...plan,
    schedule: plan.schedule.map(day => {
      if (day.date === dateStr) {
        return { ...day, completedVerses: 0, consolidationVerses: 0, note: "", status: 'pending' };
      }
      return day;
    }),
  };

  const { plan: rescheduled } = syncPlanSchedule(basePlan);
  return {
    ...rescheduled,
    updatedAt: new Date().toISOString(),
  };
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
        consolidationVerses: oldDay.consolidationVerses || 0,
        note: oldDay.note || '',
      };
    }
    return {
      ...newDay,
      status: 'pending',
      completedVerses: 0,
      consolidationVerses: 0,
      note: '',
    };
  });

  const mergedPlan = {
    ...newPlanData,
    schedule: mergedSchedule,
    updatedAt: new Date().toISOString(),
  };

  return syncPlanSchedule(mergedPlan).plan;
}

export { formatQuranUnits, smartQuranDisplay, toArabicNumbers, formatArabicDate };