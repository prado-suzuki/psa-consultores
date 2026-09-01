import { format, parse } from 'date-fns';
import { CalendarIcon, Eraser, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ProcessoDifalCliente,
  ProcessoDifalContribuinte,
} from '@/hooks/useDomainProcessoDifalQueries';
import { cn } from '@/lib/utils';
import { FieldTooltip } from '@/components/equipe/dev/processo-difal/DifalTooltips';

interface DifalFiltersCardProps {
  selectedCliente: string;
  selectedContribuinte: string;
  startDate: string;
  endDate: string;
  clientes?: ProcessoDifalCliente[];
  contribuintes?: ProcessoDifalContribuinte[];
  isLoadingClientes: boolean;
  isLoadingContribuintes: boolean;
  isLoading: boolean;
  onClienteChange: (value: string) => void;
  onContribuinteChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClear: () => void;
  onSearch: () => void;
}

export function DifalFiltersCard({
  selectedCliente,
  selectedContribuinte,
  startDate,
  endDate,
  clientes,
  contribuintes,
  isLoadingClientes,
  isLoadingContribuintes,
  isLoading,
  onClienteChange,
  onContribuinteChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
  onSearch,
}: DifalFiltersCardProps) {
  return (
    <Card className="mb-6 border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <Filter className="h-5 w-5" />
          <span className="uppercase text-sm tracking-wider font-bold text-slate-800">
            Filtros de Busca
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-4">
          <div className="md:col-span-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Cliente <RequiredMark /> <FieldTooltip name="cliente" />
            </label>
            <Select
              value={selectedCliente}
              disabled={isLoadingClientes}
              onValueChange={onClienteChange}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes?.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Contribuinte <RequiredMark /> <FieldTooltip name="contribuinte" />
            </label>
            <Select
              value={selectedContribuinte}
              disabled={!selectedCliente || isLoadingContribuintes}
              onValueChange={onContribuinteChange}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o contribuinte" />
              </SelectTrigger>
              <SelectContent>
                {contribuintes?.map((contribuinte) => (
                  <SelectItem key={contribuinte.id} value={contribuinte.id}>
                    {contribuinte.nome_razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Data Início <RequiredMark /> <FieldTooltip name="start_date" />
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full h-11 px-3 text-left font-normal justify-start bg-white',
                    !startDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {startDate
                    ? format(parse(startDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')
                    : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  selected={startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => onStartDateChange(date ? format(date, 'yyyy-MM-dd') : '')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Data Fim <RequiredMark /> <FieldTooltip name="end_date" />
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full h-11 px-3 text-left font-normal justify-start bg-white',
                    !endDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {endDate
                    ? format(parse(endDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')
                    : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  selected={endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => onEndDateChange(date ? format(date, 'yyyy-MM-dd') : '')}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={onClear}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
          <Button
            onClick={onSearch}
            disabled={!selectedContribuinte || isLoading}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Search className="h-4 w-4 mr-2" />
            Buscar produtos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
