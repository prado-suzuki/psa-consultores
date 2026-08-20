import { Filter, Eraser, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  MonthRangePicker,
  type MonthRange,
} from "@/components/ui/month-range-picker";
import type { ApuracaoFiltros } from "@/lib/ibs-cbs/types";

interface FiltrosCalculadoraProps {
  filtros: ApuracaoFiltros;
  onChange: (next: ApuracaoFiltros) => void;
  ufsDisponiveis: string[];
  anexosDisponiveis: string[];
  periodo: { min: string | null; max: string | null };
  disabled?: boolean;
}

function periodoToRange(filtros: ApuracaoFiltros): MonthRange | null {
  if (!filtros.inicio || !filtros.fim) return null;
  const [iy, im] = filtros.inicio.split("-").map(Number);
  const [fy, fm] = filtros.fim.split("-").map(Number);
  return {
    start: { month: im - 1, year: iy },
    end: { month: fm - 1, year: fy },
  };
}

function rangeToPeriodo(r: MonthRange | null): { inicio?: string; fim?: string } {
  if (!r) return { inicio: undefined, fim: undefined };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    inicio: `${r.start.year}-${pad(r.start.month + 1)}`,
    fim: `${r.end.year}-${pad(r.end.month + 1)}`,
  };
}

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

function MultiSelect({ label, options, selected, onChange, placeholder = "Todos", disabled }: MultiSelectProps) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };

  const display =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selecionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full h-11 justify-between bg-white dark:bg-slate-800 font-normal"
        >
          <span className="truncate text-left">{display}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="px-3 py-2 border-b text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        <div className="max-h-[260px] overflow-y-auto py-1">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Sem opções</p>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 text-left"
                >
                  <span
                    className={`h-4 w-4 rounded border flex items-center justify-center ${
                      checked
                        ? "bg-primary border-primary text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })
          )}
        </div>
        {selected.length > 0 && (
          <div className="px-3 py-2 border-t">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Limpar seleção
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function FiltrosCalculadora({
  filtros,
  onChange,
  ufsDisponiveis,
  anexosDisponiveis,
  periodo,
  disabled,
}: FiltrosCalculadoraProps) {
  const range = periodoToRange(filtros);
  const minYear = periodo.min ? Number(periodo.min.slice(0, 4)) : 2020;
  const maxYear = periodo.max ? Number(periodo.max.slice(0, 4)) : new Date().getFullYear();

  const handleReset = () => {
    onChange({
      inicio: periodo.min ?? undefined,
      fim: periodo.max ?? undefined,
      ufs: [],
      anexos: [],
    });
  };

  const activeCount =
    (filtros.ufs.length > 0 ? 1 : 0) +
    (filtros.anexos.length > 0 ? 1 : 0) +
    ((filtros.inicio !== periodo.min || filtros.fim !== periodo.max) && filtros.inicio ? 1 : 0);

  return (
    <Card className="mb-6 border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200">
          <Filter className="h-4 w-4 text-primary" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5">
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Período
            </label>
            <MonthRangePicker
              value={range}
              onChange={(r) => onChange({ ...filtros, ...rangeToPeriodo(r) })}
              minYear={minYear}
              maxYear={maxYear}
              placeholder="Selecione o período"
              disabled={disabled}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              UF destino
            </label>
            <MultiSelect
              label="UF destino"
              options={ufsDisponiveis}
              selected={filtros.ufs}
              onChange={(next) => onChange({ ...filtros, ufs: next })}
              placeholder="Todas"
              disabled={disabled}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Anexo (LC 214/25)
            </label>
            <MultiSelect
              label="Anexo"
              options={anexosDisponiveis}
              selected={filtros.anexos}
              onChange={(next) => onChange({ ...filtros, anexos: next })}
              placeholder="Todos"
              disabled={disabled}
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={disabled}
              className="h-11 w-full text-slate-500 hover:text-red-600"
              title="Restaurar filtros padrão"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
