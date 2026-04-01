import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface MonthRange {
  start: { month: number; year: number };
  end: { month: number; year: number };
}

interface MonthRangePickerProps {
  value?: MonthRange | null;
  onChange: (value: MonthRange | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

function toKey(month: number, year: number) {
  return year * 12 + month;
}

export function MonthRangePicker({
  value,
  onChange,
  placeholder = "Selecione o período",
  className,
  disabled = false,
  minYear = 2020,
  maxYear = new Date().getFullYear() + 5,
}: MonthRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(
    value?.start?.year || new Date().getFullYear()
  );
  const [pendingStart, setPendingStart] = React.useState<{
    month: number;
    year: number;
  } | null>(null);
  const [mode, setMode] = React.useState<"months" | "years">("months");
  const [yearGridStart, setYearGridStart] = React.useState(
    Math.floor((value?.start?.year || new Date().getFullYear()) / 12) * 12
  );

  React.useEffect(() => {
    if (value?.start?.year) setViewYear(value.start.year);
  }, [value?.start?.year]);

  React.useEffect(() => {
    if (open) {
      setPendingStart(null);
      setMode("months");
    }
  }, [open]);

  const handleMonthClick = (month: number) => {
    const clicked = { month, year: viewYear };

    if (!pendingStart) {
      setPendingStart(clicked);
    } else {
      const startKey = toKey(pendingStart.month, pendingStart.year);
      const endKey = toKey(clicked.month, clicked.year);

      if (endKey >= startKey) {
        onChange({ start: pendingStart, end: clicked });
      } else {
        onChange({ start: clicked, end: pendingStart });
      }
      setPendingStart(null);
      setOpen(false);
    }
  };

  const formatDisplay = () => {
    if (!value) return null;
    const s = `${MONTHS[value.start.month]}/${value.start.year}`;
    const e = `${MONTHS[value.end.month]}/${value.end.year}`;
    return s === e ? s : `${s} — ${e}`;
  };

  const isInRange = (month: number) => {
    if (!value) return false;
    const key = toKey(month, viewYear);
    return (
      key >= toKey(value.start.month, value.start.year) &&
      key <= toKey(value.end.month, value.end.year)
    );
  };

  const isStart = (month: number) =>
    value?.start?.month === month && value?.start?.year === viewYear;
  const isEnd = (month: number) =>
    value?.end?.month === month && value?.end?.year === viewYear;
  const isPending = (month: number) =>
    pendingStart?.month === month && pendingStart?.year === viewYear;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-11 justify-start text-left font-normal gap-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          {formatDisplay() || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 pointer-events-auto"
        align="start"
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            {mode === "months" ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    viewYear > minYear && setViewYear(viewYear - 1)
                  }
                  disabled={viewYear <= minYear}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setYearGridStart(Math.floor(viewYear / 12) * 12);
                    setMode("years");
                  }}
                  className="text-sm font-semibold hover:underline focus:outline-none"
                >
                  {viewYear}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    viewYear < maxYear && setViewYear(viewYear + 1)
                  }
                  disabled={viewYear >= maxYear}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
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

          {/* Hint */}
          {mode === "months" && (
            <p className="text-[10px] text-center text-gray-500 mb-2">
              {pendingStart
                ? `Início: ${MONTHS[pendingStart.month]}/${pendingStart.year} — selecione o fim`
                : "Selecione o mês de início"}
            </p>
          )}

          {/* Months grid */}
          {mode === "months" && (
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((name, index) => {
                const selected =
                  isStart(index) || isEnd(index) || isPending(index);
                const inRange = isInRange(index) && !selected;
                const isCurrent =
                  index === new Date().getMonth() &&
                  viewYear === new Date().getFullYear();

                return (
                  <Button
                    key={name}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 text-xs font-medium",
                      selected && "bg-gray-900 text-white hover:bg-gray-800",
                      inRange && "bg-gray-100 text-gray-900",
                      isCurrent &&
                        !selected &&
                        !inRange &&
                        "bg-gray-50 border border-gray-300"
                    )}
                    onClick={() => handleMonthClick(index)}
                  >
                    {name}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Years grid */}
          {mode === "years" && (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => yearGridStart + i).map(
                (y) => {
                  const isCurrentYear = y === new Date().getFullYear();
                  const isSelected = y === viewYear;
                  return (
                    <Button
                      key={y}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-9 text-xs font-medium",
                        isSelected &&
                          "bg-gray-900 text-gray-50 hover:bg-gray-800",
                        isCurrentYear &&
                          !isSelected &&
                          "bg-gray-100 text-gray-900 font-semibold"
                      )}
                      onClick={() => {
                        setViewYear(y);
                        setMode("months");
                      }}
                      disabled={y < minYear || y > maxYear}
                    >
                      {y}
                    </Button>
                  );
                }
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Convert a MonthRange to start/end date strings */
export function monthRangeToDateStrings(
  range: MonthRange | null
): { start: string; end: string } {
  if (!range) return { start: "", end: "" };
  const { start, end } = range;
  const startStr = `${start.year}-${String(start.month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(end.year, end.month + 1, 0).getDate();
  const endStr = `${end.year}-${String(end.month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start: startStr, end: endStr };
}
