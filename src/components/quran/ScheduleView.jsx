import React, { useState } from "react";
import DayCard from "./DayCard";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getLocalToday } from "@/lib/quranPlanEngine";

export default function ScheduleView({ schedule, onRecordDay }) {
  const [showAll, setShowAll] = useState(false);
  const today = getLocalToday();

  // إظهار أسبوع من الجدول حول اليوم الحالي
  const todayIndex = schedule.findIndex(d => d.date === today);
  const displayDays = showAll 
    ? schedule 
    : schedule.slice(
        Math.max(0, todayIndex - 2), 
        Math.min(schedule.length, todayIndex + 8)
      );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold font-heading text-foreground">الجدول اليومي</h3>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:text-primary"
        >
          {showAll ? "عرض أقل" : "عرض الكل"}
          {showAll ? <ChevronUp className="w-4 h-4 stroke-[2.2]" /> : <ChevronDown className="w-4 h-4 stroke-[2.2]" />}
        </button>
      </div>

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

      {!showAll && schedule.length > 10 && (
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            يُعرَض {displayDays.length} من أصل {schedule.length} يوم
          </p>
        </div>
      )}
    </div>
  );
}