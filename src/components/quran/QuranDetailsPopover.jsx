// src/components/quran/QuranDetailsPopover.jsx
import React, { useState } from "react";
import { Info, BookOpen } from "lucide-react";
import { getVersesBetween, getPageRange, getQuranData, getSurahName, getSurahList } from "@/lib/quranData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function QuranDetailsPopover({ verses, startPage = 1, className = "" }) {
  const [open, setOpen] = useState(false);
  if (!verses || verses <= 0) return null;

  const endPageExact = findEndPage(verses, startPage);
  const pagesCovered = Math.max(0, endPageExact - startPage);
  const exactVerses = getVersesBetween(startPage, endPageExact);

  const startRange = getPageRange(startPage);
  const endRange = getPageRange(endPageExact);

  const juzCount = Math.floor(pagesCovered / 20);
  const remainingPages = pagesCovered % 20;

  // جمع السور التي تمر بها الخطة باستخدام getSurahList
  const surahsInRange = getSurahsInRange(startPage, endPageExact);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-5 h-5 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors inline-flex"
          title="تفاصيل إضافية"
        >
          <Info className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start" side="bottom" dir="rtl">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/40">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">تفاصيل النطاق</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">الآيات</span>
            <span className="font-semibold text-foreground">{exactVerses}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">الصفحات</span>
            <span className="font-semibold text-foreground">{pagesCovered}</span>
          </div>

          {juzCount >= 1 && (
            <>
              <div className="border-t border-border/40 pt-2 mt-2" />
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">الأجزاء</span>
                <span className="font-semibold text-foreground">
                  {juzCount >= 1
                    ? remainingPages > 0
                      ? `${juzCount} أجزاء و ${remainingPages} صفحات`
                      : `${juzCount} أجزاء`
                    : "أقل من جزء"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">الأحزاب</span>
                <span className="font-semibold text-foreground">{juzCount * 2}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">الأرباع</span>
                <span className="font-semibold text-foreground">{juzCount * 8}</span>
              </div>
            </>
          )}

          {surahsInRange.length > 0 && (
            <>
              <div className="border-t border-border/40 pt-2 mt-2" />
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">عدد السور</span>
                <span className="font-semibold text-foreground">{surahsInRange.length}</span>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {surahsInRange.slice(0, 8).map((s, i) => (
                  <span key={i} className="inline-block bg-muted/40 rounded-md px-2 py-0.5 ml-1 mb-1">
                    {s}
                  </span>
                ))}
                {surahsInRange.length > 8 && <span className="text-muted-foreground">...وغيرها</span>}
              </div>
            </>
          )}

          <div className="border-t border-border/40 pt-2 mt-2" />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">من (جزء/صفحة)</span>
            <span className="font-semibold text-foreground">
              {startRange ? `ج${startRange.juzu} · ص${startPage}` : `ص${startPage}`}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">إلى (جزء/صفحة)</span>
            <span className="font-semibold text-foreground">
              {endRange ? `ج${endRange.juzu} · ص${endPageExact}` : `ص${endPageExact}`}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** إيجاد رقم الصفحة النهائية بعد استهلاك عدد من الآيات ابتداء من startPage */
function findEndPage(verses, startPage) {
  const d = getQuranData();
  if (!d) return Math.min(604, startPage + Math.ceil(verses / 10));

  let remaining = verses;
  let currentPage = startPage;

  while (remaining > 0 && currentPage <= 604) {
    const vc = d.pageMap[currentPage]?.verseCount || 10;
    remaining -= vc;
    currentPage++;
  }

  return Math.min(604, currentPage);
}

/** جمع أسماء السور التي تمر بها الخطة بين صفحتين */
function getSurahsInRange(startPage, endPage) {
  const d = getQuranData();
  if (!d) return [];

  // استخدام getSurahList للحصول على أسماء السور
  const surahList = d.surahList || [];
  const surahs = new Set();

  // تحديد السور التي تقع في النطاق
  for (const surah of surahList) {
    const sStart = surah.startPage || 1;
    const sEnd = surah.endPage || 604;
    // إذا كان نطاق السورة يتقاطع مع النطاق المطلوب
    if (sStart <= endPage && sEnd >= startPage) {
      surahs.add(surah.name);
    }
  }

  return Array.from(surahs);
}