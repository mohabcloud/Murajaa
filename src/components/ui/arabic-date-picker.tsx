// src/components/ui/arabic-date-picker.tsx
import * as React from "react";
import { format, parse } from "date-fns";
import { arSA } from "date-fns/locale/ar-SA";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicManual = (num: number): string => {
  return num.toString().split('').map(d => arabicDigits[parseInt(d)]).join('');
};

interface ArabicDatePickerProps {
  value: string;
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

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
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
        <button
          type="button"
          disabled={disabled}
          className={cn(
            // ✅ كلاسات ثابتة، بدون isActive — يعتمد على open فقط
            "group w-full min-h-[40px] px-3 rounded-xl text-base leading-none",
            "flex items-center gap-2 text-right",
            "border border-input bg-transparent",
            "transition-colors duration-150",
            "hover:border-primary",
            "focus-visible:border-primary",
            "data-[state=open]:border-primary",
            !value && "text-muted-foreground group-hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          style={{
            minHeight: '40px',
            height: '40px',
            paddingTop: '0',
            paddingBottom: '0',
          }}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate" style={{ lineHeight: '24px', fontSize: '15px' }}>
            {value && selectedDate ? (
              <span
                dir="rtl"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{toArabicManual(selectedDate.getDate())}</span>
                <span>{format(selectedDate, "MMMM", { locale: arSA })}</span>
                <span>{toArabicManual(selectedDate.getFullYear())}</span>
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      {/* @ts-expect-error - Radix UI PopoverContent types issue with children */}
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <div dir="rtl">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={arSA}
            formatters={{
              formatDay: (date) => toArabicManual(date.getDate()),
              formatWeekdayName: (date) => format(date, "EEEEEE", { locale: arSA }),
            }}
            components={{
              CaptionLabel: ({ displayMonth }: { displayMonth: Date; id?: string }) => (
                <span
                  dir="rtl"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  <span>{format(displayMonth, "MMMM", { locale: arSA })}</span>
                  <span>{toArabicManual(displayMonth.getFullYear())}</span>
                </span>
              ),
              IconLeft: () => <ChevronRight className="h-4 w-4" />,
              IconRight: () => <ChevronLeft className="h-4 w-4" />,
            }}
            styles={{
              caption: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.5rem',
              },
              head_cell: { fontWeight: "bold" },
            }}
            modifiersClassNames={{
              selected: "bg-primary text-primary-foreground rounded-md",
              today: "border border-primary",
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}