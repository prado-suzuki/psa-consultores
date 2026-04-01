import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface DashboardFiltersProps {
  statusOptions?: FilterOption[];
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusLabel?: string;
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange?: (date: Date | undefined) => void;
  onDateToChange?: (date: Date | undefined) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function DashboardFilters({
  statusOptions,
  statusValue,
  onStatusChange,
  statusLabel = 'Status',
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  hasActiveFilters,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Status/Category Filter */}
      {statusOptions && onStatusChange && (
        <Select value={statusValue || '__all__'} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px] h-9 text-sm bg-background">
            <SelectValue placeholder={statusLabel} />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="__all__">Todos</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date From Filter */}
      {onDateFromChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 text-sm font-normal bg-background',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background" align="start">
            <Calendar
              selected={dateFrom}
              onSelect={onDateFromChange}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Date To Filter */}
      {onDateToChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 text-sm font-normal bg-background',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background" align="start">
            <Calendar
              selected={dateTo}
              onSelect={onDateToChange}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
