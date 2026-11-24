// src/components/quran/FlexibleEntryPanel.jsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, BookOpen, RotateCcw, ChevronUp, ChevronDown, LayoutGrid, Target, SkipForward, RefreshCw, Coffee, ArrowLeft } from "lucide-react";
import {
  formatQuranUnits,
  flexibleInputToVerses,
  versesToPagesCount,
  getVersesBetween,
  toArabicNumbers,
  formatArabicDate,
  getPlanLabels,
} from "@/lib/quranPlanEngine";
import QuranInteractivePicker from "@/components/QuranInteractivePicker";

const normalizeDigits = (val) => {
  const map = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  return String(val).replace(/[٠-٩۰-۹]/g, (d) => map[d] || d);
};

export default function FlexibleEntryPanel({
  open,
  onOpenChange,
  day,
  planType = "review",
  onSave,
  onSkip,
  onUndo,
  alreadyRecorded,
}) {
  const [input, setInput] = useState({ juz: 0, hizb: 0, rub: 0, pages: 0, verses: 0, customStartPage: null });
  const [note, setNote] = useState("");
  const [useVisualMode, setUseVisualMode] = useState(false);
  const [guidedFilled, setGuidedFilled] = useState(false);
  const [guidedFillCount, setGuidedFillCount] = useState(0);
  const [guidedClearCount, setGuidedClearCount] = useState(0);

  const labels = getPlanLabels(planType);
  const consolidationProposalLabel = labels.isMemorization ? "مقترح التثبيت" : "مقترح الربط";

  useEffect(() => {
    if (day) {
      setNote(day.note || "");
      const existingVerses = day.isReviewDay
        ? (day.consolidationVerses || day.completedVerses || 0)
        : (day.completedVerses || 0);

      if (existingVerses > 0) {
        setInput({
          juz: 0,
          hizb: 0,
          rub: 0,
          pages: 0,
          verses: existingVerses,
          customStartPage: day.targetStartPage || 1,
        });
      } else {
        setInput({ juz: 0, hizb: 0, rub: 0, pages: 0, verses: 0, customStartPage: null });
      }
    }
    setGuidedFilled(false);
    setGuidedFillCount(0);
    setGuidedClearCount(0);
  }, [day, open]);

  const startPage = input.customStartPage || day?.targetStartPage || 1;
  const calculatedVerses = flexibleInputToVerses(input, startPage);
  const targetVerses = day?.targetVerses || 0;
  const targetPages = day?.targetStartPage && day?.targetEndPage
    ? (day.targetEndPage - day.targetStartPage + 1)
    : versesToPagesCount(targetVerses, day?.targetStartPage || 1);

  const diff = day ? (calculatedVerses - targetVerses) : 0;

  // ✅ تبديل التعبئة التلقائية: يفكك الصفحات الكاملة بدقة أو الآيات الدقيقة، ويزيل التحديد عند الضغط مرة أخرى
  const toggleGuidedFill = () => {
    if (!day || (day.targetVerses <= 0 && (!day.targetStartPage || !day.targetEndPage))) return;

    if (guidedFilled) {
      setInput({ juz: 0, hizb: 0, rub: 0, pages: 0, verses: 0, customStartPage: null });
      setNote(day.note || "");
      setGuidedFilled(false);
      setGuidedClearCount((c) => c + 1);
      return;
    }

    const refStart = day.targetStartPage || 1;
    const hasPageRange = !!(day.targetStartPage && day.targetEndPage);
    const exactRangeVerses = hasPageRange ? getVersesBetween(day.targetStartPage, day.targetEndPage) : 0;

    if (hasPageRange && (day.targetVerses === 0 || day.targetVerses === exactRangeVerses)) {
      const totalPagesCount = Math.max(1, day.targetEndPage - day.targetStartPage + 1);
      const juzCount = Math.floor(totalPagesCount / 20);
      const remPages = totalPagesCount % 20;
      const hizbCount = Math.floor(remPages / 10);
      const directPages = remPages % 10;

      setInput({
        juz: juzCount,
        hizb: hizbCount,
        rub: 0,
        pages: directPages,
        verses: 0,
        customStartPage: refStart,
      });
    } else {
      setInput({
        juz: 0,
        hizb: 0,
        rub: 0,
        pages: 0,
        verses: day.targetVerses,
        customStartPage: refStart,
      });
    }

    if (day.isReviewDay && day.targetStartPage) {
      const rangeText = !day.targetEndPage || day.targetStartPage === day.targetEndPage
        ? `صفحة\u00A0${toArabicNumbers(day.targetStartPage)}`
        : `ص\u00A0${toArabicNumbers(day.targetStartPage)} إلى ص\u00A0${toArabicNumbers(day.targetEndPage)}`;
      setNote(`${labels.consolidationNoun} ${rangeText}`);
    }

    setGuidedFilled(true);
    setGuidedFillCount((c) => c + 1);
  };

  const isLess = diff < 0 && calculatedVerses > 0;
  const isMore = diff > 0;

  const getDiffDisplay = () => {
    const absDiff = Math.max(0, Math.abs(diff));
    if (absDiff < 15) return `${toArabicNumbers(absDiff)} آية`;
    const totalInputPages = (input.juz || 0) * 20 + (input.hizb || 0) * 10 + (input.rub || 0) * 2.5 + (input.pages || 0);
    const pageDiffAbs = Math.abs(totalInputPages - targetPages);
    if (input.verses > 0) {
      if (isLess) return `${toArabicNumbers(Math.ceil(absDiff / 15))} صفحة تقريباً (أو ${toArabicNumbers(absDiff)} آية)`;
      else if (isMore) return `${toArabicNumbers(Math.floor(pageDiffAbs))} صفحة و ${toArabicNumbers(input.verses)} آية`;
    }
    return `${toArabicNumbers(Math.max(1, Math.round(absDiff / 15)))} صفحة`;
  };

  const resetInput = () => {
    setInput({ juz: 0, hizb: 0, rub: 0, pages: 0, verses: 0, customStartPage: null });
    setNote("");
    setGuidedFilled(false);
    setGuidedFillCount(0);
    setGuidedClearCount(0);
  };

  const handleSave = () => {
    if (calculatedVerses === 0) return;
    onSave(day.date, calculatedVerses, input, note.trim());
    onOpenChange(false);
    resetInput();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip(day.date);
    }
    onOpenChange(false);
    resetInput();
  };

  const handleUndo = () => {
    onUndo(day.date);
    onOpenChange(false);
    resetInput();
  };

  const adjustValue = (key, amount) => {
    setGuidedFilled(false);
    setInput(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + amount) }));
  };

  if (!day) return null;

  const canQuickFill = !day.isOff && (day.targetVerses > 0 || (day.targetStartPage && day.targetEndPage));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-3xl"
        dir="rtl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-xl text-foreground">
            {day.isReviewDay
              ? (alreadyRecorded ? `تعديل ${labels.consolidationNoun}` : `تسجيل ${labels.consolidationNoun}`)
              : (alreadyRecorded ? "تعديل إنجاز اليوم" : "تسجيل إنجاز اليوم")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 sm:py-3 space-y-4 sm:space-y-5 min-w-0 w-full">
          <div className="text-center bg-muted/50 rounded-xl p-3.5 sm:p-4">
            <p className="text-sm text-muted-foreground">
              {day.dayName} - {formatArabicDate(day.date)}
            </p>
            {day.isOff ? (
              <div className="mt-1.5 inline-flex items-center justify-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4 text-muted-foreground" />
                </span>
                <span className="text-lg font-bold text-foreground">يوم إجازة</span>
              </div>
            ) : day.isReviewDay ? (
              <div className="mt-1 space-y-1">
                <p className="text-base font-bold text-foreground flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <span>{consolidationProposalLabel} (الدورة السابقة):</span>
                </p>
                {targetVerses > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="text-lg font-bold text-primary">
                      {formatQuranUnits(targetVerses, day.targetStartPage || 1)}
                    </span>
                    {day.targetStartPage && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        {!day.targetEndPage || day.targetStartPage === day.targetEndPage ? (
                          <span>(صفحة{"\u00A0"}{toArabicNumbers(day.targetStartPage)})</span>
                        ) : (
                          <>
                            <span>(ص{"\u00A0"}{toArabicNumbers(day.targetStartPage)}</span>
                            <ArrowLeft className="w-3 h-3 shrink-0" />
                            <span>ص{"\u00A0"}{toArabicNumbers(day.targetEndPage)})</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">اختر أي مقدار تريد تثبيته</p>
                )}
              </div>
            ) : (
              <p className="text-lg font-bold text-foreground mt-1">
                الورد: <span className="text-primary">{formatQuranUnits(targetVerses, day.targetStartPage || 1)}</span>
              </p>
            )}
          </div>

          <div className="min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-w-0">
              <Label className="text-sm font-semibold text-foreground leading-normal">
                {day.isReviewDay ? `ماذا ثبّتَّ اليوم؟` : `ماذا أنجزت اليوم؟`}
              </Label>
              <div className="flex items-center gap-1.5 shrink-0">
                {canQuickFill && (
                  <button
                    type="button"
                    onClick={toggleGuidedFill}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap border ${
                      guidedFilled
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20"
                    }`}
                  >
                    {/* ✅ تصحيح لغوي: "تمت التعبئة" */}
                    {guidedFilled ? (
                      <><Check className="w-3.5 h-3.5 shrink-0" /> تمت التعبئة</>
                    ) : (
                      <><Target className="w-3.5 h-3.5 shrink-0" /> {day.isReviewDay ? "تعبئة المقترح" : "تعبئة الورد"}</>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUseVisualMode(!useVisualMode)}
                  className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-primary/20 transition-colors shrink-0 whitespace-nowrap"
                >
                  {useVisualMode ? <><Check className="w-3.5 h-3.5 shrink-0"/> إدخال رقمي</> : <><LayoutGrid className="w-3.5 h-3.5 shrink-0"/> واجهة المصحف</>}
                </button>
              </div>
            </div>

            <div className={useVisualMode ? "min-w-0 w-full" : "hidden"}>
              <QuranInteractivePicker
                targetStartPage={day?.targetStartPage || 1}
                targetEndPage={day?.targetEndPage || 604}
                planStartPage={1}
                planEndPage={604}
                clearTrigger={guidedClearCount}
                presetRange={
                  guidedFillCount > 0 && day?.targetStartPage && day?.targetEndPage
                    ? {
                        startPage: day.targetStartPage,
                        endPage: day.targetEndPage,
                        triggerKey: guidedFillCount,
                      }
                    : null
                }
                onSelectionChange={(data) => {
                  setGuidedFilled(false);
                  if (data.versesCount > 0) {
                    setInput({
                      juz: 0,
                      hizb: 0,
                      rub: 0,
                      pages: 0,
                      verses: data.versesCount,
                      customStartPage: data.startPage,
                    });
                    if (day.isReviewDay && data.displayLabel) {
                      setNote(data.displayLabel);
                    }
                  } else {
                    setInput({ juz: 0, hizb: 0, rub: 0, pages: 0, verses: 0, customStartPage: null });
                  }
                }}
              />
            </div>

            <div className={useVisualMode ? "hidden" : "min-w-0 w-full"}>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-3">
                {[{ key: "juz", label: "أجزاء" }, { key: "hizb", label: "أحزاب" }, { key: "rub", label: "أرباع" }, { key: "pages", label: "صفحات" }, { key: "verses", label: "آيات" }].map((unit) => (
                  <div key={unit.key} className="text-center space-y-1 min-w-0">
                    <Label className="text-[11px] text-muted-foreground block">{unit.label}</Label>
                    <div className="relative flex flex-col items-center bg-background border border-border/60 rounded-2xl overflow-hidden focus-within:border-primary/50 transition-colors">
                      <button
                        type="button"
                        onClick={() => adjustValue(unit.key, 1)}
                        className="w-full py-1.5 flex items-center justify-center text-muted-foreground hover:text-primary active:scale-95 transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={toArabicNumbers(input[unit.key] || 0)}
                        onChange={(e) => {
                          setGuidedFilled(false);
                          const normalized = normalizeDigits(e.target.value).replace(/[^0-9]/g, '');
                          const val = parseInt(normalized, 10) || 0;
                          setInput(prev => ({ ...prev, [unit.key]: val }));
                        }}
                        className="h-7 w-full border-0 shadow-none bg-transparent p-0 text-center text-sm font-bold text-foreground focus-visible:ring-0"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() => adjustValue(unit.key, -1)}
                        className="w-full py-1.5 flex items-center justify-center text-muted-foreground hover:text-primary active:scale-95 transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {day.isReviewDay && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  ملاحظة اختيارية (ما الذي ثبّتَّه؟)
                </Label>
                <Input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: تثبيت سورة الكهف أو أول ربعين من البقرة..."
                  className="h-10 rounded-xl border-input text-right text-sm text-foreground"
                  dir="rtl"
                />
              </div>
            )}

            {/* ✅ تصغير حجم خط الإجمالي المحسوب ليتناسق مع بقية عناصر النافذة */}
            <div className={`bg-card border rounded-xl p-3.5 text-center mt-3 transition-colors ${
              guidedFilled ? "border-primary/40 bg-primary/5" : "border-border/60"
            }`}>
              <p className="text-xs text-muted-foreground">الإجمالي المحسوب</p>
              {calculatedVerses > 0 ? (
                <p className="text-xl sm:text-2xl font-bold text-primary mt-1 leading-snug">
                  {formatQuranUnits(calculatedVerses, startPage)}
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground mt-1.5">
                  لم يُحدد مقدار بعد
                </p>
              )}
            </div>

            {!day.isReviewDay && (isLess || isMore) && (
              <div className={`text-center text-sm font-semibold rounded-xl py-3 px-4 mt-3 ${
                isLess
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}>
                {isLess ? (
                  <><BookOpen className="w-4 h-4 inline me-1" /> تبقى {getDiffDisplay()}</>
                ) : (
                  <><Check className="w-4 h-4 inline me-1" /> أنجزت {getDiffDisplay()} زيادة</>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-2xl font-semibold">
            إلغاء
          </Button>
          {!day.isOff && day.status !== "skipped" && onSkip && (
            <Button
              type="button"
              onClick={handleSkip}
              className="flex-1 rounded-2xl bg-accent/15 text-accent hover:bg-accent/25 font-semibold"
            >
              <SkipForward className="w-4 h-4 me-1.5" /> تخطي اليوم
            </Button>
          )}
          {alreadyRecorded && (
            <Button type="button" onClick={handleUndo} className="flex-1 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold">
              <RotateCcw className="w-4 h-4 me-1.5" /> تراجع
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-2xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={calculatedVerses === 0}
          >
            <Check className="w-4 h-4 me-1.5" /> حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}