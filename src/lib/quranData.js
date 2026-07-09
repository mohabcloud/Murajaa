// src/lib/quranData.js
/**
 * محمل بيانات المصحف - يستخدم بيانات من rn0x/Quran-Data
 * الترخيص: MIT
 */

import quranDataRaw from "../../quran_complete_data.json";

const CACHE_KEY = "quran_processed_data_v2";
let _data = null;
let _loadingPromise = null;

/**
 * معالجة البيانات الخام من ملف mainDataQuran.json
 */
function processRawData(raw) {
  console.log("🔍 Raw data type:", Array.isArray(raw) ? "Array" : typeof raw);
  console.log("🔍 Raw data length:", raw?.length || "N/A");

  let surahs = Array.isArray(raw) ? raw : (raw?.data || raw?.surahs || []);

  if (!Array.isArray(surahs) || surahs.length === 0) {
    console.warn("⚠️ لم يتم العثور على بيانات السور. تأكد من هيكل الملف.");
    if (typeof raw === 'object' && raw !== null) {
      for (const key of Object.keys(raw)) {
        if (Array.isArray(raw[key]) && raw[key].length > 100) {
          console.log(`🔍 تم العثور على مصفوفة كبيرة في المفتاح "${key}" بطول ${raw[key].length}`);
          surahs = raw[key];
          break;
        }
      }
    }
  }

  if (!Array.isArray(surahs) || surahs.length === 0) {
    throw new Error("بيانات المصحف فارغة أو غير صالحة. تأكد من هيكل الملف.");
  }

  console.log(`✅ تم العثور على ${surahs.length} سورة.`);

  const pages = {};
  const pageTexts = {};
  const quarterNames = {};
  const surahNames = {};
  const surahVersesCount = {};
  const surahList = [];

  for (let i = 1; i <= 604; i++) {
    pages[i] = {
      page: i,
      verseCount: 0,
      startChapter: null,
      startVerse: null,
      endChapter: null,
      endVerse: null,
      juzu: null,
      hizb: null,
      quarter: null,
    };
    pageTexts[i] = [];
  }

  let allVerses = [];

  for (const surah of surahs) {
    const surahId = surah.number || surah.id || 0;
    if (!surahId) continue;

    let surahName = "سورة " + surahId;
    if (surah.name) {
      if (typeof surah.name === 'string') surahName = surah.name;
      else if (surah.name.ar) surahName = surah.name.ar;
      else if (surah.name.en) surahName = surah.name.en;
    }

    const versesCount = surah.verses_count || surah.verses?.length || 0;
    surahNames[surahId] = surahName;
    surahVersesCount[surahId] = versesCount;

    let startPage = null;
    let endPage = null;
    const verses = surah.verses || [];

    for (const verse of verses) {
      const pageNum = verse.page || 1;
      if (startPage === null || pageNum < startPage) startPage = pageNum;
      if (endPage === null || pageNum > endPage) endPage = pageNum;

      let verseText = "";
      if (verse.text) {
        if (typeof verse.text === 'string') verseText = verse.text;
        else if (verse.text.ar) verseText = verse.text.ar;
        else if (verse.text.en) verseText = verse.text.en;
      }

      allVerses.push({
        surah_number: surahId,
        surah_name: surahName,
        ayah_number: verse.number || 0,
        page: pageNum,
        juzu: verse.juz || 0,
        hizb: verse.hizb || 0,
        quarter: verse.quarter || 0,
        text: verseText || "",
        sajda: verse.sajda || false,
      });
    }

    if (startPage !== null && endPage !== null) {
      surahList.push({
        id: surahId,
        name: surahName,
        startPage: startPage,
        endPage: endPage,
        versesCount: versesCount,
      });
    }
  }

  console.log(`✅ تم جمع ${allVerses.length} آية من ${surahList.length} سورة.`);

  allVerses.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.ayah_number - b.ayah_number;
  });

  for (const e of allVerses) {
    const p = e.page;
    if (!pages[p]) continue;

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
      pages[p].quarter = e.quarter;
    }
    pages[p].endChapter = e.surah_number;
    pages[p].endVerse = e.ayah_number;
  }

  const quarterSeen = {};
  for (const e of allVerses) {
    const q = e.quarter;
    if (q && !quarterSeen[q]) {
      quarterSeen[q] = true;
      const text = e.text || "";
      quarterNames[q] = text.substring(0, 50) + (text.length > 50 ? "..." : "");
    }
  }

  const totalVerses = allVerses.length;
  const pageCumulative = {};
  let cumulativeVerses = 0;
  for (let i = 1; i <= 604; i++) {
    pageCumulative[i] = cumulativeVerses;
    cumulativeVerses += pages[i]?.verseCount || 0;
  }
  pageCumulative[605] = cumulativeVerses;

  const juzBoundaries = {};
  const hizbBoundaries = {};
  for (const e of allVerses) {
    if (!juzBoundaries[e.juzu]) {
      juzBoundaries[e.juzu] = { page: e.page, surah: e.surah_number };
    }
    if (!hizbBoundaries[e.hizb]) {
      hizbBoundaries[e.hizb] = { page: e.page, surah: e.surah_number };
    }
  }

  const totalPages = 604;
  const totalJuz = 30;
  const totalHizb = 60;
  const totalRub = 240;
  const versesPerJuz = totalVerses / 30;
  const versesPerHizb = totalVerses / 60;
  const versesPerRub = totalVerses / 240;
  const avgVersesPerPage = totalVerses / 604;

  const result = {
    pages: Object.values(pages),
    pageMap: pages,
    pageTexts,
    pageCumulative,
    quarterNames,
    juzBoundaries,
    hizbBoundaries,
    surahNames,
    surahVersesCount,
    surahList,
    totalVerses,
    totalPages,
    totalJuz,
    totalHizb,
    totalRub,
    versesPerJuz,
    versesPerHizb,
    versesPerRub,
    avgVersesPerPage,
  };

  console.log("📊 النتيجة النهائية:", {
    totalVerses: result.totalVerses,
    surahCount: result.surahList.length,
    pageCount: Object.keys(result.pageMap).length,
  });

  return result;
}

export async function initQuranData() {
  if (_data) return _data;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log("🧹 تم حذف الكاش القديم.");
    } catch (e) {}

    try {
      console.log("⏳ جاري معالجة بيانات المصحف...");
      _data = processRawData(quranDataRaw);
      console.log(`✅ تمت المعالجة بنجاح: ${_data.totalVerses} آية، ${_data.surahList.length} سورة.`);
      localStorage.setItem(CACHE_KEY, JSON.stringify(_data));
      return _data;
    } catch (e) {
      console.error("❌ فشل في معالجة الملف المحلي:", e);
      throw e;
    }
  })();

  return _loadingPromise;
}

// ✅ جميع التصديرات المطلوبة
export function getQuranData() {
  return _data;
}

export function getPageVerseCount(pageNum) {
  const d = _data;
  if (!d || !d.pageMap[pageNum]) return 10;
  return d.pageMap[pageNum].verseCount;
}

export function getPageRange(pageNum) {
  const d = _data;
  if (!d || !d.pageMap[pageNum]) return null;
  const p = d.pageMap[pageNum];
  return {
    startChapter: p.startChapter,
    startVerse: p.startVerse,
    endChapter: p.endChapter,
    endVerse: p.endVerse,
    juzu: p.juzu,
    hizb: p.hizb,
    quarter: p.quarter,
  };
}

export function getVersesBetween(startPage, endPage) {
  const d = _data;
  if (!d) return (endPage - startPage + 1) * 10;
  let total = 0;
  for (let p = startPage; p <= endPage; p++) {
    total += d.pageMap[p]?.verseCount || 10;
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

export function getSurahName(surahId) {
  const d = _data;
  if (!d || !d.surahNames) return `سورة ${surahId}`;
  return d.surahNames[surahId] || `سورة ${surahId}`;
}

export function getSurahVersesCount(surahId) {
  const d = _data;
  if (!d || !d.surahVersesCount) return 0;
  return d.surahVersesCount[surahId] || 0;
}

export function getSurahList() {
  const d = _data;
  if (!d || !d.surahList) return [];
  return d.surahList;
}