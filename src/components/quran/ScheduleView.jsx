import React, { useState, useMemo } from "react";
import DayCard from "./DayCard";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getLocalToday, parseLocal, toLocalDateStr, toArabicNumbers } from "@/lib/quranPlanEngine";

export default function ScheduleView({ schedule, onRecordDay, planType = "review" }) {
  const [viewMode, setViewMode] = useState("default");
  const today = getLocalToday();

  const displayDays = useMemo(() => {
    const endDate = parseLocal(today);
    endDate.setDate(endDate.getDate() + (viewMode === "default" ? 4 : 13));
    const endStr = toLocalDateStr(endDate);
    return schedule.filter(day => day.date >= today && day.date <= endStr);
  }, [schedule, today, viewMode]);

  const totalDays = schedule.length;
  const displayedCount = displayDays.length;

  const toggleView = () => {
    setViewMode(viewMode === "default" ? "more" : "default");
  };

  const remainingDays = totalDays - displayedCount;

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
            ? `يُعرَض ${toArabicNumbers(displayedCount)} يوم (الأيام الخمسة القادمة)`
            : `يُعرَض ${toArabicNumbers(displayedCount)} يوم (الأسبوعين القادمين)`}
          {remainingDays > 0 && (
            <span className="block mt-1">
              باقي {toArabicNumbers(remainingDays)} يوم في الخطة
            </span>
          )}
        </p>
      </div>
    </div>
  );
}