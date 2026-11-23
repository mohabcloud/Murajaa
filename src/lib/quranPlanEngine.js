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

// ✅ إيجاد رقم الصفحة المقابل لعدد تراكمي من الآيات ابتداءً من startPage
function getPageAtVerseOffset(startPage, endPage, verseOffset) {
  const map = getPagesMap();
  let acc = 0;
  for (let p = startPage; p <= endPage; p++) {
    const vc = map[p]?.verseCount || 10;
    if (acc + vc > verseOffset) {
      return p;
    }
    acc += vc;
  }
  return endPage;
}

// ✅ حساب تاريخ الانتهاء وعدد الأيام بناءً على مقدار الورد اليومي المختار
export function calculateEndDateByPace({
  startDate,
  startPage,
  endPage,
  paceUnit = "pages",
  paceAmount = 1,
  offDays = [],
  vacationPattern = null,
}) {
  if (!startDate) return { error: "تاريخ البداية مطلوب." };
  if (offDays.length === 7) {
    return { error: "لا يمكن تحديد جميع أيام الأسبوع كإجازة." };
  }

  const safeAmount = Math.max(1, parseInt(paceAmount, 10) || 1);
  const totalPages = Math.max(1, endPage - startPage + 1);
  const totalVerses = getVersesBetween(startPage, endPage);

  let requiredWorkDays = 1;
  let pagesPerWorkDay = 1;
  let versesPerWorkDay = null;

  if (paceUnit === "verses") {
    requiredWorkDays = Math.max(1, Math.ceil(totalVerses / safeAmount));
    pagesPerWorkDay = totalPages / requiredWorkDays;
    versesPerWorkDay = safeAmount;
  } else {
    const multiplier =
      paceUnit === "juz" ? 20 :
      paceUnit === "hizb" ? 10 :
      paceUnit === "rub" ? 2.5 : 1;
    pagesPerWorkDay = safeAmount * multiplier;
    requiredWorkDays = Math.max(1, Math.ceil(totalPages / pagesPerWorkDay));
  }

  const offSet = new Set(offDays);
  const vacationEnabled = !!(vacationPattern && vacationPattern.enabled);
  const daysOn = vacationPattern?.daysOn || 2;
  const daysOff = vacationPattern?.daysOff || 2;

  let phase = 'review';
  let daysInPhase = 0;
  let workDaysFound = 0;
  let totalDaysCount = 0;
  let reviewDaysCount = 0;
  let offDaysCount = 0;

  const cur = parseLocal(startDate);
  let calculatedEndDate = toLocalDateStr(cur);

  while (workDaysFound < requiredWorkDays) {
    // ✅ السماح بمدة تصل إلى ٢٠ عاماً لدعم الأوراد القليلة (مثل آية أو آيتين يومياً على كامل المصحف)
    if (totalDaysCount > 7300) {
      return { error: "المدة المحسوبة تتجاوز ٢٠ سنة. يرجى زيادة مقدار الورد اليومي." };
    }

    totalDaysCount++;
    const dayOfWeek = cur.getDay();

    if (offSet.has(dayOfWeek)) {
      offDaysCount++;
    } else if (vacationEnabled) {
      if (phase === 'review') {
        workDaysFound++;
        daysInPhase++;
        if (daysInPhase >= daysOn) {
          phase = 'consolidation';
          daysInPhase = 0;
        }
      } else {
        reviewDaysCount++;
        daysInPhase++;
        if (daysInPhase >= daysOff) {
          phase = 'review';
          daysInPhase = 0;
        }
      }
    } else {
      workDaysFound++;
    }

    if (workDaysFound === requiredWorkDays) {
      calculatedEndDate = toLocalDateStr(cur);
      break;
    }

    cur.setDate(cur.getDate() + 1);
  }

  const endDateObj = parseLocal(calculatedEndDate);
  return {
    endDate: calculatedEndDate,
    endDayName: DAY_NAMES_AR[endDateObj.getDay()],
    requiredWorkDays,
    totalDays: totalDaysCount,
    reviewDays: reviewDaysCount,
    offDayCount: offDaysCount,
    pagesPerWorkDay,
    versesPerWorkDay,
  };
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
      cycleWorkDays.push(d);
      i++;
    } else {
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

      cycleWorkDays = [];
    }
  }
}

export function createPlan({
  name,
  planType = "review",
  planningMode = "by_date",
  paceUnit = "pages",
  paceAmount = 2,
  startDate,
  endDate,
  startPage,
  endPage,
  offDays = [],
  vacationPattern = null,
}) {
  try {
    if (!startDate) {
      return { error: "تاريخ البداية مطلوب." };
    }
    if (startPage > endPage) {
      return { error: "صفحة البداية يجب أن تكون قبل صفحة النهاية." };
    }
    if (offDays.length === 7) {
      return { error: "لا يمكن تحديد جميع أيام الأسبوع كإجازة." };
    }

    let resolvedEndDate = endDate;
    let pacePagesPerDay = null;
    let paceVersesPerDay = null;

    if (planningMode === "by_pace") {
      const paceCalc = calculateEndDateByPace({
        startDate,
        startPage,
        endPage,
        paceUnit,
        paceAmount,
        offDays,
        vacationPattern,
      });
      if (paceCalc.error) {
        return { error: paceCalc.error };
      }
      resolvedEndDate = paceCalc.endDate;
      if (paceUnit === "verses") {
        paceVersesPerDay = paceCalc.versesPerWorkDay;
      } else {
        pacePagesPerDay = paceCalc.pagesPerWorkDay;
      }
    } else if (!resolvedEndDate) {
      return { error: "تاريخ البداية والنهاية مطلوبان." };
    }

    const totalVerses = getVersesBetween(startPage, endPage);
    const totalPages = endPage - startPage + 1;
    const totalDays = daysBetween(startDate, resolvedEndDate);

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
      endDate: resolvedEndDate,
      startPage,
      endPage,
      offDays: new Set(offDays),
      totalPages,
      totalVerses,
      vacationEnabled,
      daysOn,
      daysOff,
      pacePagesPerDay,
      paceVersesPerDay,
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

    const dailyVerses = paceVersesPerDay || Math.ceil(totalVerses / workDays);
    const dailyPages = pacePagesPerDay ? Math.ceil(pacePagesPerDay) : Math.ceil(totalPages / workDays);

    const plan = {
      id: 'plan_' + Date.now(),
      name,
      planType,
      planningMode,
      paceUnit: planningMode === "by_pace" ? paceUnit : null,
      paceAmount: planningMode === "by_pace" ? Math.max(1, parseInt(paceAmount, 10) || 1) : null,
      vacationPattern: vacationEnabled ? { enabled: true, daysOn, daysOff } : { enabled: false, daysOn: 2, daysOff: 2 },
      startDate,
      endDate: resolvedEndDate,
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

function generateSchedule({
  startDate,
  endDate,
  startPage,
  endPage,
  offDays,
  totalPages,
  totalVerses,
  vacationEnabled,
  daysOn,
  daysOff,
  pacePagesPerDay = null,
  paceVersesPerDay = null,
}) {
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

  const resolvedTotalVerses = totalVerses || getVersesBetween(startPage, endPage);

  for (let i = 0; i < totalReviewDays; i++) {
    const idx = reviewDaysIndices[i];

    if (paceVersesPerDay && paceVersesPerDay > 0) {
      const startVerseOffset = i * paceVersesPerDay;
      const remainingForPlan = Math.max(0, resolvedTotalVerses - startVerseOffset);
      const versesForDay = Math.min(paceVersesPerDay, remainingForPlan);
      const endVerseOffset = Math.max(startVerseOffset, startVerseOffset + versesForDay - 1);

      const realStart = getPageAtVerseOffset(startPage, endPage, startVerseOffset);
      const realEnd = getPageAtVerseOffset(startPage, endPage, endVerseOffset);

      days[idx].targetVerses = versesForDay;
      days[idx].targetStartPage = realStart;
      days[idx].targetEndPage = realEnd;
    } else if (pacePagesPerDay && pacePagesPerDay > 0) {
      const startOffset = Math.floor(i * pacePagesPerDay);
      const endOffset = Math.min(totalPages - 1, Math.floor((i + 1) * pacePagesPerDay) - 1);
      const realStart = Math.min(endPage, startPage + startOffset);
      const realEnd = Math.min(endPage, Math.max(realStart, startPage + endOffset));

      days[idx].targetVerses = getVersesBetween(realStart, realEnd);
      days[idx].targetStartPage = realStart;
      days[idx].targetEndPage = realEnd;
    } else {
      const progress = (i + 1) / totalReviewDays;
      const endPageForDay = Math.min(endPage, startPage + Math.round(progress * totalPages) - 1);
      const startPageForDay = (i === 0) ? startPage : Math.min(endPage, startPage + Math.round((i) / totalReviewDays * totalPages));
      const realStart = Math.min(startPageForDay, endPageForDay);
      const realEnd = Math.max(startPageForDay, endPageForDay);

      days[idx].targetVerses = getVersesBetween(realStart, realEnd);
      days[idx].targetStartPage = realStart;
      days[idx].targetEndPage = realEnd;
    }
  }

  for (let d of days) {
    if (d.isOff) {
      d.targetVerses = 0;
      d.targetStartPage = null;
      d.targetEndPage = null;
    }
  }

  assignConsolidationRanges(days, startPage, endPage);

  return { schedule: days };
}

// ✅ إعادة التوزيع التلقائي للورد المتبقي وتحويل الأيام الفائتة إلى skipped (الخيار أ: تثبيت تاريخ النهاية)
export function syncPlanSchedule(plan) {
  if (!plan || !Array.isArray(plan.schedule)) {
    return { plan, changed: false };
  }

  const today = getLocalToday();
  let changed = false;

  const updatedSchedule = plan.schedule.map((day) => {
    if (day.date < today && !day.isOff && day.status === 'pending') {
      changed = true;
      return { ...day, status: 'skipped', completedVerses: 0, consolidationVerses: 0 };
    }
    return { ...day };
  });

  const totalCompletedVerses = updatedSchedule.reduce(
    (sum, d) => sum + (!d.isReviewDay ? (d.completedVerses || 0) : 0),
    0
  );
  const totalPlanVerses = plan.totalVerses || getVersesBetween(plan.startPage, plan.endPage);
  const totalPlanPages = plan.totalPages || (plan.endPage - plan.startPage + 1);

  const remainingVerses = Math.max(0, totalPlanVerses - totalCompletedVerses);
  const completedPagesCount = totalCompletedVerses > 0
    ? Math.min(totalPlanPages, versesToPagesCount(totalCompletedVerses, plan.startPage))
    : 0;
  // ✅ ضمان بقاء صفحة واحدة على الأقل طالما تبقّت آيات لم تُنجَز بعد
  const remainingPages = remainingVerses > 0
    ? Math.max(1, totalPlanPages - completedPagesCount)
    : 0;
  const nextStartPage = getPageAtVerseOffset(plan.startPage, plan.endPage, totalCompletedVerses);

  const upcomingReviewIndices = updatedSchedule
    .map((d, idx) => (!d.isOff && !d.isReviewDay && d.status === 'pending' && d.date >= today ? idx : -1))
    .filter((i) => i >= 0);

  let newDailyPages = plan.dailyPages ?? Math.ceil(totalPlanPages / Math.max(1, plan.workDays || 1));
  let newDailyVerses = plan.dailyVerses ?? Math.ceil(totalPlanVerses / Math.max(1, plan.workDays || 1));

  if (upcomingReviewIndices.length > 0) {
    const count = upcomingReviewIndices.length;

    if (remainingVerses === 0) {
      newDailyPages = 0;
      newDailyVerses = 0;
      for (const idx of upcomingReviewIndices) {
        if (updatedSchedule[idx].targetVerses !== 0) changed = true;
        updatedSchedule[idx].targetVerses = 0;
        updatedSchedule[idx].targetStartPage = null;
        updatedSchedule[idx].targetEndPage = null;
      }
    } else if (plan.planningMode === "by_pace" && plan.paceUnit === "verses" && plan.paceAmount > 0) {
      // ✅ الحفاظ على التوزيع الدقيق بالآيات لخطط الورد اليومي بالآيات
      newDailyVerses = Math.ceil(remainingVerses / count);
      newDailyPages = Math.max(1, Math.ceil(remainingPages / count));

      for (let i = 0; i < count; i++) {
        const idx = upcomingReviewIndices[i];
        const startVerseOffset = totalCompletedVerses + Math.round((i / count) * remainingVerses);
        const endVerseOffset = i === count - 1
          ? totalPlanVerses - 1
          : Math.max(startVerseOffset, totalCompletedVerses + Math.round(((i + 1) / count) * remainingVerses) - 1);

        const versesForDay = Math.max(1, endVerseOffset - startVerseOffset + 1);
        const realStart = getPageAtVerseOffset(plan.startPage, plan.endPage, startVerseOffset);
        const realEnd = getPageAtVerseOffset(plan.startPage, plan.endPage, endVerseOffset);

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
        const refStartPage = day.isReviewDay
          ? (input.customStartPage || day.targetStartPage || 1)
          : (day.targetStartPage || plan.startPage);
        const completed = flexibleInputToVerses(input, refStartPage);
        const target = day.targetVerses || 0;
        const status = target > 0
          ? (completed >= target ? 'completed' : (completed > 0 ? 'partial' : 'pending'))
          : (completed > 0 ? 'completed' : 'pending');

        if (day.isReviewDay) {
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