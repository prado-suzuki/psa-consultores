import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = [
"Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
"Jul", "Ago", "Set", "Out", "Nov", "Dez"];


interface MonthYearPickerProps {
  value?: {month: number;year: number;} | null;
  onChange: (value: {month: number;year: number;} | null) => void;
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
  maxYear = new Date().getFullYear() + 1
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(value?.year || new Date().getFullYear());

  // Sincronizar viewYear quando value muda
  React.useEffect(() => {
    if (value?.year) {
      setViewYear(value.year);
    }
  }, [value?.year]);

  const handleMonthSelect = (month: number) => {
    onChange({ month, year: viewYear });
    setOpen(false);
  };

  const handlePrevYear = () => {
    if (viewYear > minYear) {
      setViewYear(viewYear - 1);
    }
  };

  const handleNextYear = () => {
    if (viewYear < maxYear) {
      setViewYear(viewYear + 1);
    }
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
          )}>
          
          <Calendar className="absolute left-3 h-5 w-5 text-slate-400 mx-[517px]" />
          {formatDisplay() || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 pointer-events-auto" align="start">
        <div className="p-3">
          {/* Header com navegação de ano */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevYear}
              disabled={viewYear <= minYear}>
              
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{viewYear}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextYear}
              disabled={viewYear >= maxYear}>
              
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((monthName, index) => {
              const isSelected = value?.month === index && value?.year === viewYear;
              const isCurrentMonth =
              index === new Date().getMonth() &&
              viewYear === new Date().getFullYear();

              return (
                <Button
                  key={monthName}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9 text-xs font-medium",
                    isCurrentMonth && !isSelected && "bg-accent text-accent-foreground",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleMonthSelect(index)}>
                  
                  {monthName}
                </Button>);

            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>);

}

// Helper para converter MonthYear para string de data (primeiro/último dia)
export function monthYearToDateString(
value: {month: number;year: number;} | null,
position: 'start' | 'end')
: string {
  if (!value) return '';

  const { month, year } = value;

  if (position === 'start') {
    // Primeiro dia do mês
    return `${year}-${String(month + 1).padStart(2, '0')}-01`;
  } else {
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }
}

// Helper para converter string de data para MonthYear
export function dateStringToMonthYear(dateStr: string): {month: number;year: number;} | null {
  if (!dateStr) return null;

  const [year, month] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return null;

  return { month: month - 1, year };
}