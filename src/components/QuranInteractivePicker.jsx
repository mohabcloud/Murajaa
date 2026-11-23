// src/components/QuranInteractivePicker.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getQuranData, getPageTexts, initQuranData, getSurahName } from "@/lib/quranData";
import { toArabicNumbers } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function QuranInteractivePicker({
  targetStartPage = 1,
  targetEndPage = 604,
  planStartPage = 1,
  planEndPage = 604,
  presetRange = null,
  clearTrigger = 0,
  onSelectionChange,
}) {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(targetStartPage || planStartPage || 1);
  const [startSelection, setStartSelection] = useState(null);
  const [endSelection, setEndSelection] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [surahName, setSurahName] = useState("");
  const [pageTexts, setPageTexts] = useState([]);
  const [error, setError] = useState(null);

  const quranData = useMemo(() => getQuranData(), []);

  useEffect(() => {
    async function loadData() {
      try {
        await initQuranData();
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!quranData || loading) return;
    const texts = getPageTexts(currentPage);
    setPageTexts(texts);
    const info = quranData.pageMap[currentPage];
    setPageData(info);
    if (info?.startChapter) {
      setSurahName(getSurahName(info.startChapter));
    }
  }, [currentPage, quranData, loading]);

  useEffect(() => {
    if (loading || !quranData) return;
    const startPage = targetStartPage || planStartPage || 1;
    if (!startSelection) {
      setStartSelection({ page: startPage, verseIndex: 0 });
      setCurrentPage(startPage);
    }
  }, [loading, quranData, targetStartPage, planStartPage]);

  // ✅ تطبيق النطاق المقترح عند الضغط على زر التعبئة التلقائية
  useEffect(() => {
    if (loading || !quranData || !presetRange?.triggerKey) return;
    const sPage = Math.max(planStartPage, Math.min(planEndPage, presetRange.startPage || 1));
    const ePage = Math.max(sPage, Math.min(planEndPage, presetRange.endPage || sPage));
    const endTexts = getPageTexts(ePage);
    const eVerseIdx = Math.max(0, endTexts.length - 1);

    setStartSelection({ page: sPage, verseIndex: 0 });
    setEndSelection({ page: ePage, verseIndex: eVerseIdx });
    setCurrentPage(sPage);
  }, [presetRange?.triggerKey, presetRange?.startPage, presetRange?.endPage, loading, quranData, planStartPage, planEndPage]);

  // ✅ مسح التحديد تلقائياً عند إعادة الضغط لإلغاء التعبئة
  useEffect(() => {
    if (loading || !quranData || !clearTrigger) return;
    const startPage = Math.max(planStartPage, Math.min(planEndPage, targetStartPage || planStartPage || 1));
    setStartSelection({ page: startPage, verseIndex: 0 });
    setEndSelection(null);
    setCurrentPage(startPage);
  }, [clearTrigger, loading, quranData, targetStartPage, planStartPage, planEndPage]);

  const calculateVersesBetween = useCallback(
    (startPage, startVerse, endPage, endVerse) => {
      const clampedStart = Math.max(planStartPage, Math.min(planEndPage, startPage));
      const clampedEnd = Math.max(planStartPage, Math.min(planEndPage, endPage));

      if (clampedStart === clampedEnd) return endVerse - startVerse + 1;

      let count = 0;
      const startTexts = getPageTexts(clampedStart);
      count += startTexts.length - startVerse;
      for (let p = clampedStart + 1; p < clampedEnd; p++) {
        count += getPageTexts(p).length;
      }
      count += endVerse + 1;
      return count;
    },
    [planStartPage, planEndPage]
  );

  const handleVerseClick = (verseIndex) => {
    if (currentPage < planStartPage || currentPage > planEndPage) {
      setCurrentPage(Math.max(planStartPage, Math.min(planEndPage, currentPage)));
      return;
    }

    if (!startSelection) {
      setStartSelection({ page: currentPage, verseIndex });
      setEndSelection(null);
      return;
    }

    if (startSelection && endSelection) {
      setStartSelection({ page: currentPage, verseIndex });
      setEndSelection(null);
      onSelectionChange({
        type: "verses",
        startPage: currentPage,
        startVerse: verseIndex + 1,
        endPage: currentPage,
        endVerse: verseIndex + 1,
        versesCount: 0,
        displayLabel: "",
      });
      return;
    }

    if (startSelection && !endSelection) {
      const startPage = startSelection.page;
      const startVerse = startSelection.verseIndex;
      const endPage = currentPage;
      const endVerse = verseIndex;

      if (endPage > startPage || (endPage === startPage && endVerse >= startVerse)) {
        setEndSelection({ page: endPage, verseIndex: endVerse });
        const versesCount = calculateVersesBetween(startPage, startVerse, endPage, endVerse);
        onSelectionChange({
          type: "verses",
          startPage,
          startVerse: startVerse + 1,
          endPage,
          endVerse: endVerse + 1,
          versesCount,
          displayLabel: `من ص ${toArabicNumbers(startPage)} آية ${toArabicNumbers(startVerse + 1)} إلى ص ${toArabicNumbers(endPage)} آية ${toArabicNumbers(endVerse + 1)}`,
        });
      } else {
        setStartSelection({ page: currentPage, verseIndex });
        setEndSelection(null);
      }
    }
  };

  const clearSelection = () => {
    const startPage = Math.max(planStartPage, Math.min(planEndPage, targetStartPage || planStartPage || 1));
    setStartSelection({ page: startPage, verseIndex: 0 });
    setEndSelection(null);
    setCurrentPage(startPage);
    onSelectionChange({
      type: "verses",
      startPage,
      startVerse: 1,
      endPage: startPage,
      endVerse: 1,
      versesCount: 0,
      displayLabel: "",
    });
  };

  const handlePrevPage = () => { if (currentPage > (planStartPage || 1)) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < (planEndPage || 604)) setCurrentPage(currentPage + 1); };
  const goToFirstPage = () => setCurrentPage(planStartPage || 1);
  const goToLastPage = () => setCurrentPage(planEndPage || 604);

  if (loading) return <div className="text-center py-8 text-muted-foreground">جاري تحميل المصحف...</div>;
  if (error) return <div className="text-center py-8 text-destructive">فشل تحميل بيانات المصحف: {error}</div>;
  if (!quranData) return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات المصحف</div>;

  const isVerseInRange = (verseIndex) => {
    if (!startSelection || !endSelection) return false;
    if (currentPage < startSelection.page || currentPage > endSelection.page) return false;
    if (currentPage === startSelection.page && verseIndex < startSelection.verseIndex) return false;
    if (currentPage === endSelection.page && verseIndex > endSelection.verseIndex) return false;
    return true;
  };

  const isStartVerse = (verseIndex) => startSelection && currentPage === startSelection.page && verseIndex === startSelection.verseIndex;
  const isEndVerse = (verseIndex) => endSelection && currentPage === endSelection.page && verseIndex === endSelection.verseIndex;

  return (
    <div className="space-y-3 p-0 border-0 bg-transparent sm:p-4 sm:bg-card sm:rounded-2xl sm:border sm:border-border/60 w-full max-w-full min-w-0 overflow-hidden">
      {/* رأس التنقل بين صفحات المصحف */}
      <div className="flex flex-col gap-2.5 border-b border-border/40 pb-3 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="text-base sm:text-lg font-bold text-foreground font-serif truncate leading-normal">
            {surahName || "القرآن الكريم"}
          </div>
          <div className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1.5">
            {pageData?.juzu ? <span>الجزء {toArabicNumbers(pageData.juzu)}</span> : null}
            <span>·</span>
            <span className="text-primary font-medium">
              ص {toArabicNumbers(planStartPage)} - {toArabicNumbers(planEndPage)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between bg-muted/40 rounded-xl p-1.5 gap-1 w-full">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToFirstPage} className="h-8 w-8 p-0 rounded-lg" title="أول صفحة">
              <ChevronsRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= (planStartPage || 1)} className="h-8 w-8 p-0 rounded-lg" title="الصفحة السابقة">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <span className="text-sm font-bold text-foreground px-2 text-center whitespace-nowrap">
            ص {toArabicNumbers(currentPage)}
          </span>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= (planEndPage || 604)} className="h-8 w-8 p-0 rounded-lg" title="الصفحة التالية">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToLastPage} className="h-8 w-8 p-0 rounded-lg" title="آخر صفحة">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* مؤشر البداية والنهاية */}
      <div className="flex flex-col gap-2 bg-primary/5 rounded-xl p-3 border border-primary/10 min-w-0">
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          <div className="bg-background/80 rounded-lg p-2 border border-border/50 flex flex-col items-center text-center gap-1 min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground">البداية</span>
            {startSelection ? (
              <span className="text-primary font-semibold bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20 whitespace-nowrap">
                ص {toArabicNumbers(startSelection.page)} آية {toArabicNumbers(startSelection.verseIndex + 1)}
              </span>
            ) : (
              <span className="text-muted-foreground whitespace-nowrap">لم تُحدد</span>
            )}
          </div>

          <div className="bg-background/80 rounded-lg p-2 border border-border/50 flex flex-col items-center text-center gap-1 min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground">النهاية</span>
            {endSelection ? (
              <span className="text-accent font-semibold bg-accent/10 px-2.5 py-0.5 rounded-md border border-accent/20 whitespace-nowrap">
                ص {toArabicNumbers(endSelection.page)} آية {toArabicNumbers(endSelection.verseIndex + 1)}
              </span>
            ) : (
              <span className="text-muted-foreground py-0.5 whitespace-nowrap">لم تُحدد</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-primary/10">
          {startSelection && endSelection ? (
            <span className="text-xs text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
              {endSelection.page === startSelection.page
                ? `${toArabicNumbers(endSelection.verseIndex - startSelection.verseIndex + 1)} آيات`
                : `${toArabicNumbers(calculateVersesBetween(startSelection.page, startSelection.verseIndex, endSelection.page, endSelection.verseIndex))} آيات`}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">انقر على آية النهاية بالأسفل</span>
          )}

          <Button variant="ghost" size="sm" onClick={clearSelection} className="text-muted-foreground hover:text-destructive h-7 px-2 text-xs gap-1 ms-auto">
            <X className="w-3 h-3" /> إعادة تعيين
          </Button>
        </div>
      </div>

      {/* صندوق عرض الآيات */}
      <div className="bg-background border rounded-2xl p-3 sm:p-5 max-h-[38vh] overflow-y-auto overflow-x-hidden min-w-0">
        <div className="flex flex-col gap-1.5 pe-1 min-w-0" dir="rtl">
          {pageTexts.length > 0 ? (
            pageTexts.map((item, index) => {
              const inRange = isVerseInRange(index);
              const isStart = isStartVerse(index);
              const isEnd = isEndVerse(index);

              let className = "w-full text-right px-2.5 py-1.5 rounded-lg transition-all cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/30 font-serif text-base sm:text-lg leading-[2.1] text-foreground break-words";
              if (isStart) className += " bg-primary/10 border-s-4 border-primary";
              else if (isEnd) className += " bg-accent/10 border-s-4 border-accent";
              else if (inRange) className += " bg-primary/5";

              return (
                <button key={index} type="button" onClick={() => handleVerseClick(index)} className={className}>
                  <span>{item.text}</span>
                  <span className="text-sm sm:text-base text-muted-foreground ms-1.5 font-serif inline-block">
                    ۝{toArabicNumbers(item.verseNumber)}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-muted-foreground text-center text-sm">لا توجد آيات في هذه الصفحة</p>
          )}
        </div>
      </div>
    </div>
  );
}