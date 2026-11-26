// src/components/quran/ScheduleView.jsx
import React, { useState, useMemo } from "react";
import DayCard from "./DayCard";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getLocalToday, toArabicNumbers } from "@/lib/quranPlanEngine";

function formatArabicDaysCount(count) {
  if (count === 1) return "يوم واحد";
  if (count === 2) return "يومان";
  const ar = toArabicNumbers(count);
  const mod100 = count % 100;
  if (mod100 >= 3 && mod100 <= 10) return `${ar} أيام`;
  return `${ar} يوماً`;
}

export default function ScheduleView({ schedule, onRecordDay, onQuickComplete, planType = "review" }) {
  const [viewMode, setViewMode] = useState("default");
  const today = getLocalToday();

  const futureDays = useMemo(() => {
    return schedule.filter((day) => day.date >= today);
  }, [schedule, today]);

  // ✅ عرض ٤ أيام افتراضياً و٧ أيام عند الضغط على "عرض المزيد"
  const defaultLimit = 4;
  const moreLimit = 7;

  const displayDays = useMemo(() => {
    const limit = viewMode === "default" ? defaultLimit : moreLimit;
    return futureDays.slice(0, limit);
  }, [futureDays, viewMode]);

  const displayedCount = displayDays.length;
  const remainingFutureDays = Math.max(0, futureDays.length - displayedCount);
  const canToggleMore = futureDays.length > defaultLimit;

  const toggleView = () => {
    setViewMode((prev) => (prev === "default" ? "more" : "default"));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold font-heading text-foreground">الجدول اليومي</h3>
        </div>

        {canToggleMore && (
          <button
            type="button"
            onClick={toggleView}
            className="flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {viewMode === "default" ? "عرض المزيد" : "عرض أقل"}
            {viewMode === "default" ? (
              <ChevronDown className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <ChevronUp className="w-4 h-4 stroke-[2.2]" />
            )}
          </button>
        )}
      </div>

      {displayDays.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد أيام متبقية في الخطة
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayDays.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              isToday={day.date === today}
              onRecord={onRecordDay}
              onQuickComplete={onQuickComplete}
              planType={planType}
            />
          ))}
        </div>
      )}

      {displayedCount > 0 && (
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            {remainingFutureDays === 0
              ? `يُعرَض ${formatArabicDaysCount(displayedCount)} (كامل المتبقي في الخطة)`
              : `يُعرَض ${formatArabicDaysCount(displayedCount)} · باقي ${formatArabicDaysCount(remainingFutureDays)} في الخطة`}
          </p>
        </div>
      )}
    </div>
  );
}