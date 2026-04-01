import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface MonthYearPickerProps {
  value?: { month: number; year: number } | null;
  onChange: (value: { month: number; year: number } | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Selecione o mês",
  className,
  disabled = false,
  minYear = 2020,
  maxYear = new Date().getFullYear() + 5,
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(
    value?.year || new Date().getFullYear()
  );
  const [mode, setMode] = React.useState<"months" | "years">("months");
  const [yearGridStart, setYearGridStart] = React.useState(
    Math.floor((value?.year || new Date().getFullYear()) / 12) * 12
  );

  React.useEffect(() => {
    if (value?.year) setViewYear(value.year);
  }, [value?.year]);

  React.useEffect(() => {
    if (open) setMode("months");
  }, [open]);

  const handleMonthSelect = (month: number) => {
    onChange({ month, year: viewYear });
    setOpen(false);
  };

  const formatDisplay = () => {
    if (!value) return null;
    return `${MONTHS[value.month]}/${value.year}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-11 justify-start text-left font-normal pl-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          {formatDisplay() || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 pointer-events-auto" align="start">
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            {mode === "months" ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewYear((y) => y - 1)}
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
                  onClick={() => setViewYear((y) => y + 1)}
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

          {/* Months grid */}
          {mode === "months" && (
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((monthName, index) => {
                const isSelected =
                  value?.month === index && value?.year === viewYear;
                const isCurrentMonth =
                  index === new Date().getMonth() &&
                  viewYear === new Date().getFullYear();

                return (
                  <Button
                    key={monthName}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 text-xs font-medium",
                      isSelected && "bg-gray-900 text-gray-50 hover:bg-gray-800",
                      isCurrentMonth &&
                        !isSelected &&
                        "bg-gray-100 text-gray-900 font-semibold"
                    )}
                    onClick={() => handleMonthSelect(index)}
                  >
                    {monthName}
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

// Helper para converter MonthYear para string de data (primeiro/último dia)
export function monthYearToDateString(
  value: { month: number; year: number } | null,
  position: "start" | "end"
): string {
  if (!value) return "";

  const { month, year } = value;

  if (position === "start") {
    return `${year}-${String(month + 1).padStart(2, "0")}-01`;
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }
}

// Helper para converter string de data para MonthYear
export function dateStringToMonthYear(
  dateStr: string
): { month: number; year: number } | null {
  if (!dateStr) return null;

  const [year, month] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month)) return null;

  return { month: month - 1, year };
}
