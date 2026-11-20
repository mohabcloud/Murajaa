// src/components/quran/FlexibleEntryPanel.jsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, BookOpen, RotateCcw, ChevronUp, ChevronDown, LayoutGrid, Target, SkipForward, RefreshCw } from "lucide-react";
import {
  formatQuranUnits,
  flexibleInputToVerses,
  versesToPagesCount,
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

  const labels = getPlanLabels(planType);

  useEffect(() => {
    if (day) {
      setNote(day.note || "");
    }
  }, [day]);

  const startPage = input.customStartPage || day?.targetStartPage || 1;
  const calculatedVerses = flexibleInputToVerses(input, startPage);
  const targetVerses = day?.targetVerses || 0;
  const targetPages = day?.targetStartPage && day?.targetEndPage
    ? (day.targetEndPage - day.targetStartPage + 1)
    : versesToPagesCount(targetVerses, day?.targetStartPage || 1);

  const diff = day ? (calculatedVerses - targetVerses) : 0;

  // ✅ تعبئة ورد الدورة السابقة المقترح بدقة
  const fillGuidedReview = () => {
    if (day && day.targetVerses > 0) {
      setInput({
        juz: 0,
        hizb: 0,
        rub: 0,
        pages: 0,
        verses: day.targetVerses,
        customStartPage: day.targetStartPage || 1,
      });
      if (!note && day.targetStartPage && day.targetEndPage) {
        setNote(`${labels.consolidationNoun} ص${toArabicNumbers(day.targetStartPage)} إلى ص${toArabicNumbers(day.targetEndPage)}`);
      }
    }
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

  const adjustValue = (key, amount) => setInput(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + amount) }));

  if (!day) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-xl text-foreground">
            {day.isReviewDay
              ? (alreadyRecorded ? `تعديل ${labels.consolidationNoun}` : `تسجيل ${labels.consolidationNoun}`)
              : (alreadyRecorded ? "تعديل إنجاز اليوم" : "تسجيل إنجاز اليوم")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-5">
          <div className="text-center bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">
              {day.dayName} - {formatArabicDate(day.date)}
            </p>
            {day.isOff ? (
              <p className="text-lg font-bold text-foreground mt-1">☕ يوم إجازة</p>
            ) : day.isReviewDay ? (
              <div className="mt-1 space-y-1">
                <p className="text-base font-bold text-foreground flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-accent" />
                  <span>{labels.consolidationNoun} (مقترح الدورة السابقة):</span>
                </p>
                {targetVerses > 0 ? (
                  <p className="text-lg font-bold text-accent">
                    {formatQuranUnits(targetVerses, day.targetStartPage || 1)}
                    {day.targetStartPage && (
                      <span className="text-xs font-normal text-muted-foreground mr-2">
                        (ص{toArabicNumbers(day.targetStartPage)} ← ص{toArabicNumbers(day.targetEndPage)})
                      </span>
                    )}
                  </p>
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

          {day.isReviewDay && day.targetVerses > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={fillGuidedReview}
              className="w-full rounded-xl border-accent/40 text-accent hover:bg-accent/10 hover:text-accent font-semibold"
            >
              <Target className="w-4 h-4 ml-2" /> تعبئة بمقترح الدورة السابقة
            </Button>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-foreground">
                {day.isReviewDay ? `ماذا ثبّتَّ اليوم؟ (اختيار حر)` : `ماذا أنجزت اليوم؟`}
              </Label>
              <button
                type="button"
                onClick={() => setUseVisualMode(!useVisualMode)}
                className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-primary/20 transition-colors"
              >
                {useVisualMode ? <><Check className="w-3 h-3"/> إدخال رقمي</> : <><LayoutGrid className="w-3 h-3"/> واجهة المصحف</>}
              </button>
            </div>

            <div className={useVisualMode ? "" : "hidden"}>
              {/* ✅ في يوم التثبيت: إتاحة اختيار أي نطاق من كامل المصحف (١ إلى ٦٠٤) */}
              <QuranInteractivePicker
                targetStartPage={day?.targetStartPage || 1}
                targetEndPage={day?.targetEndPage || 604}
                planStartPage={1}
                planEndPage={604}
                onSelectionChange={(data) => {
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

            <div className={useVisualMode ? "hidden" : ""}>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[{ key: "juz", label: "أجزاء" }, { key: "hizb", label: "أحزاب" }, { key: "rub", label: "أرباع" }, { key: "pages", label: "صفحات" }, { key: "verses", label: "آيات" }].map((unit) => (
                  <div key={unit.key} className="text-center space-y-1">
                    <Label className="text-[11px] text-muted-foreground block">{unit.label}</Label>
                    <div className="relative flex flex-col items-center bg-background border border-border/60 rounded-2xl p-1 focus-within:border-primary/50 transition-colors">
                      <button type="button" onClick={() => adjustValue(unit.key, 1)} className="text-muted-foreground hover:text-primary p-0.5 transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={toArabicNumbers(input[unit.key] || 0)}
                        onChange={(e) => {
                          const normalized = normalizeDigits(e.target.value).replace(/[^0-9]/g, '');
                          const val = parseInt(normalized, 10) || 0;
                          setInput(prev => ({ ...prev, [unit.key]: val }));
                        }}
                        className="h-7 w-full border-0 bg-transparent p-0 text-center text-sm font-bold text-foreground focus-visible:ring-0"
                        dir="rtl"
                      />
                      <button type="button" onClick={() => adjustValue(unit.key, -1)} className="text-muted-foreground hover:text-primary p-0.5 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ حقل ملاحظة اختياري لتدوين ما تم تثبيته في يوم التثبيت/الربط */}
            {day.isReviewDay && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  ملاحظة اختيارية (ما الذي ثبّتَّه؟)
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

            <div className="bg-card border border-border/60 rounded-xl p-4 text-center mt-3">
              <p className="text-sm text-muted-foreground">الإجمالي المحسوب</p>
              <p className="text-3xl font-bold text-primary">{formatQuranUnits(calculatedVerses, startPage)}</p>
            </div>

            {!day.isReviewDay && (isLess || isMore) && (
              <div className={`text-center text-sm font-semibold rounded-xl py-3 px-4 mt-3 ${
                isLess
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}>
                {isLess ? (
                  <><BookOpen className="w-4 h-4 inline ml-1" /> تبقى {getDiffDisplay()}</>
                ) : (
                  <><Check className="w-4 h-4 inline ml-1" /> أنجزت {getDiffDisplay()} زيادة</>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-2xl font-semibold">
            إلغاء
          </Button>
          {!day.isOff && day.status !== "skipped" && onSkip && (
            <Button
              type="button"
              onClick={handleSkip}
              className="flex-1 rounded-2xl bg-accent/15 text-accent hover:bg-accent/25 font-semibold"
            >
              <SkipForward className="w-4 h-4 ml-1.5" /> تخطي اليوم
            </Button>
          )}
          {alreadyRecorded && (
            <Button onClick={handleUndo} className="flex-1 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold">
              <RotateCcw className="w-4 h-4 ml-1.5" /> تراجع
            </Button>
          )}
          <Button
            onClick={handleSave}
            className="flex-1 rounded-2xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={calculatedVerses === 0}
          >
            <Check className="w-4 h-4 ml-1.5" /> حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}