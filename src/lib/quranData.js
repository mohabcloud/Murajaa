/**
 * محمل بيانات المصحف - يستخدم الملف المحلي مباشرة
 */

import quranDataRaw from "../../quran_complete_data.json";

const CACHE_KEY = "quran_processed_data_v2";
let _data = null;
let _loadingPromise = null;

function processRawData(raw) {
  const entries = Array.isArray(raw) ? raw : [];
  if (!entries.length) throw new Error("بيانات المصحف فارغة");

  const pages = {};
  const pageTexts = {}; // سيخزن { text, verseNumber } لكل آية
  const quarterNames = {};

  for (let i = 1; i <= 604; i++) {
    pages[i] = { page: i, verseCount: 0, startChapter: null, startVerse: null, endChapter: null, endVerse: null, juzu: null, hizb: null, quarter: null };
    pageTexts[i] = [];
  }

  for (const e of entries) {
    const p = e.page;
    if (!pages[p]) continue;

    // تخزين النص مع رقم الآية في السورة
    pageTexts[p].push({
      text: e.text || "",
      verseNumber: e.ayah_number,
    });

    pages[p].verseCount++;
    if (pages[p].startChapter === null) {
      pages[p].startChapter = e.surah_number;
      pages[p].startVerse = e.ayah_number;
      pages[p].juzu = e.juzu;
      pages[p].hizb = e.hizb;
      pages[p].quarter = e.global_quarter_number;
    }
    pages[p].endChapter = e.surah_number;
    pages[p].endVerse = e.ayah_number;
  }

  const pagesArray = [];
  for (let i = 1; i <= 604; i++) {
    pagesArray.push(pages[i]);
  }

  const quarterSeen = {};
  for (const e of entries) {
    const q = e.global_quarter_number;
    if (!quarterSeen[q]) {
      quarterSeen[q] = true;
      quarterNames[q] = e.text || "";
    }
  }

  const totalVerses = pagesArray.reduce((s, p) => s + p.verseCount, 0);

  let cumulativeVerses = 0;
  const pageCumulative = {};
  for (let i = 1; i <= 604; i++) {
    pageCumulative[i] = cumulativeVerses;
    cumulativeVerses += pages[i].verseCount;
  }
  pageCumulative[605] = cumulativeVerses;

  const juzBoundaries = {};
  for (const e of entries) {
    if (!juzBoundaries[e.juzu]) {
      juzBoundaries[e.juzu] = { page: e.page, surah: e.surah_number };
    }
  }

  const hizbBoundaries = {};
  for (const e of entries) {
    if (!hizbBoundaries[e.hizb]) {
      hizbBoundaries[e.hizb] = { page: e.page, surah: e.surah_number };
    }
  }

  const versesPerJuz = totalVerses / 30;
  const versesPerHizb = totalVerses / 60;
  const versesPerRub = totalVerses / 240;
  const avgVersesPerPage = totalVerses / 604;

  return {
    pages: pagesArray,
    pageMap: pages,
    pageTexts,
    pageCumulative,
    quarterNames,
    juzBoundaries,
    hizbBoundaries,
    totalVerses,
    totalPages: 604,
    totalJuz: 30,
    totalHizb: 60,
    totalRub: 240,
    versesPerJuz,
    versesPerHizb,
    versesPerRub,
    avgVersesPerPage,
  };
}

export async function initQuranData() {
  if (_data) return _data;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.pageTexts && parsed.pageTexts[1]?.length > 0 && typeof parsed.pageTexts[1][0] === 'object') {
          _data = parsed;
          return _data;
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    try {
      _data = processRawData(quranDataRaw);
      localStorage.setItem(CACHE_KEY, JSON.stringify(_data));
      return _data;
    } catch (e) {
      console.error("فشل في معالجة الملف المحلي:", e);
      throw e;
    }
  })();

  return _loadingPromise;
}

export function getQuranData() {
  return _data;
}

// ==================== دوال الاستعلام ====================

export function getPageVerseCount(pageNum) {
  const d = _data;
  if (!d || !d.pageMap[pageNum]) return 10;
  return d.pageMap[pageNum].verseCount;
}

export function getPageRange(pageNum) {
  const d = _data;
  if (!d || !d.pageMap[pageNum]) return null;
  const p = d.pageMap[pageNum];
  return { startChapter: p.startChapter, startVerse: p.startVerse, endChapter: p.endChapter, endVerse: p.endVerse, juzu: p.juzu, hizb: p.hizb, quarter: p.quarter };
}

export function getVersesBetween(startPage, endPage) {
  const d = _data;
  if (!d) return (endPage - startPage + 1) * 10;
  let total = 0;
  for (let p = startPage; p <= endPage; p++) {
    total += (d.pageMap[p]?.verseCount || 10);
  }
  return total;
}

export function getCumulativeVerses(pageNum) {
  const d = _data;
  if (!d) return (pageNum - 1) * 10;
  return d.pageCumulative[pageNum] || 0;
}

export function getQuarterName(quarterNumber) {
  const d = _data;
  if (!d) return "";
  return d.quarterNames[quarterNumber] || "";
}

export function getQuarterNumber(pageNum) {
  const d = _data;
  if (!d || !d.pageMap[pageNum]) return null;
  return d.pageMap[pageNum].quarter;
}

export function getPageTexts(pageNum) {
  const d = _data;
  if (!d || !d.pageTexts || !d.pageTexts[pageNum]) return [];
  return d.pageTexts[pageNum];
}