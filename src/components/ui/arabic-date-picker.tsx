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
  const [isActive, setIsActive] = React.useState(false);

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      onChange(format(localDate, "yyyy-MM-dd"));
    } else {
      onChange("");
    }
    setOpen(false);
    setIsActive(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setIsActive(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          className={cn(
            "w-full justify-start text-right font-normal h-11 px-3",
            "select-none focus:outline-none transition-all duration-300 rounded-md border",
            "flex items-center gap-2",
            isActive ? "bg-primary/10 border-primary/50" : "bg-transparent border-input",
            !value && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {value ? (
            <span>
              {format(selectedDate!, "dd MMMM yyyy", { locale: arSA })}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
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
            components={{
              IconLeft: () => <ChevronRight className="h-4 w-4" />,
              IconRight: () => <ChevronLeft className="h-4 w-4" />,
            }}
            styles={{
              caption: { fontSize: "1rem", fontWeight: "bold" },
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