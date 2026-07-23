import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Info,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type {
  ControlePagination,
  ControlePer,
  ControlePerSituacaoMap,
  ControlePerTotals,
  SelicCorrection,
} from '@/lib/controlePerdcomp';
import { getControlePerValues, getRoundedControleBalance } from '@/lib/controlePerdcomp';
import { normalizeCurrencyZero, normalizeProcessNumber } from '@/lib/perdcompUtils';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    normalizeCurrencyZero(value),
  );

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

interface ControlePerdcompResultsProps {
  searched: boolean;
  contribuinteId: string;
  isLoading: boolean;
  isError: boolean;
  paginatedData: ControlePer[];
  sortedCount: number;
  filteredCount: number;
  pagination: ControlePagination;
  currentPage: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  perSituacoesMap: ControlePerSituacaoMap;
  dcompTotalMap: Record<string, number>;
  dcompOriginalMap: Record<string, number>;
  selicCorrectionMap: Record<string, SelicCorrection>;
  selicLoading: boolean;
  selicError: Error | null;
  totals: ControlePerTotals;
  onNew: () => void;
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onRowClick: (item: ControlePer) => void;
  onEdit: (item: ControlePer) => void;
  onDelete: (item: ControlePer) => void;
}

export function ControlePerdcompResults({
  searched,
  contribuinteId,
  isLoading,
  isError,
  paginatedData,
  sortedCount,
  filteredCount,
  pagination,
  currentPage,
  sortColumn,
  sortDirection,
  perSituacoesMap,
  dcompTotalMap,
  dcompOriginalMap,
  selicCorrectionMap,
  selicLoading,
  selicError,
  totals,
  onNew,
  onSort,
  onPageChange,
  onRowClick,
  onEdit,
  onDelete,
}: ControlePerdcompResultsProps) {
  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const renderContent = () => {
    if (!searched || !contribuinteId)
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione um cliente e contribuinte para visualizar os registros</p>
        </div>
      );
    if (isError)
      return (
        <div className="text-center py-12 text-destructive">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-70" />
          <p className="font-medium">Erro ao carregar registros de PER.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Verifique sua conexão e tente novamente.
          </p>
        </div>
      );
    if (isLoading)
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );

    return (
      <TooltipProvider>
        <div className="overflow-x-auto w-full">
          <Table className="text-xs min-w-[1400px] [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2">
            <TableHeader className="[&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-700">
              <TableRow>
                <TableHead
                  className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('processo')}
                >
                  <span className="flex items-center">
                    Nº Processo
                    <SortIcon col="processo" />
                  </span>
                </TableHead>
                <TableHead
                  className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('situacao')}
                >
                  <span className="flex items-center">
                    Situação
                    <SortIcon col="situacao" />
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">Últ. atualização</TableHead>
                <TableHead
                  className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('dt_solicitada')}
                >
                  <span className="flex items-center">
                    Dt. Solicitada
                    <SortIcon col="dt_solicitada" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('exercicio')}
                >
                  <span className="flex items-center">
                    Exerc.
                    <SortIcon col="exercicio" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('trimestre')}
                >
                  <span className="flex items-center">
                    Tri.
                    <SortIcon col="trimestre" />
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">Tipo Crédito</TableHead>
                <TableHead className="text-right whitespace-nowrap">% PSA</TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('vlr_credito')}
                >
                  <span className="flex items-center justify-end">
                    Vlr. Crédito
                    <SortIcon col="vlr_credito" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('vlr_compensado')}
                >
                  <span className="flex items-center justify-end">
                    Vlr. Compensado
                    <SortIcon col="vlr_compensado" />
                  </span>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">Ressarcido</TableHead>
                <TableHead className="whitespace-nowrap">Dt. Pagamento</TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('saldo')}
                >
                  <span className="flex items-center justify-end">
                    Saldo Disp.
                    <SortIcon col="saldo" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => onSort('vlr_corrigido')}
                >
                  <span className="flex items-center justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help border-b border-dashed border-muted-foreground/50">
                          Valor Atualizado SELIC
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Valor máximo da DCOMP na data atual (saldo disponível + parcela SELIC)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <SortIcon col="vlr_corrigido" />
                  </span>
                </TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => {
                  const situacaoInfo = perSituacoesMap[item.nr_per];
                  const { compensated, refunded, balance } = getControlePerValues(
                    item,
                    dcompTotalMap,
                    dcompOriginalMap,
                  );
                  const saldo = getRoundedControleBalance(balance);
                  const correction = selicCorrectionMap[item.nr_per];
                  return (
                    <TableRow
                      key={item.nr_per}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onRowClick(item)}
                    >
                      <TableCell className="font-medium">
                        {normalizeProcessNumber(item.nr_per)}
                      </TableCell>
                      <TableCell>{situacaoInfo?.situacao || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {situacaoInfo?.criado_em ? formatDateTime(situacaoInfo.criado_em) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(item.dt_solicitada)}</TableCell>
                      <TableCell>{item.exercicio}</TableCell>
                      <TableCell>{item.tri_exercicio}º</TableCell>
                      <TableCell>{item.tp_credito}</TableCell>
                      <TableCell className="text-right">
                        {item.porcentagem_psa != null ? `${item.porcentagem_psa}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.vlr_credito)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(compensated)}</TableCell>
                      <TableCell className="text-right">
                        {refunded > 0 ? formatCurrency(refunded) : '-'}
                      </TableCell>
                      <TableCell>
                        {situacaoInfo?.dt_pagamento ? formatDate(situacaoInfo.dt_pagamento) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-medium',
                            saldo > 0
                              ? 'text-green-600 dark:text-green-400'
                              : saldo < 0
                                ? 'text-red-600 dark:text-red-400'
                                : '',
                          )}
                        >
                          {formatCurrency(saldo)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {correction ? (
                          correction.fator > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help text-blue-600 dark:text-blue-400 font-medium">
                                  {formatCurrency(saldo * (1 + correction.fator))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Valor Atualizado SELIC — Fator: {correction.fator.toFixed(6)}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">Em carência</span>
                          )
                        ) : selicLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                        ) : selicError ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-destructive cursor-help">
                                <AlertCircle className="h-3 w-3" />
                                <span>—</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>SELIC indisponível: {selicError.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(item);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(item);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {searched && filteredCount > 0 && (
              <TableFooter className="sticky bottom-0 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
                <TableRow className="hover:bg-muted/80">
                  <TableCell colSpan={8} className="font-bold">
                    <span className="inline-flex items-center gap-1.5">
                      Total Geral
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          collisionPadding={16}
                          className="max-w-xs"
                        >
                          <p>
                            Soma de <strong>todos os PERs</strong> que atendem aos filtros aplicados
                            — independente da página exibida e da ordenação. O valor não muda ao
                            paginar.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">
                    {formatCurrency(totals.credito)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">
                    {formatCurrency(totals.compensado)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">
                    {totals.ressarcido > 0 ? formatCurrency(totals.ressarcido) : '-'}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">
                    <span
                      className={cn(
                        totals.saldo > 0
                          ? 'text-green-600 dark:text-green-400'
                          : totals.saldo < 0
                            ? 'text-red-600 dark:text-red-400'
                            : '',
                      )}
                    >
                      {formatCurrency(totals.saldo)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums whitespace-nowrap text-blue-600 dark:text-blue-400">
                    {formatCurrency(totals.corrigido)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Mostrando {pagination.start} a {pagination.end} de {sortedCount} registros
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Resultados - PER</CardTitle>
        <Button onClick={onNew} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4" />
          Novo PER
        </Button>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
