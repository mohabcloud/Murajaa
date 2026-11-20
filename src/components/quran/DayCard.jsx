import React from "react";
import { Check, X, Clock, Coffee, RefreshCw } from "lucide-react";
import { formatQuranUnits, toArabicNumbers, formatArabicDate, getPlanLabels } from "@/lib/quranPlanEngine";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusConfig = {
  completed: { icon: Check, bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", label: "مُنجَز" },
  partial: { icon: Clock, bg: "bg-accent/10", text: "text-accent", border: "border-accent/20", label: "جزئي" },
  skipped: { icon: X, bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "مُتخطّى" },
  pending: { icon: Clock, bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border", label: "قادم" },
};

export default function DayCard({ day, isToday, onRecord, planType = "review" }) {
  const labels = getPlanLabels(planType);

  // 1. يوم الإجازة الأسبوعية (راحة تامة)
  if (day.isOff) {
    return (
      <div className="bg-secondary/40 rounded-2xl border border-border/40 p-4 opacity-75">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-default">
                    <Coffee className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">{day.dayName}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  يوم راحة تامة
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            إجازة
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {formatArabicDate(day.date)}
        </p>
      </div>
    );
  }

  // ✅ 2. يوم التثبيت / الربط والتجميع (بطاقة مستقلة ومميزة بصرياً)
  if (day.isReviewDay) {
    const config = statusConfig[day.status] || statusConfig.pending;
    const recordedAmount = day.consolidationVerses || day.completedVerses || 0;

    return (
      <div
        className={`rounded-2xl border p-4 transition-all duration-300 ${
          isToday
            ? "bg-accent/10 border-accent/40 shadow-sm shadow-accent/10 ring-1 ring-accent/20"
            : day.status === "completed"
            ? "bg-primary/10 border-primary/25"
            : "bg-accent/5 border-accent/25"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-2xl flex items-center justify-center ${
              day.status === "completed" ? "bg-primary text-primary-foreground" : "bg-accent/20 text-accent"
            }`}>
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">{day.dayName}</span>
              {isToday && <span className="text-xs text-accent font-bold mr-2">اليوم</span>}
            </div>
          </div>
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-accent/15 text-accent">
            {labels.consolidationNoun}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          {formatArabicDate(day.date)}
        </p>

        <div className="space-y-1.5">
          {day.targetVerses > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">المقترح (الدورة):</span>
                <span className="font-bold text-foreground">
                  {formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}
                </span>
              </div>
              {day.targetStartPage && (
                <div className="text-xs text-muted-foreground font-medium">
                  ص{toArabicNumbers(day.targetStartPage)} ← ص{toArabicNumbers(day.targetEndPage)}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">اختر ما تريد تثبيته من المصحف</p>
          )}

          {day.note && (
            <div className="text-[11px] text-accent font-medium mt-1 bg-accent/10 rounded-lg py-1 px-2 truncate">
              {day.note}
            </div>
          )}
        </div>

        {day.status !== "pending" && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الحالة:</span>
              <span className={`font-bold ${config.text}`}>
                {day.status === "skipped"
                  ? "مُتخطّى"
                  : recordedAmount > 0
                  ? formatQuranUnits(recordedAmount, day.targetStartPage || 1)
                  : config.label}
              </span>
            </div>
          </div>
        )}

        {isToday && onRecord && (
          <button
            onClick={() => onRecord(day)}
            className="mt-3 w-full rounded-2xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground shadow-md transition-all duration-200 hover:bg-accent/90 active:scale-[0.98]"
          >
            {day.status !== "pending" ? `تعديل ${labels.consolidationNoun}` : `تسجيل ${labels.consolidationNoun}`}
          </button>
        )}
      </div>
    );
  }

  // 3. يوم الحفظ / المراجعة الأساسي
  const config = statusConfig[day.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-300 ${
        isToday
          ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/5 ring-1 ring-primary/10"
          : `${config.bg} ${config.border}`
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-2xl flex items-center justify-center ${isToday ? 'bg-primary text-primary-foreground' : config.bg}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${isToday ? '' : config.text}`} />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{day.dayName}</span>
            {isToday && <span className="text-xs text-primary font-bold mr-2">اليوم</span>}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {formatArabicDate(day.date)}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">الورد:</span>
          <span className="font-bold text-foreground">{formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}</span>
        </div>
        {day.targetStartPage && (
          <div className="text-xs text-muted-foreground font-medium">
            ص{toArabicNumbers(day.targetStartPage)} ← ص{toArabicNumbers(day.targetEndPage)}
          </div>
        )}
        {day.targetQuarterName && (
          <div className="text-[11px] text-primary font-semibold mt-1 bg-primary/10 rounded-lg py-0.5 px-2 inline-block leading-relaxed max-w-full truncate">
            {day.targetQuarterName}
          </div>
        )}
      </div>

      {day.status !== "pending" && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">المُنجَز:</span>
            <span className={`font-bold ${day.completedVerses >= day.targetVerses ? 'text-primary' : 'text-accent'}`}>
              {formatQuranUnits(day.completedVerses, day.targetStartPage || 1)}
            </span>
          </div>
        </div>
      )}

      {isToday && onRecord && (
        <button
          onClick={() => onRecord(day)}
          className="mt-3 w-full rounded-2xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
        >
          {day.status !== "pending" ? "تعديل الإنجاز" : "تسجيل الإنجاز"}
        </button>
      )}
    </div>
  );
}