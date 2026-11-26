// src/components/quran/DayCard.jsx
import React from "react";
import { Check, X, Clock, Coffee, RefreshCw, ArrowLeft, SlidersHorizontal } from "lucide-react";
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

function PageRangeDisplay({ startPage, endPage }) {
  if (!startPage) return null;
  if (!endPage || startPage === endPage) {
    return (
      <span className="inline-flex items-center text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-md">
        صفحة{"\u00A0"}{toArabicNumbers(startPage)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-md">
      <span>ص{"\u00A0"}{toArabicNumbers(startPage)}</span>
      <ArrowLeft className="w-3 h-3 shrink-0" />
      <span>ص{"\u00A0"}{toArabicNumbers(endPage)}</span>
    </span>
  );
}

export default function DayCard({ day, isToday, onRecord, onQuickComplete, planType = "review" }) {
  if (!day) return null;

  const labels = getPlanLabels(planType);
  const consolidationProposalLabel = labels.isMemorization ? "مقترح التثبيت" : "مقترح الربط";
  const canQuickComplete = isToday && day.status === "pending" && (day.targetVerses || 0) > 0 && !!onQuickComplete;

  // 1. يوم الإجازة الأسبوعية (راحة تامة)
  if (day.isOff) {
    if (isToday) {
      return (
        <div className="col-span-full bg-secondary/45 rounded-2xl border border-border/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground">{day.dayName}</span>
                <span className="text-xs text-muted-foreground">· {formatArabicDate(day.date)}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-medium">
                  إجازة اليوم
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">يوم راحة تامة — استمتع بيومك!</p>
            </div>
          </div>
          {onRecord && (
            <button
              type="button"
              onClick={() => onRecord(day)}
              className="rounded-xl border border-border bg-background/70 py-2 px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary shrink-0"
            >
              تسجيل إنجاز استثنائي
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="h-full bg-secondary/35 rounded-2xl border border-border/40 p-4 flex flex-col justify-between gap-3 opacity-85">
        <div className="flex items-start justify-between gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2.5 cursor-default min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                    <Coffee className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground leading-tight">{day.dayName}</p>
                    <p className="text-xs text-muted-foreground/80 mt-0.5">{formatArabicDate(day.date)}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                يوم راحة تامة
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
            إجازة
          </span>
        </div>

        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">يوم راحة تامة</p>
        </div>
      </div>
    );
  }

  // 2. يوم التثبيت / الربط والتجميع
  if (day.isReviewDay) {
    const config = statusConfig[day.status] || statusConfig.pending;
    const recordedAmount = day.consolidationVerses || day.completedVerses || 0;

    if (isToday) {
      return (
        <div className="col-span-full rounded-2xl border p-4 sm:p-5 bg-primary/5 border-primary/30 shadow-sm shadow-primary/5 ring-1 ring-primary/10 transition-all duration-300 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2.5 min-w-0 flex-1">
              <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground">{day.dayName}</span>
                    <span className="text-xs text-muted-foreground ms-2">{formatArabicDate(day.date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
                    اليوم
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-accent/15 text-accent border border-accent/25">
                    {labels.consolidationNoun}
                  </span>
                </div>
              </div>

              {day.targetVerses > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{consolidationProposalLabel}:</span>
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    {formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}
                  </span>
                  <PageRangeDisplay startPage={day.targetStartPage} endPage={day.targetEndPage} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">اختر ما تريد تثبيته من المصحف</p>
              )}

              {day.note && (
                <div className="text-xs text-primary font-medium bg-primary/10 rounded-lg py-1 px-2.5 inline-block max-w-full truncate leading-normal">
                  {day.note}
                </div>
              )}

              {day.status !== "pending" && (
                <div className="flex items-center gap-2 text-xs pt-1">
                  <span className="text-muted-foreground">الحالة:</span>
                  <span className={`font-bold ${config.text}`}>
                    {day.status === "skipped"
                      ? "مُتخطّى"
                      : recordedAmount > 0
                      ? formatQuranUnits(recordedAmount, day.targetStartPage || 1)
                      : config.label}
                  </span>
                </div>
              )}
            </div>

            {/* ✅ تخطيط مرن للأزرار يمنع تجاوز الحواف على شاشات الهواتف الضيقة */}
            {onRecord && (
              <div className="w-full sm:w-auto sm:min-w-[235px] shrink-0">
                {canQuickComplete ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onQuickComplete(day)}
                      className="flex-[3_1_150px] min-w-0 rounded-xl bg-primary h-10 px-3 sm:px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span className="truncate">{labels.isMemorization ? "أتممت التثبيت" : "أتممت الربط"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRecord(day)}
                      className="flex-[2_1_95px] sm:flex-none min-w-0 rounded-xl border border-primary/30 bg-background/70 h-10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                      <span>تخصيص</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRecord(day)}
                    className="w-full rounded-xl bg-primary h-10 px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
                  >
                    {day.status !== "pending" ? `تعديل ${labels.consolidationNoun}` : `تسجيل ${labels.consolidationNoun}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`h-full rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all duration-300 ${
          day.status === "completed"
            ? "bg-primary/10 border-primary/25"
            : `${config.bg} ${config.border}`
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              day.status === "completed" ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
            }`}>
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">{day.dayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatArabicDate(day.date)}</p>
            </div>
          </div>
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-accent/15 text-accent border border-accent/25 shrink-0">
            {labels.consolidationNoun}
          </span>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/35">
          {day.targetVerses > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">{consolidationProposalLabel}</p>
              <p className="text-sm sm:text-base font-bold text-foreground leading-snug">
                {formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}
              </p>
              <div className="pt-0.5">
                <PageRangeDisplay startPage={day.targetStartPage} endPage={day.targetEndPage} />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">اختر ما تريد تثبيته من المصحف</p>
          )}

          {day.note && (
            <div className="text-[11px] text-primary font-medium mt-1 bg-primary/10 rounded-lg py-1 px-2 truncate leading-normal">
              {day.note}
            </div>
          )}

          {day.status !== "pending" && (
            <div className="pt-2 mt-1 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الحالة:</span>
              <span className={`font-bold ${config.text}`}>
                {day.status === "skipped"
                  ? "مُتخطّى"
                  : recordedAmount > 0
                  ? formatQuranUnits(recordedAmount, day.targetStartPage || 1)
                  : config.label}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. يوم الحفظ / المراجعة الأساسي
  const config = statusConfig[day.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const isTodayPending = isToday && day.status === "pending";

  if (isToday) {
    return (
      <div className="col-span-full rounded-2xl border p-4 sm:p-5 bg-primary/5 border-primary/30 shadow-sm shadow-primary/5 ring-1 ring-primary/10 transition-all duration-300 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2.5 min-w-0 flex-1">
            <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <StatusIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground">{day.dayName}</span>
                  <span className="text-xs text-muted-foreground ms-2">{formatArabicDate(day.date)}</span>
                </div>
              </div>
              {isTodayPending ? (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
                  ورد اليوم
                </span>
              ) : (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-foreground">
                {formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}
              </span>
              <PageRangeDisplay startPage={day.targetStartPage} endPage={day.targetEndPage} />
              {day.targetQuarterName && (
                <span className="text-[11px] text-primary font-semibold bg-primary/10 rounded-md py-0.5 px-2 leading-normal">
                  {day.targetQuarterName}
                </span>
              )}
            </div>

            {day.status !== "pending" && (
              <div className="flex items-center gap-2 text-xs pt-0.5">
                <span className="text-muted-foreground">المُنجَز:</span>
                <span className={`font-bold ${day.completedVerses >= day.targetVerses ? "text-primary" : "text-accent"}`}>
                  {day.status === "skipped"
                    ? "مُتخطّى"
                    : formatQuranUnits(day.completedVerses, day.targetStartPage || 1)}
                </span>
              </div>
            )}
          </div>

          {onRecord && (
            <div className="w-full sm:w-auto sm:min-w-[235px] shrink-0">
              {canQuickComplete ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onQuickComplete(day)}
                    className="flex-[3_1_150px] min-w-0 rounded-xl bg-primary h-10 px-3 sm:px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="truncate">أتممت الورد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRecord(day)}
                    className="flex-[2_1_95px] sm:flex-none min-w-0 rounded-xl border border-primary/30 bg-background/70 h-10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span>تخصيص</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRecord(day)}
                  className="w-full rounded-xl bg-primary h-10 px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
                >
                  {day.status !== "pending" ? "تعديل الإنجاز" : "تسجيل الإنجاز"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all duration-300 ${config.bg} ${config.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${config.text}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{day.dayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatArabicDate(day.date)}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border/35">
        <p className="text-xs text-muted-foreground">الورد</p>
        <p className="text-sm sm:text-base font-bold text-foreground leading-snug">
          {formatQuranUnits(day.targetVerses, day.targetStartPage || 1)}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <PageRangeDisplay startPage={day.targetStartPage} endPage={day.targetEndPage} />
          {day.targetQuarterName && (
            <span className="text-[11px] text-primary font-semibold bg-primary/10 rounded-md py-0.5 px-2 leading-normal">
              {day.targetQuarterName}
            </span>
          )}
        </div>

        {day.status !== "pending" && (
          <div className="pt-2 mt-1 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">المُنجَز:</span>
            <span className={`font-bold ${day.completedVerses >= day.targetVerses ? "text-primary" : "text-accent"}`}>
              {day.status === "skipped"
                ? "مُتخطّى"
                : formatQuranUnits(day.completedVerses, day.targetStartPage || 1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}