import React from "react";
import { Check, X, Clock, Coffee, RefreshCw } from "lucide-react";
import { formatQuranUnits } from "@/lib/quranPlanEngine";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusConfig = {
  completed: { icon: Check, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "مُنجَز" },
  partial: { icon: Clock, bg: "bg-accent/10", text: "text-accent", border: "border-accent/20", label: "جزئي" },
  skipped: { icon: X, bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "مُتخطّى" },
  pending: { icon: Clock, bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border", label: "قادم" },
};

export default function DayCard({ day, isToday, onRecord }) {
  if (day.isOff) {
    return (
      <div className="bg-secondary/40 rounded-2xl border border-border/40 p-4 opacity-70">
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
                  {day.isReviewDay ? "يوم إجازة مخصص لتثبيت المراجعات السابقة" : "يوم راحة تام"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {day.isReviewDay ? "تثبيت" : "إجازة"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(day.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
        </p>
        {day.isReviewDay && day.targetVerses > 0 && (
          <div className="mt-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> ورد التثبيت:
              </span>
              <span className="font-bold text-primary">{formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const config = statusConfig[day.status];
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
            {isToday && <span className="text-xs text-primary font-medium mr-2">اليوم</span>}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {new Date(day.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">الورد: </span>
          <span className="font-bold text-foreground">{formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}</span>
        </div>
        {day.targetStartPage && (
          <div className="text-xs text-muted-foreground">
            ص{day.targetStartPage} ← ص{day.targetEndPage}
          </div>
        )}
        {day.targetQuarterName && (
          <div className="text-[11px] text-primary/80 font-medium mt-1 bg-primary/5 rounded-lg py-0.5 px-2 inline-block leading-relaxed max-w-full truncate">
            {day.targetQuarterName}
          </div>
        )}
      </div>

      {day.status !== "pending" && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">المُنجَز: </span>
            <span className={`font-bold ${day.completedVerses >= day.targetVerses ? 'text-emerald-600' : 'text-accent'}`}>
              {formatQuranUnits(day.completedVerses, day.targetStartPage || 1)}
            </span>
          </div>
        </div>
      )}

      {isToday && onRecord && (
        <button
          onClick={() => onRecord(day)}
          className="mt-3 w-full rounded-2xl bg-emerald-600 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-emerald-500 active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {day.status !== "pending" ? "تعديل الإنجاز" : "تسجيل الإنجاز"}
        </button>
      )}
    </div>
  );
}