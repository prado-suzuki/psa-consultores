import { ChevronDown, Eraser, Filter, Info, Loader2, Search } from 'lucide-react';

import type {
  ClienteControlePerdcomp,
  ContribuinteControlePerdcomp,
} from '@/hooks/useDomainPerdcomp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RequiredMark } from '@/components/ui/required-mark';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FieldTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
    </TooltipTrigger>
    <TooltipContent
      side="top"
      className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]"
    >
      {text}
    </TooltipContent>
  </Tooltip>
);

const TOOLTIPS = {
  cliente: 'Filtra os processos de PERDCOMP por cliente ou grupo.',
  contribuinte: 'CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.',
  situacao: 'Filtra por status do processo (múltipla seleção).',
  exercicio: 'Limita a listagem ao ano-calendário do crédito.',
  numeroProcesso: 'Busca direta pelo número do PER/DCOMP.',
} as const;

interface ControlePerdcompFiltersProps {
  clienteId: string;
  contribuinteId: string;
  exercicio: string;
  processo: string;
  situacoes: string[];
  clientes: ClienteControlePerdcomp[];
  contribuintes: ContribuinteControlePerdcomp[];
  allSituacoes: string[];
  isSearching: boolean;
  onClienteChange: (value: string) => void;
  onContribuinteChange: (value: string) => void;
  onExercicioChange: (value: string) => void;
  onProcessoChange: (value: string) => void;
  onSituacoesChange: (value: string[]) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function ControlePerdcompFilters({
  clienteId,
  contribuinteId,
  exercicio,
  processo,
  situacoes,
  clientes,
  contribuintes,
  allSituacoes,
  isSearching,
  onClienteChange,
  onContribuinteChange,
  onExercicioChange,
  onProcessoChange,
  onSituacoesChange,
  onSearch,
  onClear,
}: ControlePerdcompFiltersProps) {
  const hasFilters = clienteId || contribuinteId || exercicio || processo || situacoes.length > 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-primary">
          <Filter className="h-5 w-5 text-primary" />
          <span className="uppercase text-sm tracking-wider font-bold text-slate-800">
            Filtros de Busca
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Cliente <RequiredMark /> <FieldTooltip text={TOOLTIPS.cliente} />
            </label>
            <Select value={clienteId} onValueChange={onClienteChange}>
              <SelectTrigger className="h-11 bg-white">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-3">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Contribuinte <RequiredMark /> <FieldTooltip text={TOOLTIPS.contribuinte} />
            </label>
            <Select
              value={contribuinteId}
              onValueChange={onContribuinteChange}
              disabled={!clienteId}
            >
              <SelectTrigger className="h-11 bg-white">
                <SelectValue placeholder="Selecione o contribuinte" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {contribuintes.map((contribuinte) => (
                  <SelectItem key={contribuinte.id} value={contribuinte.id}>
                    {contribuinte.nome_razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Situação <FieldTooltip text={TOOLTIPS.situacao} />
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10 font-normal">
                  <span className="truncate">
                    {situacoes.length === 0
                      ? 'Todas'
                      : situacoes.length === 1
                        ? situacoes[0]
                        : `${situacoes.length} selecionadas`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <ScrollArea className="max-h-64 overflow-auto">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm font-medium">
                      <Checkbox
                        checked={situacoes.length === 0}
                        onCheckedChange={() => onSituacoesChange([])}
                      />
                      Todas
                    </label>
                    <Separator className="my-1" />
                    {allSituacoes.map((situacao) => (
                      <label
                        key={situacao}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={situacoes.includes(situacao)}
                          onCheckedChange={(checked) =>
                            onSituacoesChange(
                              checked
                                ? [...situacoes, situacao]
                                : situacoes.filter((item) => item !== situacao),
                            )
                          }
                        />
                        {situacao}
                      </label>
                    ))}
                    {situacoes.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => onSituacoesChange([])}
                      >
                        Limpar seleção
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          <div className="col-span-6 md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Exercício <FieldTooltip text={TOOLTIPS.exercicio} />
            </label>
            <Select
              value={exercicio || '__none__'}
              onValueChange={(value) => onExercicioChange(value === '__none__' ? '' : value)}
            >
              <SelectTrigger className="h-11 bg-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="__none__">Todos</SelectItem>
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nº do Processo <FieldTooltip text={TOOLTIPS.numeroProcesso} />
            </label>
            <Input
              className="h-11 bg-white"
              placeholder="Digite o número..."
              value={processo}
              onChange={(event) => onProcessoChange(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
          {hasFilters && (
            <Button
              variant="outline"
              onClick={onClear}
              className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <Eraser className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
          <Button
            onClick={onSearch}
            disabled={isSearching}
            className="gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isSearching ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
