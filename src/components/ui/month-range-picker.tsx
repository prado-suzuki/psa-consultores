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
  maxYear = new Date().getFullYear() + 1,
}: MonthRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(value?.start?.year || new Date().getFullYear());
  // Selection phase: null = nothing selected, 'start' = first click done awaiting second
  const [pendingStart, setPendingStart] = React.useState<{ month: number; year: number } | null>(null);

  React.useEffect(() => {
    if (value?.start?.year) setViewYear(value.start.year);
  }, [value?.start?.year]);

  // Reset pending when popover opens
  React.useEffect(() => {
    if (open) setPendingStart(null);
  }, [open]);

  const handleMonthClick = (month: number) => {
    const clicked = { month, year: viewYear };

    if (!pendingStart) {
      // First click — set start
      setPendingStart(clicked);
    } else {
      // Second click — determine order
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
    return key >= toKey(value.start.month, value.start.year) && key <= toKey(value.end.month, value.end.year);
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
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          {formatDisplay() || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 pointer-events-auto" align="start">
        <div className="p-3">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => viewYear > minYear && setViewYear(viewYear - 1)}
              disabled={viewYear <= minYear}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{viewYear}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => viewYear < maxYear && setViewYear(viewYear + 1)}
              disabled={viewYear >= maxYear}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-center text-muted-foreground mb-2">
            {pendingStart
              ? `Início: ${MONTHS[pendingStart.month]}/${pendingStart.year} — selecione o fim`
              : "Selecione o mês de início"}
          </p>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((name, index) => {
              const selected = isStart(index) || isEnd(index) || isPending(index);
              const inRange = isInRange(index) && !selected;
              const isCurrent = index === new Date().getMonth() && viewYear === new Date().getFullYear();

              return (
                <Button
                  key={name}
                  variant={selected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9 text-xs font-medium",
                    selected && "bg-teal-600 text-white hover:bg-teal-700",
                    inRange && "bg-teal-50 text-teal-700",
                    isCurrent && !selected && !inRange && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleMonthClick(index)}
                >
                  {name}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Convert a MonthRange to start/end date strings */
export function monthRangeToDateStrings(range: MonthRange | null): { start: string; end: string } {
  if (!range) return { start: "", end: "" };
  const { start, end } = range;
  const startStr = `${start.year}-${String(start.month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(end.year, end.month + 1, 0).getDate();
  const endStr = `${end.year}-${String(end.month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start: startStr, end: endStr };
}
