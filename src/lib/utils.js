import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// استيراد دوال quranData مباشرة (لا توجد تبعية دائرية لأننا لا نستدعيها أثناء التصدير)
import { getQuranData } from './quranData';

// الدوال الأساسية
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const isIframe = window.self !== window.top;

// ============================================================
// دوال تنسيق القرآن (تعتمد على بيانات المصحف الحقيقية)
// ============================================================

/**
 * تحويل عدد الآيات إلى صفحات باستخدام بيانات المصحف الفعلية
 * @param {number} verses - عدد الآيات
 * @param {number} startPage - صفحة البداية (افتراضي 1)
 * @returns {number} عدد الصفحات
 */
function versesToPages(verses, startPage = 1) {
  const data = getQuranData();
  if (!data) {
    // في حال عدم توفر البيانات، نستخدم تقدير تقريبي 10 آيات لكل صفحة (حل احتياطي)
    return Math.max(1, Math.ceil(verses / 10));
  }

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

/**
 * تنسيق عدد الآيات إلى وحدات مقروءة (صفحات، أجزاء، أحزاب، أرباع)
 * @param {number} verses - عدد الآيات
 * @param {number} startPage - صفحة البداية (افتراضي 1)
 * @returns {string} النص المنسق
 */
export function formatQuranUnits(verses, startPage = 1) {
  if (!verses || verses === 0) return "—";
  const pages = versesToPages(verses, startPage);
  const juz = Math.floor(pages / 20);
  const remainingPages = pages % 20;

  if (juz >= 1) {
    if (remainingPages > 0) return `${juz} أجزاء و ${remainingPages} صفحات`;
    return `${juz} أجزاء`;
  }
  return `${pages} صفحة`;
}

/**
 * عرض ذكي للمقدار (أجزاء وصفحات)
 * @param {number} verses - عدد الآيات
 * @param {number} startPage - صفحة البداية (افتراضي 1)
 * @returns {string} النص المبسط
 */
export function smartQuranDisplay(verses, startPage = 1) {
  if (!verses || verses <= 0) return "—";

  const pagesCovered = versesToPages(verses, startPage);
  const juzCount = Math.floor(pagesCovered / 20);
  const remainingPages = pagesCovered % 20;

  if (juzCount >= 1) {
    return remainingPages > 0
      ? `${juzCount} أجزاء و ${remainingPages} صفحات`
      : `${juzCount} أجزاء`;
  }

  return `${pagesCovered} صفحة`;
}

/**
 * إزالة الزخارف من النص (مثل علامات التشكيل)
 * @param {string} text - النص الأصلي
 * @returns {string} النص منقى
 */
export function stripOrnament(text) {
  if (!text) return "";
  return text.replace(/^[\u06DD-\u06DF\uFD3E\uFD3F\ufdfd\ufdfa\ufdfb\ufdfc\ufdfd\ufe80-\ufefc\s]+/u, "").trim();
}