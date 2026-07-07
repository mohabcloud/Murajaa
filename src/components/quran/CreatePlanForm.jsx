// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Calendar, Hash, Coffee, Sparkles, Layers, Type, Info, ChevronDown, Search, Pencil } from "lucide-react";
import { createPlan, mergePlanWithProgress, formatQuranUnits, smartQuranDisplay, DAY_NAMES_AR, getLocalToday } from "@/lib/quranPlanEngine";
import { getVersesBetween, getQuranData } from "@/lib/quranData";
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

const DAYS_OF_WEEK = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

const SURAH_NAMES = {
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

const SURAH_VERSES_COUNT = {
  1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
  11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
  21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
  31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
  41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
  51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
  61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
  71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
  81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
  91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
  101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
  111:5,112:4,113:5,114:6
};

// ========================== دوال التطبيع ==========================
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
    const surahs = [];
    for (let surahId = 1; surahId <= 114; surahId++) {
      const name = SURAH_NAMES[surahId] || `سورة ${surahId}`;
      let startPage = null;
      let endPage = null;
      for (let page = 1; page <= 604; page++) {
        const info = quranData.pageMap[page];
        if (info && info.startChapter === surahId) {
          if (startPage === null) startPage = page;
          endPage = page;
        }
      }
      if (startPage !== null) {
        surahs.push({ id: surahId, name, startPage, endPage, versesCount: SURAH_VERSES_COUNT[surahId] || 0 });
      }
    }
    return surahs;
  }, [quranData]);

  const getInitialData = useCallback(() => {
  // جلب تاريخ اليوم بتنسيق YYYY-MM-DD
  const today = getLocalToday();
  
  if (!initialPlan) {
    return {
      name: "",
      startDate: today,
      endDate: today, // ← التغيير الجوهري: بدلاً من "" نجعلها مساوية للبداية
      startPage: 1,
      endPage: 604,
      offDays: [5],
    };
  }
  return {
    name: initialPlan.name || "",
    startDate: initialPlan.startDate || today,
    endDate: initialPlan.endDate || today, // أيضاً هنا نضع اليوم إذا كانت فارغة
    startPage: initialPlan.startPage || 1,
    endPage: initialPlan.endPage || 604,
    offDays: initialPlan.offDays || [5],
  };
}, [initialPlan]);

  const initialData = getInitialData();

  const [formData, setFormData] = useState({
    name: initialData.name,
    startDate: initialData.startDate,
    endDate: initialData.endDate,
    startPage: initialData.startPage,
    endPage: initialData.endPage,
    offDays: initialData.offDays,
  });

  const [rangeType, setRangeType] = useState("surah");
  
  const [selectedStartSurah, setSelectedStartSurah] = useState(() => {
    if (initialPlan && initialPlan.startPage) {
      const found = surahList.find(s => s.startPage <= initialPlan.startPage && s.endPage >= initialPlan.startPage);
      return found ? found.id : 1;
    }
    return 1;
  });
  const [selectedEndSurah, setSelectedEndSurah] = useState(() => {
    if (initialPlan && initialPlan.endPage) {
      const found = surahList.find(s => s.startPage <= initialPlan.endPage && s.endPage >= initialPlan.endPage);
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

  const [openStartSurah, setOpenStartSurah] = useState(false);
  const [openEndSurah, setOpenEndSurah] = useState(false);
  const [openStartSurahAyah, setOpenStartSurahAyah] = useState(false);
  const [openEndSurahAyah, setOpenEndSurahAyah] = useState(false);

  const [vacationEnabled, setVacationEnabled] = useState(() => {
    if (initialPlan && initialPlan.schedule) {
      const hasReviewDays = initialPlan.schedule.some(d => d.isReviewDay);
      return hasReviewDays;
    }
    return false;
  });
  const [daysOn, setDaysOn] = useState(2);
  const [daysOff, setDaysOff] = useState(2);

  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [hasPreview, setHasPreview] = useState(false);

  const getMaxAyahInSurah = useCallback((surahId) => {
    const surah = surahList.find(s => s.id === surahId);
    return surah ? surah.versesCount : 0;
  }, [surahList]);

  const clampAyah = useCallback((surahId, ayahNum) => {
    const max = getMaxAyahInSurah(surahId);
    if (max === 0) return 1;
    return Math.min(Math.max(1, ayahNum), max);
  }, [getMaxAyahInSurah]);

  useEffect(() => {
    setStartAyahNum(prev => clampAyah(startSurahAyah, prev));
  }, [startSurahAyah, clampAyah]);

  useEffect(() => {
    setEndAyahNum(prev => clampAyah(endSurahAyah, prev));
  }, [endSurahAyah, clampAyah]);

  function getPageFromJuz(juzNum, data, isEnd = false) {
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (info && info.juzu === juzNum) {
        if (!isEnd) return page;
        let lastPage = page;
        for (let p = page; p <= 604; p++) {
          if (data.pageMap[p] && data.pageMap[p].juzu === juzNum) lastPage = p;
          else break;
        }
        return lastPage;
      }
    }
    return 1;
  }

  function getPageFromHizb(hizbNum, data, isEnd = false) {
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (info && info.hizb === hizbNum) {
        if (!isEnd) return page;
        let lastPage = page;
        for (let p = page; p <= 604; p++) {
          if (data.pageMap[p] && data.pageMap[p].hizb === hizbNum) lastPage = p;
          else break;
        }
        return lastPage;
      }
    }
    return 1;
  }

  function getPageFromRub(rubNum, data, isEnd = false) {
    for (let page = 1; page <= 604; page++) {
      const info = data.pageMap[page];
      if (info && info.quarter === rubNum) {
        if (!isEnd) return page;
        let lastPage = page;
        for (let p = page; p <= 604; p++) {
          if (data.pageMap[p] && data.pageMap[p].quarter === rubNum) lastPage = p;
          else break;
        }
        return lastPage;
      }
    }
    return 1;
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
      const startS = surahList.find(s => s.id === selectedStartSurah);
      const endS = surahList.find(s => s.id === selectedEndSurah);
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
      const clampedStart = clampAyah(startSurahAyah, startAyahNum);
      const clampedEnd = clampAyah(endSurahAyah, endAyahNum);
      if (clampedStart !== startAyahNum) setStartAyahNum(clampedStart);
      if (clampedEnd !== endAyahNum) setEndAyahNum(clampedEnd);
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
  }, [rangeType, selectedStartSurah, selectedEndSurah, selectedStartJuz, selectedEndJuz, selectedStartHizb, selectedEndHizb, selectedStartRub, selectedEndRub, startSurahAyah, startAyahNum, endSurahAyah, endAyahNum, formData.startPage, formData.endPage, quranData, surahList, clampAyah]);

  useEffect(() => {
    const { start, end } = calculatePages();
    setFormData(prev => {
      if (prev.startPage !== start || prev.endPage !== end) {
        return { ...prev, startPage: start, endPage: end };
      }
      return prev;
    });
  }, [calculatePages]);

  const handleOffDayToggle = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      offDays: prev.offDays.includes(dayValue)
        ? prev.offDays.filter(d => d !== dayValue)
        : [...prev.offDays, dayValue]
    }));
  };

  const handlePreview = () => {
    setError("");
    const { start, end } = calculatePages();
    setFormData(prev => ({ ...prev, startPage: start, endPage: end }));

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

    const newPlan = createPlan({
      name,
      startDate,
      endDate,
      startPage,
      endPage,
      offDays,
      vacationPattern,
    });

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
      finalPlan.id = 'plan_' + Date.now();
    }

    setPreview(finalPlan);
    setHasPreview(true);
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
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="text-right"
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
              <SelectTrigger dir="rtl" className="text-right">
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

          <div className="bg-muted/30 rounded-xl p-4 space-y-4">
            {rangeType === "surah" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
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
                <div>
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

            {rangeType === "juz" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">من جزء</Label>
                  <Select value={selectedStartJuz.toString()} onValueChange={(v) => setSelectedStartJuz(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الجزء" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>الجزء {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">إلى جزء</Label>
                  <Select value={selectedEndJuz.toString()} onValueChange={(v) => setSelectedEndJuz(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الجزء" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>الجزء {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {rangeType === "hizb" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">من حزب</Label>
                  <Select value={selectedStartHizb.toString()} onValueChange={(v) => setSelectedStartHizb(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحزب" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>الحزب {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">إلى حزب</Label>
                  <Select value={selectedEndHizb.toString()} onValueChange={(v) => setSelectedEndHizb(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحزب" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>الحزب {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {rangeType === "rub" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">من ربع</Label>
                  <Select value={selectedStartRub.toString()} onValueChange={(v) => setSelectedStartRub(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الربع" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 240 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>الربع {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">إلى ربع</Label>
                  <Select value={selectedEndRub.toString()} onValueChange={(v) => setSelectedEndRub(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الربع" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 240 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>الربع {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {rangeType === "page" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">من صفحة</Label>
                  <Input
                    type="number" min={1} max={604}
                    value={formData.startPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData(prev => ({ ...prev, startPage: Math.min(604, Math.max(1, val)) }));
                    }}
                    className="text-center text-lg font-semibold" dir="ltr"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">إلى صفحة</Label>
                  <Input
                    type="number" min={1} max={604}
                    value={formData.endPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 604;
                      setFormData(prev => ({ ...prev, endPage: Math.min(604, Math.max(1, val)) }));
                    }}
                    className="text-center text-lg font-semibold" dir="ltr"
                  />
                </div>
              </div>
            )}

            {rangeType === "ayah" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">من آية</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SurahPicker
                        value={startSurahAyah}
                        onChange={setStartSurahAyah}
                        open={openStartSurahAyah}
                        setOpen={setOpenStartSurahAyah}
                        surahList={surahList}
                        placeholder="السورة"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        value={startAyahNum}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setStartAyahNum(clampAyah(startSurahAyah, val));
                        }}
                        className="text-center"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">إلى آية</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SurahPicker
                        value={endSurahAyah}
                        onChange={setEndSurahAyah}
                        open={openEndSurahAyah}
                        setOpen={setOpenEndSurahAyah}
                        surahList={surahList}
                        placeholder="السورة"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        value={endAyahNum}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setEndAyahNum(clampAyah(endSurahAyah, val));
                        }}
                        className="text-center"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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

        {/* ===== التواريخ ===== */}
        <div>
          <div className="flex items-center gap-2 mb-4 max-md:items-start">
            <Calendar className="w-4 h-4 text-primary shrink-0 max-md:mt-0.5" />
            <h3 className="font-semibold text-foreground">الفترة الزمنية</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">تاريخ البداية</Label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                onKeyDown={(e) => e.preventDefault()}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (e.target.showPicker) {
                    e.target.showPicker();
                  }
                }}
                lang="ar"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                dir="ltr"
                style={{
                  minHeight: '44px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  fontFamily: '"Noto Sans Arabic", Tahoma, Arial, sans-serif',
                  lineHeight: '1.5',
                  overflow: 'visible',
                  fontSize: '16px', // لمنع التكبير التلقائي على iOS
                }}
              />
            </div>
            <div>
  <Label className="text-sm text-muted-foreground mb-1.5 block">تاريخ النهاية</Label>
  <input
    type="date"
    value={formData.endDate}
    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
    onKeyDown={(e) => e.preventDefault()}
    onMouseDown={(e) => {
      e.preventDefault();
      if (e.target.showPicker) {
        e.target.showPicker();
      }
    }}
    lang="ar"
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
    dir="ltr"
    style={{
      minHeight: '44px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      fontFamily: '"Noto Sans Arabic", Tahoma, Arial, sans-serif',
      lineHeight: '1.5',
      overflow: 'visible',
      fontSize: '16px',
      color: '#000000', // إجبار اللون
    }}
  />
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
              <button key={day.value}
                onClick={() => handleOffDayToggle(day.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  formData.offDays.includes(day.value)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}>
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
              className={`
                relative w-14 h-8 rounded-full transition-colors duration-300 cursor-pointer
                ${vacationEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}
                md:w-16 md:h-9
              `}
            >
              <span className={`
                absolute top-0.5 w-7 h-7 rounded-full bg-white shadow transition-transform duration-300
                ${vacationEnabled ? 'left-0.5 translate-x-6 md:translate-x-7' : 'left-0.5'}
                md:w-8 md:h-8
              `} />
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
                  <Input type="number" min={1} max={30} value={daysOn}
                    onChange={(e) => setDaysOn(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center" dir="ltr" />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">أيام التثبيت (إجازة)</Label>
                  <Input type="number" min={1} max={30} value={daysOff}
                    onChange={(e) => setDaysOff(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center" dir="ltr" />
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

        {/* أزرار التحكم */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto h-12 rounded-xl min-w-[120px]">
              إلغاء
            </Button>
          )}
          <Button onClick={handlePreview} className="w-full sm:w-auto h-12 rounded-xl text-base font-semibold" variant="outline">
            <Sparkles className="w-4 h-4 ml-2" />
            {isEditing ? "معاينة التعديلات" : "معاينة الخطة"}
          </Button>
        </div>

        {/* معاينة الخطة */}
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

// ============================================================
// SurahPicker
// ============================================================
function SurahPicker({ value, onChange, open, setOpen, surahList, placeholder }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!surahList || surahList.length === 0) return [];
    if (!search.trim()) return surahList;
    
    const query = normalizeArabic(search.trim());
    const queryLower = query.toLowerCase();

    const scored = surahList.map(surah => {
      const nameNorm = normalizeArabic(surah.name);
      const nameLower = nameNorm.toLowerCase();
      let score = 0;

      if (nameNorm === query) score += 100;
      if (nameNorm.startsWith(query)) score += 50;
      const words = nameNorm.split(' ');
      if (words.some(w => w === query)) score += 40;
      if (nameNorm.includes(query)) score += 20;
      if (surah.id.toString() === query) score += 80;
      else if (surah.id.toString().includes(query)) score += 15;
      const cleanName = nameNorm.replace(/^(سورة|ال|آل)/, '').trim();
      if (cleanName.startsWith(query)) score += 30;
      else if (cleanName.includes(query)) score += 10;
      const firstLetters = words.map(w => w[0]).join('');
      if (firstLetters.includes(query)) score += 5;
      if (query.length === 1 && nameNorm.startsWith(query)) score += 25;

      return { ...surah, score };
    });

    const filteredScored = scored.filter(item => item.score > 0);
    filteredScored.sort((a, b) => b.score - a.score);
    return filteredScored;
  }, [search, surahList]);

  const selectedSurah = surahList?.find(s => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          {selectedSurah ? `${selectedSurah.id} - ${selectedSurah.name}` : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2">
          <div className="flex items-center border border-input rounded-md px-3 py-1">
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
                {surahList?.length === 0 ? 'جاري تحميل السور...' : 'لا توجد سورة مطابقة'}
              </div>
            ) : (
              filtered.map((surah) => (
                <div
                  key={surah.id}
                  className="px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm"
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