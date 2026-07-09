// src/components/quran/CreatePlanForm.jsx
// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Calendar, Hash, Coffee, Sparkles, Layers, Type, Info, ChevronDown, Search, Pencil } from "lucide-react";
import { createPlan, mergePlanWithProgress, formatQuranUnits, smartQuranDisplay, getLocalToday } from "@/lib/quranPlanEngine";
import { getVersesBetween, getQuranData, getSurahList, getSurahVersesCount } from "@/lib/quranData";
import QuranDetailsPopover from "@/components/quran/QuranDetailsPopover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArabicDatePicker } from "@/components/ui/arabic-date-picker";

function MobileWrapper({ children }) {
  return <div className="w-full min-w-0">{children}</div>;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function CreatePlanForm({
  onPlanCreated,
  onCancel,
  existingPlans,
  initialPlan = null,
  isEditing = false,
}) {
  const quranData = useMemo(() => getQuranData(), []);

  const surahList = useMemo(() => {
    if (!quranData) return [];
    return getSurahList();
  }, [quranData]);

  const getMaxAyahInSurah = useCallback((surahId) => {
    return getSurahVersesCount(surahId);
  }, []);

  const today = useMemo(() => getLocalToday(), []);

  const getInitialData = useCallback(() => {
    if (!initialPlan) {
      return {
        name: "",
        startDate: today,
        endDate: "",
        startPage: 1,
        endPage: 604,
        offDays: [5],
      };
    }
    return {
      name: initialPlan.name || "",
      startDate: initialPlan.startDate || today,
      endDate: initialPlan.endDate || "",
      startPage: initialPlan.startPage || 1,
      endPage: initialPlan.endPage || 604,
      offDays: initialPlan.offDays || [5],
    };
  }, [initialPlan, today]);

  const initialData = getInitialData();

  const [formData, setFormData] = useState({
    name: initialData.name,
    startDate: initialData.startDate,
    endDate: initialData.endDate,
    startPage: initialData.startPage,
    endPage: initialData.endPage,
    offDays: initialData.offDays,
  });

  useEffect(() => {
    if (!formData.startDate) {
      setFormData((prev) => ({
        ...prev,
        startDate: today,
      }));
    }
  }, [today]);

  const [rangeType, setRangeType] = useState("surah");

  // ===== States for different range types =====
  const [selectedStartSurah, setSelectedStartSurah] = useState(() => {
    if (initialPlan && initialPlan.startPage) {
      const found = surahList.find((s) => s.startPage <= initialPlan.startPage && s.endPage >= initialPlan.startPage);
      return found ? found.id : 1;
    }
    return 1;
  });
  const [selectedEndSurah, setSelectedEndSurah] = useState(() => {
    if (initialPlan && initialPlan.endPage) {
      const found = surahList.find((s) => s.startPage <= initialPlan.endPage && s.endPage >= initialPlan.endPage);
      return found ? found.id : 114;
    }
    return 114;
  });
  const [selectedStartJuz, setSelectedStartJuz] = useState(1);
  const [selectedEndJuz, setSelectedEndJuz] = useState(30);
  const [selectedStartHizb, setSelectedStartHizb] = useState(1);
  const [selectedEndHizb, setSelectedEndHizb] = useState(60);
  const [selectedStartRub, setSelectedStartRub] = useState(1);
  const [selectedEndRub, setSelectedEndRub] = useState(240);
  const [startSurahAyah, setStartSurahAyah] = useState(1);
  const [startAyahNum, setStartAyahNum] = useState(1);
  const [endSurahAyah, setEndSurahAyah] = useState(114);
  const [endAyahNum, setEndAyahNum] = useState(1);

  // ===== State for SurahPicker in Ayah range =====
  const [openStartSurahAyah, setOpenStartSurahAyah] = useState(false);
  const [openEndSurahAyah, setOpenEndSurahAyah] = useState(false);

  // ===== State for SurahPicker in Surah range =====
  const [openStartSurah, setOpenStartSurah] = useState(false);
  const [openEndSurah, setOpenEndSurah] = useState(false);

  const [vacationEnabled, setVacationEnabled] = useState(() => {
    if (initialPlan && initialPlan.schedule) {
      const hasReviewDays = initialPlan.schedule.some((d) => d.isReviewDay);
      return hasReviewDays;
    }
    return false;
  });
  const [daysOn, setDaysOn] = useState(2);
  const [daysOff, setDaysOff] = useState(2);

  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [hasPreview, setHasPreview] = useState(false);

  // ===== Helper functions for page calculation =====
  // ضبط رقم الآية عند تغيير السورة (لتحديث الحد الأقصى)
  useEffect(() => {
    const max = getMaxAyahInSurah(startSurahAyah);
    setStartAyahNum((prev) => Math.min(Math.max(1, prev), max || 1));
  }, [startSurahAyah, getMaxAyahInSurah]);

  useEffect(() => {
    const max = getMaxAyahInSurah(endSurahAyah);
    setEndAyahNum((prev) => Math.min(Math.max(1, prev), max || 1));
  }, [endSurahAyah, getMaxAyahInSurah]);

  // ✅ إضافة useEffect للتحقق من رقم الآية عند التغيير المباشر
  useEffect(() => {
    const max = getMaxAyahInSurah(startSurahAyah);
    if (startAyahNum > max) {
      setStartAyahNum(max || 1);
    }
  }, [startAyahNum, startSurahAyah, getMaxAyahInSurah]);

  useEffect(() => {
    const max = getMaxAyahInSurah(endSurahAyah);
    if (endAyahNum > max) {
      setEndAyahNum(max || 1);
    }
  }, [endAyahNum, endSurahAyah, getMaxAyahInSurah]);

  function getPageFromJuz(juzNum, data, isEnd = false) {
    let firstPage = null;
    let lastPage = null;
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (info && info.juzu === juzNum) {
        if (firstPage === null) firstPage = page;
        lastPage = page;
      }
    }
    if (firstPage === null) return isEnd ? 604 : 1;
    return isEnd ? lastPage : firstPage;
  }

  function getPageFromHizb(hizbNum, data, isEnd = false) {
    let firstPage = null;
    let lastPage = null;
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (info && info.hizb === hizbNum) {
        if (firstPage === null) firstPage = page;
        lastPage = page;
      }
    }
    if (firstPage === null) return isEnd ? 604 : 1;
    return isEnd ? lastPage : firstPage;
  }

  function getPageFromRub(rubNum, data, isEnd = false) {
    let firstPage = null;
    let lastPage = null;
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (info && info.quarter === rubNum) {
        if (firstPage === null) firstPage = page;
        lastPage = page;
      }
    }
    if (firstPage === null) {
      const approximatePage = Math.round((rubNum - 1) * 2.5) + 1;
      if (isEnd) {
        const endApprox = Math.min(604, Math.round(rubNum * 2.5));
        return endApprox;
      }
      return Math.min(604, Math.max(1, approximatePage));
    }
    return isEnd ? lastPage : firstPage;
  }

  function getPageFromAyah(surahNum, ayahNum, data, isEnd = false) {
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (!info) continue;
      if (surahNum >= info.startChapter && surahNum <= info.endChapter) {
        if (surahNum === info.startChapter && ayahNum >= info.startVerse) {
          if (!isEnd) return page;
        }
        if (surahNum === info.endChapter && ayahNum <= info.endVerse) {
          if (isEnd) return page;
        }
        if (surahNum > info.startChapter && surahNum < info.endChapter) {
          if (!isEnd) return page;
        }
      }
    }
    return isEnd ? 604 : 1;
  }

  const calculatePages = useCallback(() => {
    if (!quranData) return { start: 1, end: 604 };
    let start = 1, end = 604;
    if (rangeType === "surah") {
      const startS = surahList.find((s) => s.id === selectedStartSurah);
      const endS = surahList.find((s) => s.id === selectedEndSurah);
      if (startS && endS) {
        start = startS.startPage;
        end = endS.endPage;
      }
    } else if (rangeType === "juz") {
      start = getPageFromJuz(selectedStartJuz, quranData);
      end = getPageFromJuz(selectedEndJuz, quranData, true);
    } else if (rangeType === "hizb") {
      start = getPageFromHizb(selectedStartHizb, quranData);
      end = getPageFromHizb(selectedEndHizb, quranData, true);
    } else if (rangeType === "rub") {
      start = getPageFromRub(selectedStartRub, quranData);
      end = getPageFromRub(selectedEndRub, quranData, true);
    } else if (rangeType === "ayah") {
      // ✅ نستخدم القيم المعدلة (المضمونة ضمن الحد الأقصى)
      const clampedStart = Math.min(Math.max(1, startAyahNum), getMaxAyahInSurah(startSurahAyah) || 1);
      const clampedEnd = Math.min(Math.max(1, endAyahNum), getMaxAyahInSurah(endSurahAyah) || 1);
      start = getPageFromAyah(startSurahAyah, clampedStart, quranData, false);
      end = getPageFromAyah(endSurahAyah, clampedEnd, quranData, true);
    } else if (rangeType === "page") {
      start = formData.startPage;
      end = formData.endPage;
    }
    start = Math.max(1, Math.min(604, start));
    end = Math.max(1, Math.min(604, end));
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    return { start, end };
  }, [
    rangeType,
    selectedStartSurah,
    selectedEndSurah,
    selectedStartJuz,
    selectedEndJuz,
    selectedStartHizb,
    selectedEndHizb,
    selectedStartRub,
    selectedEndRub,
    startSurahAyah,
    startAyahNum,
    endSurahAyah,
    endAyahNum,
    formData.startPage,
    formData.endPage,
    quranData,
    surahList,
    getMaxAyahInSurah,
  ]);

  useEffect(() => {
    const { start, end } = calculatePages();
    setFormData((prev) => {
      if (prev.startPage !== start || prev.endPage !== end) {
        return { ...prev, startPage: start, endPage: end };
      }
      return prev;
    });
  }, [calculatePages]);

  const handleOffDayToggle = (dayValue) => {
    setFormData((prev) => ({
      ...prev,
      offDays: prev.offDays.includes(dayValue)
        ? prev.offDays.filter((d) => d !== dayValue)
        : [...prev.offDays, dayValue],
    }));
  };

  const handlePreview = () => {
    setError("");

    if (!quranData) {
      setError("بيانات المصحف لم تُحمَّل بعد. يرجى الانتظار...");
      return;
    }

    const { start, end } = calculatePages();
    setFormData((prev) => ({ ...prev, startPage: start, endPage: end }));

    const name = formData.name.trim();
    const startDate = formData.startDate;
    const endDate = formData.endDate;
    const offDays = formData.offDays;
    const startPage = start;
    const endPage = end;

    if (!name) {
      setError("يرجى إدخال اسم للخطة");
      return;
    }
    if (!startDate || !endDate) {
      setError("يرجى تحديد تاريخ البداية والنهاية");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      return;
    }
    if (startPage > endPage) {
      setError("صفحة البداية يجب أن تكون قبل صفحة النهاية أو مساوية لها");
      return;
    }
    if (offDays.length === 7) {
      setError("لا يمكن تحديد جميع أيام الأسبوع كإجازة. يُرجى استخدام نظام التناوب أدناه.");
      return;
    }

    const vacationPattern = vacationEnabled ? { enabled: true, daysOn, daysOff } : null;

    try {
      const newPlan = createPlan({
        name,
        startDate,
        endDate,
        startPage,
        endPage,
        offDays,
        vacationPattern,
      });

      if (!newPlan) {
        setError("فشل إنشاء الخطة: لم يتم إرجاع أي بيانات.");
        setHasPreview(false);
        return;
      }

      if (newPlan.error) {
        setError(newPlan.error);
        setHasPreview(false);
        return;
      }

      let finalPlan = newPlan;
      if (isEditing && initialPlan) {
        finalPlan = mergePlanWithProgress(initialPlan, newPlan);
        finalPlan.id = initialPlan.id;
      } else {
        finalPlan.id = "plan_" + Date.now();
      }

      setPreview(finalPlan);
      setHasPreview(true);
    } catch (err) {
      console.error("❌ خطأ في createPlan:", err);
      setError("حدث خطأ أثناء إنشاء الخطة: " + (err.message || "غير معروف"));
      setHasPreview(false);
    }
  };

  const handleSubmit = () => {
    if (hasPreview && onPlanCreated) {
      onPlanCreated(preview);
    }
  };

  const pageCount = formData.endPage - formData.startPage + 1;
  const versesEstimate = getVersesBetween(formData.startPage, formData.endPage);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          {isEditing ? <Pencil className="w-8 h-8 text-primary" /> : <BookOpen className="w-8 h-8 text-primary" />}
        </div>
        <h2 className="text-2xl font-bold font-heading text-foreground">
          {isEditing ? "تعديل الخطة" : "إنشاء خطة مراجعة جديدة"}
        </h2>
        <p className="text-muted-foreground mt-2">
          {isEditing ? "عدّل بيانات الخطة ثم احفظ التغييرات" : "سمِّ خطتك وحدد النطاق والفترة الزمنية"}
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 md:p-8 space-y-6">
        {/* اسم الخطة */}
        <div>
          <div className="flex items-center gap-2 mb-4 max-md:items-start">
            <Type className="w-4 h-4 text-primary shrink-0 max-md:mt-0.5" />
            <h3 className="font-semibold text-foreground">اسم الخطة</h3>
          </div>
          <Input
            placeholder="مثال: مراجعة سورة البقرة..."
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="text-right h-11 rounded-xl border-input focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="border-t border-border/40" />

        {/* نطاق المراجعة */}
        <div>
          <div className="flex items-center gap-2 mb-4 max-md:items-start">
            <Hash className="w-4 h-4 text-primary shrink-0 max-md:mt-0.5" />
            <h3 className="font-semibold text-foreground">نطاق المراجعة</h3>
          </div>

          <div className="mb-4">
            <Label className="text-sm text-muted-foreground mb-1.5 block">نوع النطاق</Label>
            <Select value={rangeType} onValueChange={setRangeType}>
              <SelectTrigger dir="rtl" className="text-right h-10 rounded-xl border-input focus:ring-1 focus:ring-primary">
                <SelectValue placeholder="اختر نوع النطاق" />
              </SelectTrigger>
              <SelectContent dir="rtl" position="popper" align="start">
                <SelectItem value="surah">سور</SelectItem>
                <SelectItem value="juz">أجزاء</SelectItem>
                <SelectItem value="hizb">أحزاب</SelectItem>
                <SelectItem value="rub">أرباع</SelectItem>
                <SelectItem value="page">صفحات</SelectItem>
                <SelectItem value="ayah">آيات</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ===== نطاق السور ===== */}
          {rangeType === "surah" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <Label className="text-sm text-muted-foreground mb-1.5 block">من سورة</Label>
                <SurahPicker
                  value={selectedStartSurah}
                  onChange={setSelectedStartSurah}
                  open={openStartSurah}
                  setOpen={setOpenStartSurah}
                  surahList={surahList}
                  placeholder="اختر سورة البداية"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى سورة</Label>
                <SurahPicker
                  value={selectedEndSurah}
                  onChange={setSelectedEndSurah}
                  open={openEndSurah}
                  setOpen={setOpenEndSurah}
                  surahList={surahList}
                  placeholder="اختر سورة النهاية"
                />
              </div>
            </div>
          )}

          {/* ===== نطاق الأجزاء ===== */}
          {rangeType === "juz" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من جزء</Label>
                <Select value={selectedStartJuz} onValueChange={setSelectedStartJuz}>
                  <SelectTrigger dir="rtl" className="text-right h-10 rounded-xl border-input focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="اختر جزء البداية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                      <SelectItem key={j} value={j}>الجزء {j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى جزء</Label>
                <Select value={selectedEndJuz} onValueChange={setSelectedEndJuz}>
                  <SelectTrigger dir="rtl" className="text-right h-10 rounded-xl border-input focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="اختر جزء النهاية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                      <SelectItem key={j} value={j}>الجزء {j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ===== نطاق الأحزاب ===== */}
          {rangeType === "hizb" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من حزب</Label>
                <Select value={selectedStartHizb} onValueChange={setSelectedStartHizb}>
                  <SelectTrigger dir="rtl" className="text-right h-10 rounded-xl border-input focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="اختر حزب البداية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start">
                    {Array.from({ length: 60 }, (_, i) => i + 1).map((h) => (
                      <SelectItem key={h} value={h}>الحزب {h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى حزب</Label>
                <Select value={selectedEndHizb} onValueChange={setSelectedEndHizb}>
                  <SelectTrigger dir="rtl" className="text-right h-10 rounded-xl border-input focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="اختر حزب النهاية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start">
                    {Array.from({ length: 60 }, (_, i) => i + 1).map((h) => (
                      <SelectItem key={h} value={h}>الحزب {h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ===== نطاق الأرباع ===== */}
          {rangeType === "rub" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من ربع</Label>
                <Select value={selectedStartRub} onValueChange={setSelectedStartRub}>
                  <SelectTrigger dir="rtl" className="text-right h-10 rounded-xl border-input focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="اختر ربع البداية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start">
                    {Array.from({ length: 240 }, (_, i) => i + 1).map((r) => (
                      <SelectItem key={r} value={r}>الربع {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى ربع</Label>
                <Select value={selectedEndRub} onValueChange={setSelectedEndRub}>
                  <SelectTrigger dir="rtl" className="text-right h-10 rounded-xl border-input focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="اختر ربع النهاية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start">
                    {Array.from({ length: 240 }, (_, i) => i + 1).map((r) => (
                      <SelectItem key={r} value={r}>الربع {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ===== نطاق الصفحات ===== */}
          {rangeType === "page" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من صفحة</Label>
                <Input
                  type="number"
                  min={1}
                  max={604}
                  value={formData.startPage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startPage: parseInt(e.target.value) || 1 }))}
                  className="text-center h-10 rounded-xl border-input focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى صفحة</Label>
                <Input
                  type="number"
                  min={1}
                  max={604}
                  value={formData.endPage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endPage: parseInt(e.target.value) || 1 }))}
                  className="text-center h-10 rounded-xl border-input focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* ===== نطاق الآيات ===== */}
          {rangeType === "ayah" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من آية</Label>
                <div className="grid grid-cols-2 gap-2">
                  <SurahPicker
                    value={startSurahAyah}
                    onChange={setStartSurahAyah}
                    open={openStartSurahAyah}
                    setOpen={setOpenStartSurahAyah}
                    surahList={surahList}
                    placeholder="السورة"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={startAyahNum}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setStartAyahNum(Math.max(1, val));
                    }}
                    className="text-center h-10 rounded-xl border-input focus:ring-1 focus:ring-primary"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى آية</Label>
                <div className="grid grid-cols-2 gap-2">
                  <SurahPicker
                    value={endSurahAyah}
                    onChange={setEndSurahAyah}
                    open={openEndSurahAyah}
                    setOpen={setOpenEndSurahAyah}
                    surahList={surahList}
                    placeholder="السورة"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={endAyahNum}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setEndAyahNum(Math.max(1, val));
                    }}
                    className="text-center h-10 rounded-xl border-input focus:ring-1 focus:ring-primary"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* عرض تقديري للنطاق */}
          <div className="text-center mt-3">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-sm font-bold text-foreground">
                {smartQuranDisplay(versesEstimate, formData.startPage)}
              </p>
              <QuranDetailsPopover verses={versesEstimate} startPage={formData.startPage} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pageCount} صفحة (من ص{formData.startPage} إلى ص{formData.endPage})
            </p>
          </div>
        </div>

        <div className="border-t border-border/40" />

        {/* الفترة الزمنية */}
        <div>
          <div className="flex items-center gap-2 mb-4 max-md:items-start">
            <Calendar className="w-4 h-4 text-primary shrink-0 max-md:mt-0.5" />
            <h3 className="font-semibold text-foreground">الفترة الزمنية</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">تاريخ البداية</Label>
              <MobileWrapper>
                <ArabicDatePicker
                  value={formData.startDate}
                  onChange={(date) => setFormData((prev) => ({ ...prev, startDate: date }))}
                  placeholder="اختر تاريخ البداية"
                />
              </MobileWrapper>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">تاريخ النهاية</Label>
              <MobileWrapper>
                <ArabicDatePicker
                  value={formData.endDate}
                  onChange={(date) => setFormData((prev) => ({ ...prev, endDate: date }))}
                  placeholder="اختر تاريخ النهاية"
                />
              </MobileWrapper>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40" />

        {/* أيام الإجازة الأسبوعية */}
        <div>
          <div className="flex items-center gap-2 mb-4 max-md:items-start">
            <Coffee className="w-4 h-4 text-primary shrink-0 max-md:mt-0.5" />
            <h3 className="font-semibold text-foreground">أيام الإجازة الأسبوعية</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p>أيام راحة تامة من المراجعة. يتم تطبيقها في كل أسابيع الخطة.</p>
                  <p className="mt-1 text-muted-foreground">ملاحظة: في نظام التناوب، هذه الأيام تبقى راحة حتى في أسابيع التثبيت.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                onClick={() => handleOffDayToggle(day.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  formData.offDays.includes(day.value)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {formData.offDays.length === 7 && (
            <p className="text-xs text-destructive mt-2">⚠️ لا يمكن اختيار كل الأيام، استخدم نظام التناوب أدناه.</p>
          )}
        </div>

        {/* نظام التناوب */}
        <div className="border-t border-border/40 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 max-md:items-start">
              <Layers className="w-4 h-4 text-primary shrink-0 max-md:mt-0.5" />
              <h3 className="font-semibold text-foreground">نظام التناوب (مراجعة / تثبيت)</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p><strong>أيام المراجعة:</strong> أيام تُقرأ فيها أجزاء جديدة.</p>
                    <p><strong>أيام التثبيت:</strong> أيام تُراجع فيها الأجزاء السابقة بدلاً من قراءة جديدة.</p>
                    <p className="mt-1 text-muted-foreground">تتكرر الدورة تلقائياً طوال مدة الخطة.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <button
              onClick={() => setVacationEnabled(!vacationEnabled)}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 cursor-pointer ${
                vacationEnabled ? "bg-primary" : "bg-muted-foreground/30"
              } md:w-16 md:h-9`}
            >
              <span className={`absolute top-0.5 w-7 h-7 rounded-full bg-white shadow transition-transform duration-300 ${
                vacationEnabled ? "left-0.5 translate-x-6 md:translate-x-7" : "left-0.5"
              } md:w-8 md:h-8`} />
            </button>
          </div>

          {vacationEnabled && (
            <div className="bg-muted/40 rounded-xl p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                حدد دورة من أيام المراجعة تليها أيام تثبيت (إجازة نشطة لمراجعة ما سبق).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">أيام المراجعة</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={daysOn}
                    onChange={(e) => setDaysOn(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center h-10 rounded-xl border-input focus:ring-1 focus:ring-primary"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">أيام التثبيت (إجازة)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={daysOff}
                    onChange={(e) => setDaysOff(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center h-10 rounded-xl border-input focus:ring-1 focus:ring-primary"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="text-sm text-primary font-medium bg-primary/5 p-3 rounded-lg">
                <span className="font-bold">الدورة:</span> {daysOn} يوم مراجعة → {daysOff} يوم تثبيت
                <span className="block text-xs text-muted-foreground mt-1">
                  📌 أيام الإجازة الأسبوعية المحددة أعلاه تبقى راحة تامة حتى أثناء أيام التثبيت.
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto h-12 rounded-xl min-w-[120px]">
              إلغاء
            </Button>
          )}
          <Button
            onClick={handlePreview}
            className="w-full sm:w-auto h-12 rounded-xl text-base font-semibold"
            variant="outline"
          >
            <Sparkles className="w-4 h-4 ml-2" />
            {isEditing ? "معاينة التعديلات" : "معاينة الخطة"}
          </Button>
        </div>

        {hasPreview && preview && (
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-foreground text-center">{preview.name}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{preview.totalPages}</p>
                <p className="text-xs text-muted-foreground">صفحة إجمالي</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{preview.workDays}</p>
                <p className="text-xs text-muted-foreground">يوم مراجعة</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{preview.dailyVerses}</p>
                <p className="text-xs text-muted-foreground">آية/يوم مراجعة</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{preview.totalDays}</p>
                <p className="text-xs text-muted-foreground">يوم إجمالي</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{preview.offDayCount}</p>
                <p className="text-xs text-muted-foreground">يوم إجازة</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary/70">{preview.reviewDays || 0}</p>
                <p className="text-xs text-muted-foreground">يوم تثبيت</p>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full h-12 rounded-xl text-base font-semibold">
              {isEditing ? "حفظ التعديلات" : "بدء الخطة"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SurahPicker component =====
function SurahPicker({ value, onChange, open, setOpen, surahList, placeholder }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!surahList || surahList.length === 0) return [];
    if (!search.trim()) return surahList;

    const query = normalizeArabic(search.trim());

    const scored = surahList.map((surah) => {
      const nameNorm = normalizeArabic(surah.name);
      let score = 0;

      if (nameNorm === query) score += 100;
      if (nameNorm.startsWith(query)) score += 50;
      const words = nameNorm.split(" ");
      if (words.some((w) => w === query)) score += 40;
      if (nameNorm.includes(query)) score += 20;
      if (surah.id.toString() === query) score += 80;
      else if (surah.id.toString().includes(query)) score += 15;
      const cleanName = nameNorm.replace(/^(سورة|ال|آل)/, "").trim();
      if (cleanName.startsWith(query)) score += 30;
      else if (cleanName.includes(query)) score += 10;
      const firstLetters = words.map((w) => w[0]).join("");
      if (firstLetters.includes(query)) score += 5;
      if (query.length === 1 && nameNorm.startsWith(query)) score += 25;

      return { ...surah, score };
    });

    const filteredScored = scored.filter((item) => item.score > 0);
    filteredScored.sort((a, b) => b.score - a.score);
    return filteredScored;
  }, [search, surahList]);

  const selectedSurah = surahList?.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 px-2 sm:px-3 text-sm truncate rounded-xl border-input focus:ring-1 focus:ring-primary"
        >
          <span className="truncate max-w-[calc(100%-24px)]">
            {selectedSurah ? `${selectedSurah.id} - ${selectedSurah.name}` : placeholder}
          </span>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 rounded-xl" align="start">
        <div className="p-2">
          <div className="flex items-center border border-input rounded-xl px-3 py-1">
            <Search className="h-4 w-4 text-muted-foreground ml-2" />
            <Input
              placeholder="ابحث عن سورة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              dir="rtl"
            />
          </div>
          <div className="mt-2 max-h-60 overflow-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {surahList?.length === 0 ? "جاري تحميل السور..." : "لا توجد سورة مطابقة"}
              </div>
            ) : (
              filtered.map((surah) => (
                <div
                  key={surah.id}
                  className="px-3 py-2 rounded-xl hover:bg-accent cursor-pointer text-sm"
                  onClick={() => {
                    onChange(surah.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {surah.id} - {surah.name}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}