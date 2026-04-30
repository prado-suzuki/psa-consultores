import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, AlertTriangle, Calculator, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSaidaIcms, SAIDA_ICMS_PAGE_SIZE, type FamiliaSaida } from '@/hooks/useSaidaIcms';
import { formatCell, isNumericKey, type ViewMode } from './formatCell';
import { buildAuditGroupFromRow, pickTipoOperacao } from './buildAuditGroup';
import { labelFor } from './columnLabels';
import { EXPECTED_SCHEMA, findMissingFields } from './expectedColumns';
import { isCheckKey, checkColorClass } from './checkColor';
import type { DifalGroupedItem } from '@/types/difal';

interface FamiliaSaidaTabProps {
  familia: FamiliaSaida;
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
  onAuditClick: (group: DifalGroupedItem, tipoOperacao: string) => void;
}

export function FamiliaSaidaTab({
  familia,
  enabled,
  contribuinteId,
  dataInicio,
  dataFim,
  onAuditClick,
}: FamiliaSaidaTabProps) {
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('raw');

  useEffect(() => {
    setPage(1);
  }, [contribuinteId, dataInicio, dataFim, familia]);

  const { data, isLoading, isFetching, error } = useSaidaIcms(familia, {
    id_contribuinte: contribuinteId,
    data_nota_ini: dataInicio || undefined,
    data_nota_fim: dataFim || undefined,
    page,
    enabled,
  });

  const rows = data?.data ?? [];
  const resumo = data?.totalizadores_mensal ?? [];

  const dataColumns = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);
  const resumoColumns = useMemo(() => (resumo.length > 0 ? Object.keys(resumo[0]) : []), [resumo]);

  const expected = EXPECTED_SCHEMA[familia];
  const missingDataFields = useMemo(
    () => (rows.length > 0 ? findMissingFields(expected.data, dataColumns) : []),
    [rows, expected.data, dataColumns],
  );
  const missingTotalsFields = useMemo(
    () => (expected.hasTotals && resumo.length > 0 ? findMissingFields(expected.totals, resumoColumns) : []),
    [expected.hasTotals, expected.totals, resumo, resumoColumns],
  );

  const renderHeader = (key: string) =>
    viewMode === 'raw' ? key : labelFor(key);

  if (!enabled) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-12 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Selecione os filtros e clique em Buscar para carregar os dados.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const status = (error as Error & { status?: number }).status;
    return (
      <Card className="border-red-300 bg-red-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Erro retornado pela API {status ? `(HTTP ${status})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <pre className="text-xs font-mono whitespace-pre-wrap bg-white border border-red-200 rounded p-3 text-red-900 max-h-64 overflow-auto">
            {error instanceof Error ? error.message : 'Erro ao consultar dados.'}
          </pre>
          <p className="text-xs text-red-700">
            Endpoint: <code className="font-mono">/api/v1/saida_icms/{familia}</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasNextPage = rows.length === SAIDA_ICMS_PAGE_SIZE;
  const showInitialLoading = isLoading && rows.length === 0;
  const hasMissing = missingDataFields.length > 0 || missingTotalsFields.length > 0;

  return (
    <div className="space-y-6">


      {/* Resumo mensal — só renderiza se o endpoint devolver totalizadores */}
      {resumo.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Resumo Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {resumoColumns.map((col) => (
                      <TableHead
                        key={col}
                        className={cn(
                          'text-[11px] tracking-wider whitespace-nowrap',
                          viewMode === 'raw' ? 'font-mono uppercase' : 'font-semibold',
                          isNumericKey(col, resumo[0]?.[col]) && 'text-right',
                        )}
                      >
                        {renderHeader(col)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumo.map((row, idx) => (
                    <TableRow key={`resumo-${idx}`}>
                      {resumoColumns.map((col) => (
                        <TableCell
                          key={col}
                          className={cn(
                            'font-mono text-sm whitespace-nowrap',
                            isNumericKey(col, row[col]) && 'text-right',
                            isCheckKey(col) && checkColorClass(col, row[col]),
                          )}
                        >
                          {formatCell(col, row[col], viewMode)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela principal */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Linhas Detalhadas
            {isFetching && !showInitialLoading && (
              <Loader2 className="inline-block h-3.5 w-3.5 ml-2 animate-spin text-slate-400" />
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={cn(
                  'px-2 py-1 rounded transition-colors',
                  viewMode === 'raw' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700',
                )}
                title="Mostra os valores exatamente como retornados pela API (JSON.stringify)"
              >
                Bruto
              </button>
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={cn(
                  'px-2 py-1 rounded transition-colors',
                  viewMode === 'formatted' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700',
                )}
                title="Aplica formatação BRL, percentual, data brasileira e cabeçalhos em PT-BR"
              >
                Formatado
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Página {page}</span>
              <span>·</span>
              <span>{rows.length} {rows.length === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showInitialLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {dataColumns.map((col) => (
                      <TableHead
                        key={col}
                        className={cn(
                          'text-[11px] tracking-wider whitespace-nowrap',
                          viewMode === 'raw' ? 'font-mono uppercase' : 'font-semibold',
                          isNumericKey(col, rows[0]?.[col]) && 'text-right',
                        )}
                      >
                        {renderHeader(col)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow
                      key={`row-${page}-${idx}`}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => onAuditClick(buildAuditGroupFromRow(row, contribuinteId), pickTipoOperacao(row))}
                    >
                      {dataColumns.map((col) => (
                        <TableCell
                          key={col}
                          className={cn(
                            'font-mono text-xs whitespace-nowrap',
                            isNumericKey(col, row[col]) && 'text-right',
                            isCheckKey(col) && checkColorClass(col, row[col]),
                          )}
                        >
                          {formatCell(col, row[col], viewMode)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {/* Paginação */}
        {rows.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
