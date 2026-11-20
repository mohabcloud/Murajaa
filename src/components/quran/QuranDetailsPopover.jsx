// src/components/quran/QuranDetailsPopover.jsx
import React, { useMemo } from "react";
import { Info, BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getQuranData, getSurahList } from "@/lib/quranData";
import { smartQuranDisplay, versesToPages, toArabicNumbers } from "@/lib/quranPlanEngine";

// ✅ إزالة الإزاحة السفلية لتتوسط أيقونة Info النص تماماً في جميع المواضع
export const INFO_ICON_TRIGGER_CLASSES =
  "inline-flex items-center justify-center w-4 h-4 text-muted-foreground " +
  "transition-colors duration-150 cursor-pointer shrink-0 select-none " +
  "[@media(hover:hover)]:hover:text-primary " +
  "data-[state=open]:text-primary " +
  "focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]";

export default function QuranDetailsPopover({ verses = 0, startPage = 1 }) {
  const details = useMemo(() => {
    const quranData = getQuranData();
    const surahList = quranData ? getSurahList() : [];
    const safeStart = Math.max(1, Math.min(604, startPage || 1));
    const totalPages = verses > 0 ? Math.max(1, versesToPages(verses, safeStart)) : 0;
    const safeEnd = totalPages > 0 ? Math.min(604, safeStart + totalPages - 1) : safeStart;

    const hizbCount = totalPages > 0 ? Math.max(1, Math.round((totalPages / 604) * 60)) : 0;
    const rubCount = totalPages > 0 ? Math.max(1, Math.round((totalPages / 604) * 240)) : 0;

    const surahsInRange = totalPages > 0
      ? surahList.filter((s) => s.endPage >= safeStart && s.startPage <= safeEnd)
      : [];

    const startJuz = quranData?.pageMap?.[safeStart]?.juzu || 1;
    const endJuz = quranData?.pageMap?.[safeEnd]?.juzu || 1;

    return {
      verses,
      totalPages,
      juzDisplay: smartQuranDisplay(verses, safeStart),
      hizbCount,
      rubCount,
      surahsInRange,
      startJuz,
      endJuz,
      safeStart,
      safeEnd,
    };
  }, [verses, startPage]);

  if (!verses || verses <= 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="تفاصيل النطاق"
          className={INFO_ICON_TRIGGER_CLASSES}
        >
          <Info className="w-4 h-4 stroke-[1.75]" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" className="w-72 p-3.5 rounded-2xl text-xs" dir="rtl">
        <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-border/50">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          <span className="font-bold text-sm text-foreground">تفاصيل النطاق</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الآيات</span>
            <span className="font-bold text-foreground">{toArabicNumbers(details.verses)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الصفحات</span>
            <span className="font-bold text-foreground">{toArabicNumbers(details.totalPages)}</span>
          </div>

          <div className="border-t border-border/40 my-1.5" />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الأجزاء</span>
            <span className="font-bold text-foreground">{details.juzDisplay}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الأحزاب</span>
            <span className="font-bold text-foreground">{toArabicNumbers(details.hizbCount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الأرباع</span>
            <span className="font-bold text-foreground">{toArabicNumbers(details.rubCount)}</span>
          </div>

          <div className="border-t border-border/40 my-1.5" />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-muted-foreground">عدد السور</span>
              <span className="font-bold text-foreground">{toArabicNumbers(details.surahsInRange.length)}</span>
            </div>
            {details.surahsInRange.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {details.surahsInRange.slice(0, 8).map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-[11px]"
                  >
                    {s.name}
                  </span>
                ))}
                {details.surahsInRange.length > 8 && (
                  <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px]">
                    ...وغيرها
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border/40 my-1.5" />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">من (جزء/صفحة)</span>
            <span className="font-semibold text-foreground">
              ج{toArabicNumbers(details.startJuz)} · ص{toArabicNumbers(details.safeStart)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">إلى (جزء/صفحة)</span>
            <span className="font-semibold text-foreground">
              ج{toArabicNumbers(details.endJuz)} · ص{toArabicNumbers(details.safeEnd)}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}