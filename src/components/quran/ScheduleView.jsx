import React, { useState, useMemo } from "react";
import DayCard from "./DayCard";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getLocalToday, parseLocal, toLocalDateStr, toArabicNumbers } from "@/lib/quranPlanEngine";

function formatArabicDaysCount(count) {
  if (count === 1) return "يوم واحد";
  if (count === 2) return "يومان";
  const ar = toArabicNumbers(count);
  const mod100 = count % 100;
  if (mod100 >= 3 && mod100 <= 10) return `${ar} أيام`;
  return `${ar} يوماً`;
}

export default function ScheduleView({ schedule, onRecordDay, planType = "review" }) {
  const [viewMode, setViewMode] = useState("default");
  const today = getLocalToday();

  const futureDays = useMemo(() => {
    return schedule.filter(day => day.date >= today);
  }, [schedule, today]);

  const displayDays = useMemo(() => {
    const endDate = parseLocal(today);
    endDate.setDate(endDate.getDate() + (viewMode === "default" ? 4 : 13));
    const endStr = toLocalDateStr(endDate);
    return futureDays.filter(day => day.date <= endStr);
  }, [futureDays, today, viewMode]);

  const displayedCount = displayDays.length;

  const toggleView = () => {
    setViewMode(viewMode === "default" ? "more" : "default");
  };

  // ✅ حساب الأيام المتبقية من الأيام القادمة فعلياً (وليس الأيام الماضية المنتهية)
  const remainingFutureDays = Math.max(0, futureDays.length - displayedCount);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold font-heading text-foreground">الجدول اليومي</h3>
        </div>
        <button
          onClick={toggleView}
          className="flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:text-primary"
        >
          {viewMode === "default" ? "عرض أكثر" : "عرض أقل"}
          {viewMode === "default" ? (
            <ChevronDown className="w-4 h-4 stroke-[2.2]" />
          ) : (
            <ChevronUp className="w-4 h-4 stroke-[2.2]" />
          )}
        </button>
      </div>

      {displayDays.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد أيام متبقية في الخطة
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayDays.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              isToday={day.date === today}
              onRecord={onRecordDay}
              planType={planType}
            />
          ))}
        </div>
      )}

      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground">
          {viewMode === "default"
            ? `يُعرَض ${formatArabicDaysCount(displayedCount)} (الأيام الخمسة القادمة)`
            : `يُعرَض ${formatArabicDaysCount(displayedCount)} (الأسبوعين القادمين)`}
          {remainingFutureDays > 0 && (
            <span className="block mt-1">
              باقي {formatArabicDaysCount(remainingFutureDays)} في الخطة
            </span>
          )}
        </p>
      </div>
    </div>
  );
}