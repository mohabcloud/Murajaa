// src/components/ui/arabic-date-picker.tsx
import * as React from "react";
import { format, parse } from "date-fns";
import { arSA } from "date-fns/locale/ar-SA";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArabicDatePickerProps {
  value: string; // تنسيق YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ArabicDatePicker({
  value,
  onChange,
  placeholder = "اختر تاريخاً",
  className,
  disabled = false,
}: ArabicDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // تحويل النص (YYYY-MM-DD) إلى كائن Date
  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  // تحويل كائن Date إلى نص (YYYY-MM-DD)
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // نضبط التوقيت المحلي لتجنب مشاكل المنطقة الزمنية
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      onChange(format(localDate, "yyyy-MM-dd"));
    } else {
      onChange("");
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-right font-normal h-11 px-3",
            !value && "text-muted-foreground",
            className
          )}
          dir="rtl"
          onMouseDown={(e) => {
            // منع تحديد النص أو التظليل
            e.preventDefault();
          }}
        >
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0" />
          {value ? (
            <span className="font-arabic">
              {format(selectedDate!, "dd MMMM yyyy", { locale: arSA })}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir="rtl">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          locale={arSA}
          className="rtl"
          styles={{
            caption: { fontSize: "1rem", fontWeight: "bold" },
            head_cell: { fontWeight: "bold" },
          }}
          modifiersClassNames={{
            selected: "bg-primary text-primary-foreground rounded-md",
            today: "border border-primary",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}