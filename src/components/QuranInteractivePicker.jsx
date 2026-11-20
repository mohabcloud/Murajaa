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
        // ✅ استخدام الأرقام العربية في displayLabel
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
    // ✅ إزالة max-h-[70vh] overflow-y-auto لمنع ازدواج شريط التمرير داخل FlexibleEntryPanel
    <div className="space-y-4 p-4 bg-card rounded-2xl border border-border/60">
      <div className="flex flex-col items-center border-b border-border/40 pb-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-lg font-bold text-foreground font-serif">{surahName || "القرآن الكريم"}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToFirstPage} className="h-8 w-8 p-0">
              <ChevronsRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= (planStartPage || 1)} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground min-w-[60px] text-center">ص {toArabicNumbers(currentPage)}</span>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= (planEndPage || 604)} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToLastPage} className="h-8 w-8 p-0">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {pageData?.juzu ? `الجزء ${toArabicNumbers(pageData.juzu)} · الحزب ${toArabicNumbers(pageData.hizb)}` : ""}
          <span className="mx-2">|</span>
          <span className="text-primary font-medium">
            النطاق: {toArabicNumbers(planStartPage)} - {toArabicNumbers(planEndPage)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/5 rounded-xl p-3 border border-primary/10">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-muted-foreground">البداية:</span>
          {startSelection ? (
            <span className="text-primary font-semibold bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
              ص {toArabicNumbers(startSelection.page)} آية {toArabicNumbers(startSelection.verseIndex + 1)}
            </span>
          ) : (
            <span className="text-muted-foreground">لم تُحدد</span>
          )}
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-muted-foreground">النهاية:</span>
          {endSelection ? (
            <span className="text-accent font-semibold bg-accent/10 px-3 py-1 rounded-lg border border-accent/20">
              ص {toArabicNumbers(endSelection.page)} آية {toArabicNumbers(endSelection.verseIndex + 1)}
            </span>
          ) : (
            <span className="text-muted-foreground">لم تُحدد</span>
          )}
          {startSelection && endSelection && (
            <span className="text-primary font-bold bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
              {endSelection.page === startSelection.page
                ? `${toArabicNumbers(endSelection.verseIndex - startSelection.verseIndex + 1)} آيات`
                : `${toArabicNumbers(calculateVersesBetween(startSelection.page, startSelection.verseIndex, endSelection.page, endSelection.verseIndex))} آيات`}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={clearSelection} className="text-muted-foreground hover:text-destructive h-8 px-3 text-xs gap-1">
          <X className="w-3 h-3" /> إعادة تعيين
        </Button>
      </div>

      <div className="bg-background border rounded-2xl p-4 md:p-6 min-h-[300px]">
        <div className="flex flex-col gap-1" dir="rtl">
          {pageTexts.length > 0 ? (
            pageTexts.map((item, index) => {
              const inRange = isVerseInRange(index);
              const isStart = isStartVerse(index);
              const isEnd = isEndVerse(index);

              let className = "w-full text-right px-3 py-1 rounded-lg transition-all cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/30 font-serif text-lg leading-[2.2] text-foreground";
              if (isStart) className += " bg-primary/10 border-r-4 border-primary";
              else if (isEnd) className += " bg-accent/10 border-r-4 border-accent";
              else if (inRange) className += " bg-primary/5";

              return (
                <button key={index} onClick={() => handleVerseClick(index)} className={className}>
                  {item.text}
                  <span className="text-base text-muted-foreground mr-1 font-serif">۝{toArabicNumbers(item.verseNumber)}</span>
                </button>
              );
            })
          ) : (
            <p className="text-muted-foreground text-center">لا توجد آيات في هذه الصفحة</p>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground border-t border-border/40 pt-3">
        <p>انقر على أي آية لتحديد النهاية. البداية محددة تلقائياً.</p>
        <p className="text-primary/70 font-medium">الآيات المحددة تظهر بلون مميز</p>
      </div>
    </div>
  );
}