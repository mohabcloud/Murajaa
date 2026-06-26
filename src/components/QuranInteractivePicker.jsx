import React, { useState, useEffect, useMemo } from "react";
import { getQuranData, getVersesBetween, getPageTexts, initQuranData } from "@/lib/quranData";
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

  // دالة لتحويل الأرقام إلى عربية شرقية
  const toArabicNumber = (num) => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(d => arabicDigits[parseInt(d)]).join('');
  };

  // تحميل البيانات
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

  // تحديث الصفحة عند تغيير currentPage
  useEffect(() => {
    if (!quranData || loading) return;
    const texts = getPageTexts(currentPage);
    setPageTexts(texts);
    const info = quranData.pageMap[currentPage];
    setPageData(info);
    if (info?.startChapter) {
      const surahName = getSurahName(info.startChapter);
      setSurahName(surahName);
    }
  }, [currentPage, quranData, loading]);

  // ✅ عند التحميل الأول، نحدد البداية تلقائياً (أول آية في صفحة البداية)
  useEffect(() => {
    if (loading || !quranData) return;
    // تحديد البداية تلقائياً كأول آية في صفحة البداية
    const startPage = targetStartPage || planStartPage || 1;
    if (!startSelection) {
      setStartSelection({ page: startPage, verseIndex: 0 });
      setCurrentPage(startPage);
    }
  }, [loading, quranData, targetStartPage, planStartPage]);

  const getSurahName = (id) => {
    const names = {
      1: "الفاتحة", 2: "البقرة", 3: "آل عمران", 4: "النساء", 5: "المائدة",
      6: "الأنعام", 7: "الأعراف", 8: "الأنفال", 9: "التوبة", 10: "يونس",
      11: "هود", 12: "يوسف", 13: "الرعد", 14: "إبراهيم", 15: "الحجر",
      16: "النحل", 17: "الإسراء", 18: "الكهف", 19: "مريم", 20: "طه",
      21: "الأنبياء", 22: "الحج", 23: "المؤمنون", 24: "النور", 25: "الفرقان",
      26: "الشعراء", 27: "النمل", 28: "القصص", 29: "العنكبوت", 30: "الروم",
      31: "لقمان", 32: "السجدة", 33: "الأحزاب", 34: "سبأ", 35: "فاطر",
      36: "يس", 37: "الصافات", 38: "ص", 39: "الزمر", 40: "غافر",
      41: "فصلت", 42: "الشورى", 43: "الزخرف", 44: "الدخان", 45: "الجاثية",
      46: "الأحقاف", 47: "محمد", 48: "الفتح", 49: "الحجرات", 50: "ق",
      51: "الذاريات", 52: "الطور", 53: "النجم", 54: "القمر", 55: "الرحمن",
      56: "الواقعة", 57: "الحديد", 58: "المجادلة", 59: "الحشر", 60: "الممتحنة",
      61: "الصف", 62: "الجمعة", 63: "المنافقون", 64: "التغابن", 65: "الطلاق",
      66: "التحريم", 67: "الملك", 68: "القلم", 69: "الحاقة", 70: "المعارج",
      71: "نوح", 72: "الجن", 73: "المزمل", 74: "المدثر", 75: "القيامة",
      76: "الإنسان", 77: "المرسلات", 78: "النبأ", 79: "النازعات", 80: "عبس",
      81: "التكوير", 82: "الإنفطار", 83: "المطففين", 84: "الإنشقاق", 85: "البروج",
      86: "الطارق", 87: "الأعلى", 88: "الغاشية", 89: "الفجر", 90: "البلد",
      91: "الشمس", 92: "الليل", 93: "الضحى", 94: "الشرح", 95: "التين",
      96: "العلق", 97: "القدر", 98: "البينة", 99: "الزلزلة", 100: "العاديات",
      101: "القارعة", 102: "التكاثر", 103: "العصر", 104: "الهمزة", 105: "الفيل",
      106: "قريش", 107: "الماعون", 108: "الكوثر", 109: "الكافرون", 110: "النصر",
      111: "المسد", 112: "الإخلاص", 113: "الفلق", 114: "الناس"
    };
    return names[id] || `سورة ${id}`;
  };

  const handleVerseClick = (verseIndex) => {
    // إذا لم يتم تحديد بداية، نحددها
    if (!startSelection) {
      setStartSelection({ page: currentPage, verseIndex });
      setEndSelection(null);
      return;
    }

    // إذا تم تحديد بداية ونهاية، نعيد تعيين الكل (بداية جديدة)
    if (startSelection && endSelection) {
      setStartSelection({ page: currentPage, verseIndex });
      setEndSelection(null);
      return;
    }

    // إذا تم تحديد بداية فقط
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
          displayLabel: `من ص ${startPage} آية ${startVerse + 1} إلى ص ${endPage} آية ${endVerse + 1}`,
        });
      } else {
        setStartSelection({ page: currentPage, verseIndex });
        setEndSelection(null);
      }
    }
  };

  const calculateVersesBetween = (startPage, startVerse, endPage, endVerse) => {
    let count = 0;
    if (startPage === endPage) {
      return endVerse - startVerse + 1;
    }
    const startTexts = getPageTexts(startPage);
    count += startTexts.length - startVerse;
    for (let p = startPage + 1; p < endPage; p++) {
      count += getPageTexts(p).length;
    }
    count += endVerse + 1;
    return count;
  };

  const clearSelection = () => {
    setStartSelection(null);
    setEndSelection(null);
    onSelectionChange({ type: "clear", versesCount: 0 });
    // إعادة تعيين البداية تلقائياً إلى أول آية في صفحة البداية
    const startPage = targetStartPage || planStartPage || 1;
    setStartSelection({ page: startPage, verseIndex: 0 });
    setCurrentPage(startPage);
  };

  const handlePrevPage = () => {
    const minPage = planStartPage || 1;
    if (currentPage > minPage) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    const maxPage = planEndPage || 604;
    if (currentPage < maxPage) setCurrentPage(currentPage + 1);
  };

  const goToFirstPage = () => {
    setCurrentPage(planStartPage || 1);
  };

  const goToLastPage = () => {
    setCurrentPage(planEndPage || 604);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">جاري تحميل المصحف...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">فشل تحميل بيانات المصحف: {error}</div>;
  }

  if (!quranData) {
    return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات المصحف</div>;
  }

  const isVerseInRange = (verseIndex) => {
    if (!startSelection || !endSelection) return false;
    if (currentPage < startSelection.page || currentPage > endSelection.page) return false;
    if (currentPage === startSelection.page && verseIndex < startSelection.verseIndex) return false;
    if (currentPage === endSelection.page && verseIndex > endSelection.verseIndex) return false;
    return true;
  };

  const isStartVerse = (verseIndex) => {
    return startSelection && currentPage === startSelection.page && verseIndex === startSelection.verseIndex;
  };

  const isEndVerse = (verseIndex) => {
    return endSelection && currentPage === endSelection.page && verseIndex === endSelection.verseIndex;
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-4 bg-card rounded-2xl border border-border/60">
      {/* رأس الصفحة */}
      <div className="flex flex-col items-center border-b border-border/40 pb-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-lg font-bold text-foreground font-serif">
            {surahName || "القرآن الكريم"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToFirstPage} className="h-8 w-8 p-0">
              <ChevronsRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= (planStartPage || 1)} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground min-w-[60px] text-center">
              ص {currentPage}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= (planEndPage || 604)} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToLastPage} className="h-8 w-8 p-0">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {pageData?.juzu ? `الجزء ${pageData.juzu} · الحزب ${pageData.hizb}` : ""}
          <span className="mx-2">|</span>
          <span className="text-primary/70">النطاق: {planStartPage} - {planEndPage}</span>
        </div>
      </div>

      {/* حالة التحديد الحالية */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/5 rounded-xl p-3 border border-primary/10">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-muted-foreground">البداية:</span>
          {startSelection ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              ص {startSelection.page} آية {toArabicNumber(startSelection.verseIndex + 1)}
            </span>
          ) : (
            <span className="text-muted-foreground">لم تُحدد</span>
          )}
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-muted-foreground">النهاية:</span>
          {endSelection ? (
            <span className="text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
              ص {endSelection.page} آية {toArabicNumber(endSelection.verseIndex + 1)}
            </span>
          ) : (
            <span className="text-muted-foreground">لم تُحدد</span>
          )}
          {startSelection && endSelection && (
            <span className="text-primary font-medium bg-primary/10 px-3 py-1 rounded-lg">
              {endSelection.page === startSelection.page
                ? `${toArabicNumber(endSelection.verseIndex - startSelection.verseIndex + 1)} آيات`
                : `${toArabicNumber(calculateVersesBetween(startSelection.page, startSelection.verseIndex, endSelection.page, endSelection.verseIndex))} آيات`}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="text-muted-foreground hover:text-destructive h-8 px-3 text-xs gap-1"
        >
          <X className="w-3 h-3" /> إعادة تعيين
        </Button>
      </div>

      {/* ✅ نص الصفحة - كل آية في سطر منفصل */}
      <div className="bg-background border rounded-2xl p-4 md:p-6 min-h-[300px]">
        <div className="flex flex-col gap-1" dir="rtl">
          {pageTexts.length > 0 ? (
            pageTexts.map((item, index) => {
              const verseNumber = item.verseNumber;
              const inRange = isVerseInRange(index);
              const isStart = isStartVerse(index);
              const isEnd = isEndVerse(index);

              let className = "w-full text-right px-3 py-1 rounded-lg transition-all cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/30 font-serif text-lg leading-[2.2] text-foreground";

              if (isStart) {
                className += " bg-emerald-100/70 dark:bg-emerald-900/40 border-r-4 border-emerald-400";
              } else if (isEnd) {
                className += " bg-amber-100/70 dark:bg-amber-900/40 border-r-4 border-amber-400";
              } else if (inRange) {
                className += " bg-primary/5 dark:bg-primary/10";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleVerseClick(index)}
                  className={className}
                >
                  {item.text}
                  <span className="text-base text-muted-foreground mr-1 font-serif">
                    ۝{toArabicNumber(verseNumber)}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-muted-foreground text-center">لا توجد آيات في هذه الصفحة</p>
          )}
        </div>
      </div>

      {/* إرشادات */}
      <div className="text-center text-xs text-muted-foreground border-t border-border/40 pt-3">
        <p>انقر على أي آية لتحديد النهاية. البداية محددة تلقائياً.</p>
        <p className="text-primary/60">الآيات المحددة تظهر بلون مميز</p>
      </div>
    </div>
  );
}