// src/components/quran/CreatePlanForm.jsx
// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  BookOpen, Calendar, Hash, Coffee, Sparkles, Layers, Type, Info,
  ChevronDown, Search, Pencil, BookmarkCheck, ArrowLeft, Gauge,
} from "lucide-react";
import {
  createPlan, calculateEndDateByPace, mergePlanWithProgress, smartQuranDisplay, getLocalToday, getPlanLabels, formatArabicDate,
} from "@/lib/quranPlanEngine";
import {
  getVersesBetween, getQuranData, getSurahList, getSurahVersesCount,
} from "@/lib/quranData";
import QuranDetailsPopover, { INFO_ICON_TRIGGER_CLASSES } from "@/components/quran/QuranDetailsPopover";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArabicDatePicker } from "@/components/ui/arabic-date-picker";

const SELECT_TRIGGER_CLASSES =
  "w-full h-10 rounded-xl border-input px-3 text-right leading-normal text-sm sm:text-base flex items-center gap-2 " +
  "text-foreground transition-colors duration-150 " +
  "hover:border-primary " +
  "data-[state=open]:border-primary";

const SURAH_PICKER_CLASSES =
  "w-full h-10 px-2 sm:px-3 rounded-xl border border-input bg-transparent " +
  "flex items-center justify-between gap-1 sm:gap-2 " +
  "text-sm sm:text-base font-normal text-foreground " +
  "transition-colors duration-150 " +
  "hover:border-primary " +
  "data-[state=open]:border-primary";

function MobileWrapper({ children }) {
  return (
    <div className="w-full min-w-0" style={{ minHeight: "auto", height: "auto", display: "flex", alignItems: "center" }}>
      {children}
    </div>
  );
}

const DAYS_OF_WEEK = [
  { value: 0, label: "الأحد" }, { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" }, { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" }, { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabic = (num) => {
  if (num === undefined || num === null) return "";
  return num.toString().split("").map((d) => arabicDigits[parseInt(d)]).join("");
};

function formatArabicDaysText(count) {
  if (count === 1) return "يوم واحد";
  if (count === 2) return "يومان";
  const ar = toArabic(count);
  const mod100 = count % 100;
  if (mod100 >= 3 && mod100 <= 10) return `${ar} أيام`;
  return `${ar} يوماً`;
}

const normalizeNumber = (text) => {
  const map = {
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
  };
  return text.replace(/[٠-٩۰-۹]/g, (d) => map[d] || d);
};

function normalizeArabic(text) {
  if (!text) return "";
  return text.replace(/[أإآ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
}

const TextInput = ({ type = "text", value, onChange, placeholder, className, dir = "rtl", textAlign = "right", ...props }) => (
  <div
    className={`group flex items-center h-10 w-full rounded-xl border border-input bg-transparent px-3 transition-colors duration-150 hover:border-primary focus-within:border-primary ${className || ""}`}
    style={{ height: "40px" }}
  >
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      dir={dir}
      className="w-full bg-transparent border-0 p-0 outline-none text-foreground placeholder:text-muted-foreground group-hover:placeholder:text-foreground"
      style={{
        fontSize: "16px", lineHeight: "1.5", height: "32px",
        padding: 0, margin: 0, boxSizing: "border-box", background: "transparent",
        textAlign: textAlign, color: "hsl(var(--foreground))",
        WebkitAppearance: "none", appearance: "none",
        fontFamily: "'Noto Sans Arabic', sans-serif", verticalAlign: "middle",
      }}
      {...props}
    />
  </div>
);

const ArabicNumberInput = ({ value, onChange, placeholder, className = "", textAlign = "right", ...props }) => {
  const displayValue = value !== undefined && value !== null && value !== ""
    ? toArabic(Number(value)) : "";

  const handleChange = (e) => {
    const numeric = normalizeNumber(e.target.value).replace(/[^0-9]/g, "");
    if (numeric === "") { onChange(""); return; }
    const num = parseInt(numeric, 10);
    if (!isNaN(num)) onChange(num);
  };

  return (
    <div className="group flex items-center h-10 w-full rounded-xl border border-input bg-transparent px-3 transition-colors duration-150 hover:border-primary focus-within:border-primary">
      <input
        type="text" inputMode="numeric" value={displayValue}
        onChange={handleChange} placeholder={placeholder}
        className={`w-full bg-transparent border-0 p-0 outline-none text-foreground placeholder:text-muted-foreground group-hover:placeholder:text-foreground ${className}`}
        style={{
          fontSize: "16px", lineHeight: "1.5", height: "32px",
          padding: 0, margin: 0, boxSizing: "border-box", background: "transparent",
          textAlign: textAlign, color: "hsl(var(--foreground))",
          WebkitAppearance: "none", appearance: "none",
          fontFamily: "'Noto Sans Arabic', sans-serif", verticalAlign: "middle",
        }}
        dir="rtl"
        {...props}
      />
    </div>
  );
};

export default function CreatePlanForm({
  onPlanCreated,
  onCancel,
  existingPlans,
  initialPlan = null,
  isEditing = false,
  onPlanTypeChange,
}) {
  const quranData = useMemo(() => getQuranData(), []);
  const surahList = useMemo(() => quranData ? getSurahList() : [], [quranData]);
  const getMaxAyahInSurah = useCallback((surahId) => getSurahVersesCount(surahId), []);
  const today = useMemo(() => getLocalToday(), []);

  const [planType, setPlanType] = useState(() => initialPlan?.planType || "review");
  const [planningMode, setPlanningMode] = useState(() => initialPlan?.planningMode || "by_date");
  const [paceUnit, setPaceUnit] = useState(() => initialPlan?.paceUnit || "pages");
  const [paceAmount, setPaceAmount] = useState(() => initialPlan?.paceAmount || 2);

  useEffect(() => {
    if (onPlanTypeChange) onPlanTypeChange(planType);
  }, [planType, onPlanTypeChange]);

  const labels = useMemo(() => getPlanLabels(planType), [planType]);

  const getInitialData = useCallback(() => {
    if (!initialPlan) {
      return { name: "", startDate: today, endDate: "", startPage: 1, endPage: 604, offDays: [5] };
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
    name: initialData.name, startDate: initialData.startDate,
    endDate: initialData.endDate, startPage: initialData.startPage,
    endPage: initialData.endPage, offDays: initialData.offDays,
  });

  useEffect(() => {
    if (!formData.startDate) setFormData((prev) => ({ ...prev, startDate: today }));
  }, [today, formData.startDate]);

  const [rangeType, setRangeType] = useState("surah");
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
  const [endAyahNum, setEndAyahNum] = useState(() => getSurahVersesCount(114) || 6);

  const [openStartSurahAyah, setOpenStartSurahAyah] = useState(false);
  const [openEndSurahAyah, setOpenEndSurahAyah] = useState(false);
  const [openStartSurah, setOpenStartSurah] = useState(false);
  const [openEndSurah, setOpenEndSurah] = useState(false);

  const [vacationEnabled, setVacationEnabled] = useState(() => {
    if (initialPlan?.vacationPattern) return !!initialPlan.vacationPattern.enabled;
    if (initialPlan && initialPlan.schedule) {
      return initialPlan.schedule.some((d) => d.isReviewDay);
    }
    return false;
  });
  const [daysOn, setDaysOn] = useState(() => initialPlan?.vacationPattern?.daysOn || 2);
  const [daysOff, setDaysOff] = useState(() => initialPlan?.vacationPattern?.daysOff || 2);

  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewSignature, setPreviewSignature] = useState(null);

  const formSignature = useMemo(() => JSON.stringify({
    name: formData.name, planType, planningMode, paceUnit, paceAmount,
    startDate: formData.startDate, endDate: formData.endDate,
    startPage: formData.startPage, endPage: formData.endPage,
    offDays: [...formData.offDays].sort((a, b) => a - b),
    vacationEnabled, daysOn, daysOff,
  }), [formData, planType, planningMode, paceUnit, paceAmount, vacationEnabled, daysOn, daysOff]);

  const hasPreview = preview !== null && previewSignature === formSignature;

  useEffect(() => {
    const max = getMaxAyahInSurah(startSurahAyah);
    setStartAyahNum((prev) => Math.min(Math.max(1, prev), max || 1));
  }, [startSurahAyah, getMaxAyahInSurah]);

  useEffect(() => {
    const max = getMaxAyahInSurah(endSurahAyah);
    setEndAyahNum(max || 1);
  }, [endSurahAyah, getMaxAyahInSurah]);

  useEffect(() => {
    const max = getMaxAyahInSurah(startSurahAyah);
    if (startAyahNum > max) setStartAyahNum(max || 1);
  }, [startAyahNum, startSurahAyah, getMaxAyahInSurah]);

  useEffect(() => {
    const max = getMaxAyahInSurah(endSurahAyah);
    if (endAyahNum > max) setEndAyahNum(max || 1);
  }, [endAyahNum, endSurahAyah, getMaxAyahInSurah]);

  function getPageFromJuz(juzNum, data, isEnd = false) {
    let firstPage = null, lastPage = null;
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
    let firstPage = null, lastPage = null;
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
    let firstPage = null, lastPage = null;
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (info && info.quarter === rubNum) {
        if (firstPage === null) firstPage = page;
        lastPage = page;
      }
    }
    if (firstPage === null) {
      const approximatePage = Math.round((rubNum - 1) * 2.5) + 1;
      if (isEnd) return Math.min(604, Math.round(rubNum * 2.5));
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
      if (startS && endS) { start = startS.startPage; end = endS.endPage; }
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
      const clampedStart = Math.min(Math.max(1, startAyahNum), getMaxAyahInSurah(startSurahAyah) || 1);
      const clampedEnd = Math.min(Math.max(1, endAyahNum), getMaxAyahInSurah(endSurahAyah) || 1);
      start = getPageFromAyah(startSurahAyah, clampedStart, quranData, false);
      end = getPageFromAyah(endSurahAyah, clampedEnd, quranData, true);
    } else if (rangeType === "page") {
      start = formData.startPage; end = formData.endPage;
    }
    start = Math.max(1, Math.min(604, start));
    end = Math.max(1, Math.min(604, end));
    if (start > end) { const temp = start; start = end; end = temp; }
    return { start, end };
  }, [
    rangeType, selectedStartSurah, selectedEndSurah, selectedStartJuz, selectedEndJuz,
    selectedStartHizb, selectedEndHizb, selectedStartRub, selectedEndRub,
    startSurahAyah, startAyahNum, endSurahAyah, endAyahNum,
    formData.startPage, formData.endPage, quranData, surahList, getMaxAyahInSurah,
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

  const paceSummary = useMemo(() => {
    if (planningMode !== "by_pace" || !quranData || !formData.startDate) return null;
    if (formData.offDays.length === 7) return null;
    const vacationPattern = vacationEnabled ? { enabled: true, daysOn, daysOff } : null;
    const res = calculateEndDateByPace({
      startDate: formData.startDate,
      startPage: formData.startPage,
      endPage: formData.endPage,
      paceUnit,
      paceAmount: Math.max(1, parseInt(paceAmount, 10) || 1),
      offDays: formData.offDays,
      vacationPattern,
    });
    return res.error ? null : res;
  }, [planningMode, quranData, formData.startDate, formData.startPage, formData.endPage, formData.offDays, paceUnit, paceAmount, vacationEnabled, daysOn, daysOff]);

  const handleOffDayToggle = (dayValue) => {
    setFormData((prev) => ({
      ...prev,
      offDays: prev.offDays.includes(dayValue)
        ? prev.offDays.filter((d) => d !== dayValue)
        : [...prev.offDays, dayValue],
    }));
  };

  const handleSelectPlanType = (type) => {
    setPlanType(type);
  };

  const handlePreview = () => {
    setError("");
    if (!quranData) { setError("بيانات المصحف لم تُحمَّل بعد. يرجى الانتظار..."); return; }
    const { start, end } = calculatePages();
    setFormData((prev) => ({ ...prev, startPage: start, endPage: end }));
    const name = formData.name.trim();
    const startDate = formData.startDate;
    const offDays = formData.offDays, startPage = start, endPage = end;

    if (!name) { setError("يرجى إدخال اسم للخطة"); return; }
    if (!startDate) { setError("يرجى تحديد تاريخ البداية"); return; }

    if (planningMode === "by_date") {
      if (!formData.endDate) { setError("يرجى تحديد تاريخ البداية والنهاية"); return; }
      if (new Date(formData.endDate) <= new Date(startDate)) { setError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية"); return; }
    } else {
      if (!paceAmount || parseInt(paceAmount, 10) < 1) {
        setError("يرجى إدخال مقدار الورد اليومي (١ على الأقل)");
        return;
      }
    }

    if (startPage > endPage) { setError("صفحة البداية يجب أن تكون قبل صفحة النهاية أو مساوية لها"); return; }
    if (offDays.length === 7) {
      setError("لا يمكن تحديد جميع أيام الأسبوع كإجازة. يُرجى استخدام نظام التناوب أدناه.");
      return;
    }

    const vacationPattern = vacationEnabled ? { enabled: true, daysOn, daysOff } : null;
    try {
      const newPlan = createPlan({
        name,
        planType,
        planningMode,
        paceUnit,
        paceAmount: Math.max(1, parseInt(paceAmount, 10) || 1),
        startDate,
        endDate: formData.endDate,
        startPage,
        endPage,
        offDays,
        vacationPattern,
      });
      if (!newPlan) { setError("فشل إنشاء الخطة: لم يتم إرجاع أي بيانات."); setPreviewSignature(null); return; }
      if (newPlan.error) { setError(newPlan.error); setPreviewSignature(null); return; }

      let finalPlan = newPlan;
      if (isEditing && initialPlan) {
        finalPlan = mergePlanWithProgress(initialPlan, newPlan);
        finalPlan.id = initialPlan.id;
      } else {
        finalPlan.id = "plan_" + Date.now();
      }

      setPreview(finalPlan);
      setPreviewSignature(JSON.stringify({
        name: formData.name, planType, planningMode, paceUnit, paceAmount,
        startDate: formData.startDate, endDate: formData.endDate,
        startPage: start, endPage: end,
        offDays: [...formData.offDays].sort((a, b) => a - b),
        vacationEnabled, daysOn, daysOff,
      }));
    } catch (err) {
      console.error("❌ خطأ في createPlan:", err);
      setError("حدث خطأ أثناء إنشاء الخطة: " + (err.message || "غير معروف"));
      setPreviewSignature(null);
    }
  };

  const handleSubmit = () => {
    if (hasPreview && onPlanCreated) onPlanCreated(preview);
  };

  const pageCount = formData.endPage - formData.startPage + 1;
  const versesEstimate = getVersesBetween(formData.startPage, formData.endPage);

  const SurahPicker = ({ value, onChange, open, setOpen, surahList, placeholder }) => {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
      if (!surahList || surahList.length === 0) return [];
      if (!search.trim()) return surahList;
      const query = search.trim();
      const queryNormalized = normalizeNumber(query);
      const queryArabic = normalizeArabic(query);
      return surahList.filter((surah) => {
        const idStr = surah.id.toString();
        const idArabic = toArabic(surah.id);
        const nameNorm = normalizeArabic(surah.name);
        const idMatch = idStr.includes(queryNormalized) || idArabic.includes(queryNormalized) || idArabic.includes(query) || idStr.includes(query);
        return idMatch || nameNorm.includes(queryArabic);
      });
    }, [search, surahList]);

    const selectedSurah = surahList?.find((s) => s.id === value);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={SURAH_PICKER_CLASSES}
            dir="rtl"
          >
            <span className="truncate flex-1 text-right leading-normal pe-0.5 font-normal">
              {selectedSurah ? `${toArabic(selectedSurah.id)} - ${selectedSurah.name}` : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50 stroke-[2]" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 rounded-xl" align="start">
          <div className="p-2">
            <div className="flex items-center border border-input rounded-xl px-3 py-1 transition-colors duration-150 hover:border-primary focus-within:border-primary">
              <Search className="h-4 w-4 text-muted-foreground me-2 shrink-0 stroke-[2]" />
              <input
                placeholder="ابحث عن سورة (رقم أو اسم)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 p-0 h-8 flex-1 bg-transparent outline-none text-base font-normal text-foreground placeholder:text-muted-foreground"
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
                    className="px-3 py-2 rounded-xl cursor-pointer text-sm leading-normal text-right font-normal transition-colors hover:bg-primary/15 hover:text-primary"
                    onClick={() => { onChange(surah.id); setOpen(false); setSearch(""); }}
                  >
                    {toArabic(surah.id)} - {surah.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
          {isEditing ? (
            <Pencil className="w-6 h-6 stroke-[2] text-primary" />
          ) : labels.isMemorization ? (
            <BookmarkCheck className="w-6 h-6 stroke-[2] text-primary" />
          ) : (
            <BookOpen className="w-6 h-6 stroke-[2] text-primary" />
          )}
        </div>
        <h2 className="text-2xl font-bold font-heading text-foreground">
          {isEditing ? "تعديل الخطة" : `إنشاء ${labels.planTypeName} جديدة`}
        </h2>
        <p className="text-muted-foreground mt-2">
          {isEditing ? "عدّل بيانات الخطة ثم احفظ التغييرات" : "اختر نوع الخطة وحدد النطاق والفترة الزمنية"}
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-8 space-y-6">
        {/* اختيار نوع الخطة */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2.5 block">نوع الخطة</Label>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => handleSelectPlanType("review")}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-right gap-2 sm:gap-3 min-w-0 ${
                planType === "review"
                  ? "bg-primary/10 border-primary text-foreground shadow-sm"
                  : "bg-background border-input text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                planType === "review" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 w-full sm:flex-1">
                <p className="font-bold text-sm leading-normal">خطة مراجعة</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">مراجعة المحفوظ</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPlanType("memorization")}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-right gap-2 sm:gap-3 min-w-0 ${
                planType === "memorization"
                  ? "bg-primary/10 border-primary text-foreground shadow-sm"
                  : "bg-background border-input text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                planType === "memorization" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <BookmarkCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 w-full sm:flex-1">
                <p className="font-bold text-sm leading-normal">خطة حفظ</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">حفظ جديد وتثبيت</p>
              </div>
            </button>
          </div>
        </div>

        <div className="border-t border-border/40" />

        {/* اسم الخطة */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-primary shrink-0 stroke-[2]" />
            <h3 className="font-semibold text-foreground">اسم الخطة</h3>
          </div>
          <TextInput
            type="text"
            placeholder={labels.isMemorization ? "مثال: حفظ سورة البقرة..." : "مثال: مراجعة سورة البقرة..."}
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="border-t border-border/40" />

        {/* نطاق الخطة */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-4 h-4 text-primary shrink-0 stroke-[2]" />
            <h3 className="font-semibold text-foreground">نطاق {labels.workNoun}</h3>
          </div>

          <div className="mb-4">
            <Label className="text-sm text-muted-foreground mb-1.5 block">نوع النطاق</Label>
            <Select value={rangeType} onValueChange={setRangeType}>
              <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                <SelectValue placeholder="اختر نوع النطاق" />
              </SelectTrigger>
              <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                <SelectItem value="surah">سور</SelectItem>
                <SelectItem value="juz">أجزاء</SelectItem>
                <SelectItem value="hizb">أحزاب</SelectItem>
                <SelectItem value="rub">أرباع</SelectItem>
                <SelectItem value="page">صفحات</SelectItem>
                <SelectItem value="ayah">آيات</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rangeType === "surah" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <Label className="text-sm text-muted-foreground mb-1.5 block">من سورة</Label>
                <SurahPicker value={selectedStartSurah} onChange={setSelectedStartSurah} open={openStartSurah} setOpen={setOpenStartSurah} surahList={surahList} placeholder="اختر سورة البداية" />
              </div>
              <div className="min-w-0">
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى سورة</Label>
                <SurahPicker value={selectedEndSurah} onChange={setSelectedEndSurah} open={openEndSurah} setOpen={setOpenEndSurah} surahList={surahList} placeholder="اختر سورة النهاية" />
              </div>
            </div>
          )}

          {rangeType === "juz" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من جزء</Label>
                <Select value={selectedStartJuz} onValueChange={(v) => setSelectedStartJuz(parseInt(v, 10))}>
                  <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                    <SelectValue placeholder="اختر جزء البداية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                      <SelectItem key={j} value={j}>{toArabic(j)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى جزء</Label>
                <Select value={selectedEndJuz} onValueChange={(v) => setSelectedEndJuz(parseInt(v, 10))}>
                  <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                    <SelectValue placeholder="اختر جزء النهاية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                      <SelectItem key={j} value={j}>{toArabic(j)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {rangeType === "hizb" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من حزب</Label>
                <Select value={selectedStartHizb} onValueChange={(v) => setSelectedStartHizb(parseInt(v, 10))}>
                  <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                    <SelectValue placeholder="اختر حزب البداية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                    {Array.from({ length: 60 }, (_, i) => i + 1).map((h) => (
                      <SelectItem key={h} value={h}>{toArabic(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى حزب</Label>
                <Select value={selectedEndHizb} onValueChange={(v) => setSelectedEndHizb(parseInt(v, 10))}>
                  <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                    <SelectValue placeholder="اختر حزب النهاية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                    {Array.from({ length: 60 }, (_, i) => i + 1).map((h) => (
                      <SelectItem key={h} value={h}>{toArabic(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {rangeType === "rub" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من ربع</Label>
                <Select value={selectedStartRub} onValueChange={(v) => setSelectedStartRub(parseInt(v, 10))}>
                  <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                    <SelectValue placeholder="اختر ربع البداية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                    {Array.from({ length: 240 }, (_, i) => i + 1).map((r) => (
                      <SelectItem key={r} value={r}>{toArabic(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى ربع</Label>
                <Select value={selectedEndRub} onValueChange={(v) => setSelectedEndRub(parseInt(v, 10))}>
                  <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                    <SelectValue placeholder="اختر ربع النهاية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                    {Array.from({ length: 240 }, (_, i) => i + 1).map((r) => (
                      <SelectItem key={r} value={r}>{toArabic(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {rangeType === "page" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">من صفحة</Label>
                <ArabicNumberInput
                  value={formData.startPage}
                  onChange={(val) => setFormData((prev) => ({ ...prev, startPage: val || 1 }))}
                  placeholder="رقم الصفحة" textAlign="center"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى صفحة</Label>
                <ArabicNumberInput
                  value={formData.endPage}
                  onChange={(val) => setFormData((prev) => ({ ...prev, endPage: val || 1 }))}
                  placeholder="رقم الصفحة" textAlign="center"
                />
              </div>
            </div>
          )}

          {rangeType === "ayah" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <Label className="text-sm text-muted-foreground mb-1.5 block">من آية</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 min-w-0">
                    <SurahPicker value={startSurahAyah} onChange={setStartSurahAyah} open={openStartSurahAyah} setOpen={setOpenStartSurahAyah} surahList={surahList} placeholder="السورة" />
                  </div>
                  <ArabicNumberInput value={startAyahNum} onChange={(val) => setStartAyahNum(Math.max(1, val || 1))} placeholder="الآية" textAlign="center" />
                </div>
              </div>
              <div className="min-w-0">
                <Label className="text-sm text-muted-foreground mb-1.5 block">إلى آية</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 min-w-0">
                    <SurahPicker value={endSurahAyah} onChange={setEndSurahAyah} open={openEndSurahAyah} setOpen={setOpenEndSurahAyah} surahList={surahList} placeholder="السورة" />
                  </div>
                  <ArabicNumberInput value={endAyahNum} onChange={(val) => setEndAyahNum(Math.max(1, val || 1))} placeholder="الآية" textAlign="center" />
                </div>
              </div>
            </div>
          )}

          <div className="text-center mt-3">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-sm font-bold text-foreground">{smartQuranDisplay(versesEstimate, formData.startPage)}</p>
              <QuranDetailsPopover verses={versesEstimate} startPage={formData.startPage} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {toArabic(pageCount)} صفحة (من ص{toArabic(formData.startPage)} إلى ص{toArabic(formData.endPage)})
            </p>
          </div>
        </div>

        <div className="border-t border-border/40" />

        {/* الفترة الزمنية أو الورد اليومي */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {planningMode === "by_pace" ? (
              <Gauge className="w-4 h-4 text-primary shrink-0 stroke-[2]" />
            ) : (
              <Calendar className="w-4 h-4 text-primary shrink-0 stroke-[2]" />
            )}
            <h3 className="font-semibold text-foreground">
              {planningMode === "by_pace" ? "البداية ومقدار الورد اليومي" : "الفترة الزمنية"}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 border border-border/50 mb-4">
            <button
              type="button"
              onClick={() => setPlanningMode("by_date")}
              className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
                planningMode === "by_date"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              تحديد تاريخ النهاية
            </button>
            <button
              type="button"
              onClick={() => setPlanningMode("by_pace")}
              className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
                planningMode === "by_pace"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              تحديد الورد اليومي
            </button>
          </div>

          {planningMode === "by_date" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">تاريخ البداية</Label>
                <MobileWrapper>
                  <ArabicDatePicker
                    value={formData.startDate}
                    onChange={(date) => setFormData((prev) => ({ ...prev, startDate: date }))}
                    placeholder="تاريخ البداية"
                    className="w-full"
                  />
                </MobileWrapper>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">تاريخ النهاية</Label>
                <MobileWrapper>
                  <ArabicDatePicker
                    value={formData.endDate}
                    onChange={(date) => setFormData((prev) => ({ ...prev, endDate: date }))}
                    placeholder="تاريخ النهاية"
                    className="w-full"
                  />
                </MobileWrapper>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">تاريخ البداية</Label>
                  <MobileWrapper>
                    <ArabicDatePicker
                      value={formData.startDate}
                      onChange={(date) => setFormData((prev) => ({ ...prev, startDate: date }))}
                      placeholder="تاريخ البداية"
                      className="w-full"
                    />
                  </MobileWrapper>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">
                    مقدار {labels.workNoun} اليومي
                  </Label>
                  {/* ✅ اختيار الوحدة (الحقول) إلى اليمين وإدخال الكمية إلى اليسار */}
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={paceUnit} onValueChange={setPaceUnit}>
                      <SelectTrigger dir="rtl" className={SELECT_TRIGGER_CLASSES}>
                        <SelectValue placeholder="الوحدة" />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" align="start" className="text-base">
                        <SelectItem value="pages">صفحات</SelectItem>
                        <SelectItem value="rub">أرباع</SelectItem>
                        <SelectItem value="hizb">أحزاب</SelectItem>
                        <SelectItem value="juz">أجزاء</SelectItem>
                        <SelectItem value="verses">آيات</SelectItem>
                      </SelectContent>
                    </Select>
                    <ArabicNumberInput
                      value={paceAmount}
                      onChange={(val) => setPaceAmount(val === "" ? "" : Math.max(1, val))}
                      placeholder="الكمية"
                      textAlign="center"
                    />
                  </div>
                </div>
              </div>

              {paceSummary && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3.5 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">تاريخ الانتهاء المتوقع</p>
                  <p className="text-base font-bold text-primary">
                    {paceSummary.endDayName} · {formatArabicDate(paceSummary.endDate, { includeYear: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    خلال {formatArabicDaysText(paceSummary.totalDays)} (منها {formatArabicDaysText(paceSummary.requiredWorkDays)} للورد)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border/40" />

        {/* أيام الإجازة الأسبوعية */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-4 h-4 text-primary shrink-0 stroke-[2]" />
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground leading-normal">أيام الإجازة الأسبوعية</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="معلومات عن أيام الإجازة"
                    className={INFO_ICON_TRIGGER_CLASSES}
                  >
                    <Info className="w-4 h-4 stroke-[1.75]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="max-w-xs text-xs p-3" dir="rtl">
                  <p>أيام راحة تامة من {labels.workNoun}. يتم تطبيقها في كل أسابيع الخطة.</p>
                  <p className="mt-1 text-muted-foreground">ملاحظة: في نظام التناوب، هذه الأيام تبقى راحة حتى في أيام {labels.consolidationNoun}.</p>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                type="button"
                key={day.value}
                onClick={() => handleOffDayToggle(day.value)}
                className={`px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-center transition-all duration-200 border ${
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
          <div className="flex items-center gap-3 mb-1.5">
            <Layers className="w-4 h-4 text-primary shrink-0 stroke-[2]" />
            <h3 className="font-semibold text-foreground text-sm md:text-base leading-normal">نظام التناوب</h3>
            <button
              type="button"
              onClick={() => setVacationEnabled(!vacationEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-300 cursor-pointer shrink-0 select-none focus:outline-none [-webkit-tap-highlight-color:transparent] ${vacationEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${vacationEnabled ? "left-0.5 translate-x-4" : "left-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground leading-normal">
              ({labels.workNounNew} / {labels.consolidationNoun})
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="معلومات عن نظام التناوب"
                  className={INFO_ICON_TRIGGER_CLASSES}
                >
                  <Info className="w-4 h-4 stroke-[1.75]" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" className="max-w-xs text-xs p-3" dir="rtl">
                <p><strong>أيام {labels.workNounNew}:</strong> أيام يُنجَز فيها مقدار جديد من الخطة.</p>
                <p><strong>أيام {labels.consolidationNoun}:</strong> {labels.consolidationDesc}</p>
                <p className="mt-1 text-muted-foreground">تتكرر الدورة تلقائياً طوال مدة الخطة.</p>
              </PopoverContent>
            </Popover>
          </div>

          {vacationEnabled && (
            <div className="bg-muted/40 rounded-xl p-4 space-y-4 mt-3">
              <p className="text-sm text-muted-foreground">
                حدد دورة من أيام {labels.workNounNew} تليها أيام {labels.consolidationNoun} (يُقترح فيها نطاق الدورة السابقة تلقائياً مع حرية التعديل).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">أيام {labels.workNounNew}</Label>
                  <ArabicNumberInput value={daysOn} onChange={(val) => setDaysOn(Math.max(1, val || 1))} placeholder="عدد الأيام" textAlign="center" />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">أيام {labels.consolidationNoun}</Label>
                  <ArabicNumberInput value={daysOff} onChange={(val) => setDaysOff(Math.max(1, val || 1))} placeholder="عدد الأيام" textAlign="center" />
                </div>
              </div>
              <div className="text-sm text-primary font-medium bg-primary/5 border border-primary/15 p-3.5 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 leading-normal">
                  <span className="font-bold">الدورة:</span>
                  <span>{toArabic(daysOn)} يوم {labels.workNounNew}</span>
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <span>{toArabic(daysOff)} يوم {labels.consolidationNoun}</span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                  <Coffee className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
                  <span>أيام الإجازة الأسبوعية المحددة أعلاه تبقى راحة تامة حتى أثناء أيام {labels.consolidationNoun}.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto h-12 rounded-xl text-base min-w-[120px]">
              إلغاء
            </Button>
          )}
          <Button
            onClick={handlePreview}
            variant="outline"
            className="w-full sm:w-auto h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-1.5 bg-primary/10 border-primary/30 text-primary hover:bg-primary/15"
          >
            <Sparkles className="w-4 h-4 stroke-[2] text-primary" />
            {isEditing ? "معاينة التعديلات" : "معاينة الخطة"}
          </Button>
        </div>

        {hasPreview && preview && (
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 space-y-4">
            <div className="text-center space-y-1">
              <h4 className="font-bold text-foreground">{preview.name}</h4>
              {planningMode === "by_pace" && (
                <p className="text-xs text-primary font-semibold">
                  تاريخ الانتهاء المحسوب: {formatArabicDate(preview.endDate, { includeYear: true })}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-primary">{toArabic(preview.totalPages)}</p><p className="text-xs text-muted-foreground">صفحة إجمالي</p></div>
              <div><p className="text-2xl font-bold text-primary">{toArabic(preview.workDays)}</p><p className="text-xs text-muted-foreground">{labels.workDayLabel}</p></div>
              <div><p className="text-2xl font-bold text-accent">{toArabic(preview.dailyVerses)}</p><p className="text-xs text-muted-foreground">آية/{labels.workDayLabel}</p></div>
              <div><p className="text-2xl font-bold text-foreground">{toArabic(preview.totalDays)}</p><p className="text-xs text-muted-foreground">يوم إجمالي</p></div>
              <div><p className="text-2xl font-bold text-muted-foreground">{toArabic(preview.offDayCount)}</p><p className="text-xs text-muted-foreground">يوم إجازة</p></div>
              <div><p className="text-2xl font-bold text-accent">{toArabic(preview.reviewDays || 0)}</p><p className="text-xs text-muted-foreground">{labels.consolidationDayLabel}</p></div>
            </div>
            <Button onClick={handleSubmit} className="w-full h-12 rounded-xl text-base font-semibold">
              {isEditing ? "حفظ التعديلات" : `بدء ${labels.planTypeName}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}