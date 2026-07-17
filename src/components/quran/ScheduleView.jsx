import React, { useState, useMemo } from "react";
import DayCard from "./DayCard";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getLocalToday } from "@/lib/quranPlanEngine";

export default function ScheduleView({ schedule, onRecordDay }) {
  const [viewMode, setViewMode] = useState("default"); // "default" | "more"
  const today = getLocalToday();

  // تحديد الأيام المعروضة بناءً على وضع العرض
  const displayDays = useMemo(() => {
    if (viewMode === "default") {
      // عرض 5 أيام من اليوم (اليوم + 4 أيام قادمة)
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 4); // 5 أيام بما فيهم اليوم
      const endStr = endDate.toISOString().split("T")[0];
      return schedule.filter(day => day.date >= today && day.date <= endStr);
    } else {
      // عرض 14 يوم من اليوم (أسبوعين) - أو حتى نهاية الخطة إن كانت أقل
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 13); // 14 يوم بما فيهم اليوم
      const endStr = endDate.toISOString().split("T")[0];
      return schedule.filter(day => day.date >= today && day.date <= endStr);
    }
  }, [schedule, today, viewMode]);

  const totalDays = schedule.length;
  const displayedCount = displayDays.length;

  const toggleView = () => {
    setViewMode(viewMode === "default" ? "more" : "default");
  };

  // حساب عدد الأيام المتبقية بعد المعروض
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
            />
          ))}
        </div>
      )}

      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground">
          {viewMode === "default"
            ? `يُعرَض ${displayedCount} يوم (الأيام الخمسة القادمة)`
            : `يُعرَض ${displayedCount} يوم (الأسبوعين القادمين)`}
          {remainingDays > 0 && (
            <span className="block mt-1">
              باقي {remainingDays} يوم في الخطة
            </span>
          )}
        </p>
      </div>
    </div>
  );
}