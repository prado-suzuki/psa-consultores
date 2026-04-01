import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  disabled?: boolean | ((date: Date) => boolean);
  className?: string;
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

function Calendar({
  selected,
  onSelect,
  month,
  onMonthChange,
  disabled,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    month || selected || new Date()
  );
  const [mode, setMode] = React.useState<"days" | "months" | "years">("days");
  const [yearGridStart, setYearGridStart] = React.useState(
    Math.floor(currentMonth.getFullYear() / 12) * 12
  );

  React.useEffect(() => {
    if (month) setCurrentMonth(month);
  }, [month]);

  const updateMonth = (d: Date) => {
    setCurrentMonth(d);
    if (onMonthChange) onMonthChange(d);
  };

  const isDisabled = (date: Date) => {
    if (disabled === true) return true;
    if (typeof disabled === "function") return disabled(date);
    return false;
  };

  // Build 42-cell grid
  const year = currentMonth.getFullYear();
  const mo = currentMonth.getMonth();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, mo, 1).getDay();
  const daysInPrevMonth = new Date(year, mo, 0).getDate();
  const today = new Date();

  const cells: React.ReactNode[] = [];

  // Previous month fill
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push(
      <div
        key={`prev-${day}`}
        className="h-9 w-9 flex items-center justify-center text-xs text-gray-300 pointer-events-none"
      >
        {day}
      </div>
    );
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, mo, d);
    const isSelected = selected && isSameDay(date, selected);
    const isToday = isSameDay(date, today);
    const dayDisabled = isDisabled(date);

    cells.push(
      <button
        key={`day-${d}`}
        type="button"
        disabled={dayDisabled}
        onClick={() => onSelect?.(date)}
        className={cn(
          "h-9 w-9 rounded-md text-sm font-medium transition-colors",
          "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400",
          isSelected && "bg-gray-900 text-white hover:bg-gray-800",
          isToday && !isSelected && "bg-gray-100 text-gray-900 font-semibold",
          !isSelected && !isToday && "text-gray-700",
          dayDisabled && "opacity-50 pointer-events-none"
        )}
      >
        {d}
      </button>
    );
  }

  // Next month fill (to reach 42 cells)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push(
      <div
        key={`next-${d}`}
        className="h-9 w-9 flex items-center justify-center text-xs text-gray-300 pointer-events-none"
      >
        {d}
      </div>
    );
  }

  return (
    <div className={cn("w-[280px] p-3 pointer-events-auto", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {mode === "days" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateMonth(new Date(year, mo - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode("months")}
                className="text-sm font-semibold hover:underline focus:outline-none"
              >
                {MONTHS_FULL[mo]}
              </button>
              <button
                type="button"
                onClick={() => {
                  setYearGridStart(Math.floor(year / 12) * 12);
                  setMode("years");
                }}
                className="text-sm font-semibold hover:underline focus:outline-none"
              >
                {year}
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateMonth(new Date(year, mo + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {mode === "months" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateMonth(new Date(year - 1, mo, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => {
                setYearGridStart(Math.floor(year / 12) * 12);
                setMode("years");
              }}
              className="text-sm font-semibold hover:underline focus:outline-none"
            >
              {year}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateMonth(new Date(year + 1, mo, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {mode === "years" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYearGridStart((y) => y - 12)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">
              {yearGridStart} – {yearGridStart + 11}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYearGridStart((y) => y + 12)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Days view */}
      {mode === "days" && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="h-9 w-9 flex items-center justify-center text-xs font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">{cells}</div>
        </>
      )}

      {/* Months view */}
      {mode === "months" && (
        <div className="grid grid-cols-4 gap-2">
          {MONTHS_SHORT.map((m, i) => {
            const isCurrentMonth =
              i === today.getMonth() && year === today.getFullYear();
            const isSelected =
              selected &&
              i === selected.getMonth() &&
              year === selected.getFullYear();
            return (
              <Button
                key={m}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 text-xs font-medium",
                  isSelected && "bg-gray-900 text-white hover:bg-gray-800",
                  isCurrentMonth &&
                    !isSelected &&
                    "bg-gray-100 text-gray-900 font-semibold",
                )}
                onClick={() => {
                  updateMonth(new Date(year, i, 1));
                  setMode("days");
                }}
              >
                {m}
              </Button>
            );
          })}
        </div>
      )}

      {/* Years view */}
      {mode === "years" && (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => yearGridStart + i).map((y) => {
            const isCurrentYear = y === today.getFullYear();
            const isSelected = selected && y === selected.getFullYear();
            return (
              <Button
                key={y}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 text-xs font-medium",
                  isSelected && "bg-gray-900 text-white hover:bg-gray-800",
                  isCurrentYear &&
                    !isSelected &&
                    "bg-gray-100 text-gray-900 font-semibold",
                )}
                onClick={() => {
                  updateMonth(new Date(y, mo, 1));
                  setMode("months");
                }}
              >
                {y}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
