import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, BookOpen, RotateCcw, ChevronUp, ChevronDown, LayoutGrid, Target } from "lucide-react";
import { formatQuranUnits, flexibleInputToVerses } from "@/lib/quranPlanEngine";
import QuranInteractivePicker from "@/components/QuranInteractivePicker";

export default function FlexibleEntryPanel({ open, onOpenChange, day, onSave, onUndo, alreadyRecorded }) {
  const [input, setInput] = useState({ juz: 0, hizb: 0, rub: 0, pages: 0, verses: 0 });
  const [useVisualMode, setUseVisualMode] = useState(false);

  const calculatedVerses = flexibleInputToVerses(input, day?.targetStartPage || 1);
  const targetPages = day?.targetPages || 0;
  const targetVerses = day?.targetVerses || 0;
  const diff = day ? (calculatedVerses - targetVerses) : 0;

  useEffect(() => {
    // يمكن إضافة أي تأثير جانبي هنا إذا لزم الأمر
  }, [input.verses]);

  // 🆕 دالة لتعبئة الحقول بالورد الموجه (أيام التثبيت)
  const fillGuidedReview = () => {
    if (day && day.targetVerses > 0) {
      // نقوم بتحويل الورد إلى صفحات تقريبية (نظام مرن)
      const pages = Math.ceil(day.targetVerses / 10); // تقريب
      setInput({ juz: 0, hizb: 0, rub: 0, pages: pages, verses: 0 });
    }
  };

  const isLess = diff < 0 && calculatedVerses > 0;
  const isMore = diff > 0;

  const getDiffDisplay = () => {
    const absDiff = Math.max(0, Math.abs(diff));
    if (absDiff < 15) return `${absDiff} آية`;
    const totalInputPages = (input.juz || 0) * 20 + (input.hizb || 0) * 10 + (input.rub || 0) * 2.5 + (input.pages || 0);
    const pageDiffAbs = Math.abs(totalInputPages - targetPages);
    if (input.verses > 0) {
      if (isLess) return `${Math.ceil(absDiff / 15)} صفحة تقريباً (أو ${absDiff} آية)`;
      else if (isMore) return `${Math.floor(pageDiffAbs)} صفحة و ${input.verses} آية`;
    }
    return `${Math.round(absDiff / 15)} صفحة`;
  };

  const resetInput = () => setInput({ juz: 0, hizb: 0, rub: 0, pages: 0, verses: 0 });
  const handleSave = () => { if (calculatedVerses === 0) return; onSave(day.date, calculatedVerses, input); onOpenChange(false); resetInput(); };
  const handleUndo = () => { onUndo(day.date); onOpenChange(false); resetInput(); };
  
  const handleQuickComplete = () => setInput({ juz: 0, hizb: 0, rub: 0, pages: day?.targetPages || 0, verses: 0 });
  const handleQuickHalf = () => setInput({ juz: 0, hizb: 0, rub: 0, pages: Math.round((day?.targetPages || 0) / 2), verses: 0 });
  const adjustValue = (key, amount) => setInput(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + amount) }));

  if (!day) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-xl">{alreadyRecorded ? "تعديل إنجاز اليوم" : "تسجيل إنجاز اليوم"}</DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-5">
          <div className="text-center bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{day.dayName} - {new Date(day.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}</p>
            {day.isOff ? (
              <p className="text-lg font-bold text-foreground mt-1">☕ يوم إجازة</p>
            ) : day.isReviewDay ? (
              <p className="text-lg font-bold text-foreground mt-1">
                🔄 تثبيت: <span className="text-primary">{formatQuranUnits(targetVerses, day.targetStartPage || 1)}</span>
              </p>
            ) : (
              <p className="text-lg font-bold text-foreground mt-1">الورد: <span className="text-primary">{formatQuranUnits(targetVerses, day.targetStartPage || 1)}</span></p>
            )}
          </div>

          {/* 🆕 زر التعبئة التلقائية لأيام التثبيت */}
          {day.isReviewDay && day.targetVerses > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fillGuidedReview} 
              className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5"
            >
              <Target className="w-4 h-4 ml-2" /> تعبئة بالورد الموجه (آخر أسبوع)
            </Button>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-foreground">ماذا راجعت اليوم؟</Label>
              <button onClick={() => setUseVisualMode(!useVisualMode)} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-primary/20 transition-colors">
                {useVisualMode ? <><Check className="w-3 h-3"/> إدخال رقمي</> : <><LayoutGrid className="w-3 h-3"/> واجهة المصحف</>}
              </button>
            </div>

            {useVisualMode ? (
              <QuranInteractivePicker 
                targetStartPage={day?.targetStartPage} 
                targetEndPage={day?.targetEndPage}
                onSelectionChange={(data) => {
                  if (data.versesCount > 0) {
                    setInput(prev => ({ ...prev, juz: 0, hizb: 0, rub: 0, pages: 0, verses: data.versesCount }));
                  } else {
                    setInput(prev => ({ ...prev, verses: 0 }));
                  }
                }}
              />
            ) : (
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[{ key: "juz", label: "أجزاء" }, { key: "hizb", label: "أحزاب" }, { key: "rub", label: "أرباع" }, { key: "pages", label: "صفحات" }, { key: "verses", label: "آيات" }].map((unit) => (
                  <div key={unit.key} className="text-center space-y-1">
                    <Label className="text-[11px] text-muted-foreground block">{unit.label}</Label>
                    <div className="relative flex flex-col items-center bg-background border border-border/60 rounded-2xl p-1">
                      <button type="button" onClick={() => adjustValue(unit.key, 1)} className="text-muted-foreground hover:text-foreground p-0.5"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <Input type="text" inputMode="numeric" value={input[unit.key] || 0} onChange={(e) => { const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0; setInput(prev => ({ ...prev, [unit.key]: val })); }} className="h-7 w-full border-0 bg-transparent p-0 text-center text-sm font-semibold focus-visible:ring-0" dir="ltr" />
                      <button type="button" onClick={() => adjustValue(unit.key, -1)} className="text-muted-foreground hover:text-foreground p-0.5"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-card border border-border/60 rounded-xl p-4 text-center mt-3">
              <p className="text-sm text-muted-foreground">الإجمالي المحسوب</p>
              <p className="text-3xl font-bold text-primary">{formatQuranUnits(calculatedVerses, day?.targetStartPage || 1)}</p>
            </div>

            {(isLess || isMore) && (
              <div className={`text-center text-sm font-medium rounded-xl py-3 px-4 mt-3 ${isLess ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"}`}>
                {isLess ? <><BookOpen className="w-4 h-4 inline ml-1" /> تبقى {getDiffDisplay()}</> : <><Check className="w-4 h-4 inline ml-1" /> أنجزت {getDiffDisplay()} زيادة</>}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-2xl">إلغاء</Button>
          {alreadyRecorded && (
            <Button onClick={handleUndo} className="flex-1 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20">
              <RotateCcw className="w-4 h-4 ml-2" /> تراجع
            </Button>
          )}
          <Button onClick={handleSave} className="flex-1 rounded-2xl bg-emerald-600" disabled={calculatedVerses === 0}><Check className="w-4 h-4 ml-2" /> حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}