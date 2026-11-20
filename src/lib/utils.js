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

  // ✅ NBSP بين جميع الأجزاء
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

// ✅ جمع عربي مع أرقام عربية
function formatArabicCount(count, singular, dual, plural, accusative) {
  if (count === 1) return singular;
  if (count === 2) return dual;
  const countAr = toArabicNumbers(count);
  if (count >= 3 && count <= 10) return `${countAr}${NBSP}${plural}`;
  return `${countAr}${NBSP}${accusative}`;
}

export function formatQuranUnits(verses, startPage = 1) {
  if (!verses || verses === 0) return "—";

  const data = getQuranData();
  let firstPageVerses = 10;
  if (data && data.pageMap[startPage]) {
    firstPageVerses = data.pageMap[startPage].verseCount;
  }

  if (verses <= firstPageVerses) {
    return formatArabicCount(verses, "آية واحدة", "آيتان", "آيات", "آية");
  }

  const pages = versesToPages(verses, startPage);
  const juz = Math.floor(pages / 20);
  const remainingPages = pages % 20;

  if (juz >= 1) {
    const juzStr = formatArabicCount(juz, "جزء واحد", "جزءان", "أجزاء", "جزءاً");
    if (remainingPages > 0) {
      const pagesStr = formatArabicCount(remainingPages, "صفحة واحدة", "صفحتان", "صفحات", "صفحة");
      return `${juzStr}${NBSP}و${NBSP}${pagesStr}`;
    }
    return juzStr;
  }

  return formatArabicCount(pages, "صفحة واحدة", "صفحتان", "صفحات", "صفحة");
}

export function smartQuranDisplay(verses, startPage = 1) {
  if (!verses || verses <= 0) return "—";

  const data = getQuranData();
  let firstPageVerses = 10;
  if (data && data.pageMap[startPage]) {
    firstPageVerses = data.pageMap[startPage].verseCount;
  }

  if (verses <= firstPageVerses) {
    return formatArabicCount(verses, "آية واحدة", "آيتان", "آيات", "آية");
  }

  const pagesCovered = versesToPages(verses, startPage);
  const juzCount = Math.floor(pagesCovered / 20);
  const remainingPages = pagesCovered % 20;

  if (juzCount >= 1) {
    const juzStr = formatArabicCount(juzCount, "جزء واحد", "جزءان", "أجزاء", "جزءاً");
    if (remainingPages > 0) {
      const pagesStr = formatArabicCount(remainingPages, "صفحة واحدة", "صفحتان", "صفحات", "صفحة");
      return `${juzStr}${NBSP}و${NBSP}${pagesStr}`;
    }
    return juzStr;
  }

  return formatArabicCount(pagesCovered, "صفحة واحدة", "صفحتان", "صفحات", "صفحة");
}

export function stripOrnament(text) {
  if (!text) return "";
  return text.replace(/[\u06DD-\u06DF\uFD3E\uFD3F\ufdfd\ufdfa\ufdfb\ufdfc\ufdfd\ufe80-\ufefc\s]+/u, "").trim();
}