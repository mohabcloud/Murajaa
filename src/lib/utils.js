// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getQuranData } from './quranData';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ✅ مسافة غير قابلة للكسر — تمنع اختفاء المسافة عند حدود Bidi في RTL
const NBSP = '\u00A0';

// ✅ تحويل الأرقام إلى أرقام عربية
const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export function toArabicNumbers(num) {
  if (num === undefined || num === null || num === "") return "";
  return num.toString().split('').map(d => arabicDigits[parseInt(d)] || d).join('');
}

// ✅ أسماء الأشهر العربية
const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

// ✅ تنسيق التاريخ بالعربية (مع NBSP لضمان ظهور المسافات)
export function formatArabicDate(dateStr, opts = {}) {
  if (!dateStr) return "";
  let d;
  if (typeof dateStr === "string") {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(dateStr);
    }
  } else {
    d = dateStr;
  }
  if (!d || isNaN(d.getTime())) return String(dateStr);

  const dayAr = toArabicNumbers(d.getDate());
  const monthAr = ARABIC_MONTHS[d.getMonth()] || "";
  const yearAr = toArabicNumbers(d.getFullYear());

  if (opts.includeYear) return `${dayAr}${NBSP}${monthAr}${NBSP}${yearAr}`;
  return `${dayAr}${NBSP}${monthAr}`;
}

function versesToPages(verses, startPage = 1) {
  const data = getQuranData();
  if (!data) return Math.max(1, Math.ceil(verses / 10));

  let remaining = verses;
  let pages = 0;
  let currentPage = startPage;
  while (remaining > 0 && currentPage <= 604) {
    const vc = data.pageMap[currentPage]?.verseCount || 10;
    remaining -= vc;
    pages++;
    currentPage++;
  }
  return Math.max(1, pages);
}

// ✅ تخزين مؤقت لحدود صفحات الأجزاء الفعلية (١..٣٠) من بيانات المصحف
let _cachedJuzRanges = null;
let _cachedDataRef = null;

function getJuzPageRanges(data) {
  if (!data?.pageMap) return null;
  if (_cachedJuzRanges && _cachedDataRef === data) return _cachedJuzRanges;

  const ranges = {};
  for (let p = 1; p <= 604; p++) {
    const j = data.pageMap[p]?.juzu;
    if (!j) continue;
    if (!ranges[j]) {
      ranges[j] = { start: p, end: p, count: 1 };
    } else {
      ranges[j].end = p;
      ranges[j].count += 1;
    }
  }

  _cachedJuzRanges = ranges;
  _cachedDataRef = data;
  return ranges;
}

// ✅ حساب الأجزاء الكاملة والصفحات المتبقية بناءً على حدود المصحف الفعلية
export function getJuzBreakdown(pages, startPage = 1) {
  if (!pages || pages <= 0) return { fullJuz: 0, remainingPages: 0 };
  if (pages >= 604) return { fullJuz: 30, remainingPages: 0 };

  const data = getQuranData();
  const ranges = getJuzPageRanges(data);
  const safeStart = Math.max(1, Math.min(604, startPage || 1));
  const safeEnd = Math.min(604, safeStart + pages - 1);

  if (ranges) {
    let fullJuz = 0;
    let coveredByFullJuz = 0;

    for (let j = 1; j <= 30; j++) {
      const r = ranges[j];
      if (r && safeStart <= r.start && safeEnd >= r.end) {
        fullJuz++;
        coveredByFullJuz += r.count;
      }
    }

    let remainingPages = Math.max(0, pages - coveredByFullJuz);

    if (remainingPages >= 20) {
      fullJuz += Math.floor(remainingPages / 20);
      remainingPages = remainingPages % 20;
    }

    return { fullJuz, remainingPages };
  }

  return {
    fullJuz: Math.floor(pages / 20),
    remainingPages: pages % 20,
  };
}

// ✅ جمع عربي مع أرقام عربية
function formatArabicCount(count, singular, dual, plural, accusative) {
  if (count === 1) return singular;
  if (count === 2) return dual;
  const countAr = toArabicNumbers(count);
  if (count >= 3 && count <= 10) return `${countAr}${NBSP}${plural}`;
  return `${countAr}${NBSP}${accusative}`;
}

export function formatQuranUnits(verses, startPage = 1) {
  if (!verses || verses <= 0) return "—";

  const data = getQuranData();
  let firstPageVerses = 10;
  if (data && data.pageMap[startPage]) {
    firstPageVerses = data.pageMap[startPage].verseCount;
  }

  // ✅ استخدام (<) بدلاً من (<=) حتى تُعرض الصفحة الكاملة الواحدة كـ "صفحة واحدة"
  if (verses < firstPageVerses) {
    return formatArabicCount(verses, "آية واحدة", "آيتان", "آيات", "آية");
  }

  const pages = versesToPages(verses, startPage);
  const { fullJuz, remainingPages } = getJuzBreakdown(pages, startPage);

  if (fullJuz >= 1) {
    const juzStr = formatArabicCount(fullJuz, "جزء واحد", "جزءان", "أجزاء", "جزءاً");
    if (remainingPages > 0) {
      const pagesStr = formatArabicCount(remainingPages, "صفحة واحدة", "صفحتان", "صفحات", "صفحة");
      return `${juzStr}${NBSP}و${NBSP}${pagesStr}`;
    }
    return juzStr;
  }

  return formatArabicCount(pages, "صفحة واحدة", "صفحتان", "صفحات", "صفحة");
}

export function smartQuranDisplay(verses, startPage = 1) {
  return formatQuranUnits(verses, startPage);
}

export function stripOrnament(text) {
  if (!text) return "";
  return text.replace(/[\u06DD-\u06DF\uFD3E\uFD3F\ufdfd\ufdfa\ufdfb\ufdfc\ufdfd\ufe80-\ufefc\s]+/u, "").trim();
}