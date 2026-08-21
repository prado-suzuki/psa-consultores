import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSaidaIcms, SAIDA_ICMS_PAGE_SIZE, type FamiliaSaida } from '@/hooks/useSaidaIcms';
import {
  useCorrecoesIcms,
  useDeleteCorrecaoIcms,
  type FamiliaCorrecao,
} from '@/hooks/useCorrecoesIcms';
import { formatCell, isNumericKey } from './formatCell';
import { labelFor } from './columnLabels';
import { EXPECTED_SCHEMA, findMissingFields } from './expectedColumns';
import { isCheckKey, checkColorClass } from './checkColor';
import { deriveDetailChecks, deriveTotalsChecks } from './derivedChecks';
import { orderColumns } from './columnOrder';
import { BaseLegalCard } from './BaseLegalCard';
import {
  mergeCorrecoesIntoDetail,
  mergeCorrecoesIntoTotals,
} from './mergeCorrecoes';
import { NovaCorrecaoDialog } from './NovaCorrecaoDialog';
import {
  ICMS_FAMILIA_TAB_TOOLBAR_TOOLTIPS,
  ICMS_T03_COLUMN_TOOLTIPS,
} from '../tooltipContent';
import { ButtonTooltip } from '../tooltipHelpers';
import { renderColumnLabel } from '../renderColumnLabel';

interface FamiliaSaidaTabProps {
  familia: FamiliaSaida;
  enabled: boolean;
  contribuinteId: string;
  start_date: string;
  end_date: string;
}

const FAMILIAS_COM_CORRECAO: FamiliaCorrecao[] = ['acucar', 'etanol_interestado', 'biodiesel'];

const isFamiliaComCorrecao = (f: FamiliaSaida): f is FamiliaCorrecao =>
  (FAMILIAS_COM_CORRECAO as string[]).includes(f);

export function FamiliaSaidaTab({
  familia,
  enabled,
  contribuinteId,
  start_date,
  end_date,
}: FamiliaSaidaTabProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const resumoScrollRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [contribuinteId, start_date, end_date, familia]);

  const { data, isLoading, isFetching, error } = useSaidaIcms(familia, {
    id_contribuinte: contribuinteId,
    data_nota_ini: start_date || undefined,
    data_nota_fim: end_date || undefined,
    page,
    enabled,
  });

  const allowCorrecoes = isFamiliaComCorrecao(familia);

  const { data: correcoes = [] } = useCorrecoesIcms({
    contribuinteId,
    familia: allowCorrecoes ? familia : 'acucar',
    start_date: start_date || undefined,
    end_date: end_date || undefined,
    enabled: enabled && allowCorrecoes && !!contribuinteId,
  });

  const deleteMutation = useDeleteCorrecaoIcms();

  const rawRows = data?.data ?? [];
  const rawResumo = data?.totalizadores_mensal ?? [];

  const mergedRawRows = useMemo(
    () =>
      allowCorrecoes && page === 1
        ? mergeCorrecoesIntoDetail(rawRows, correcoes, familia as FamiliaCorrecao)
        : rawRows,
    [allowCorrecoes, page, rawRows, correcoes, familia],
  );
  const mergedRawResumo = useMemo(
    () =>
      allowCorrecoes
        ? mergeCorrecoesIntoTotals(rawResumo, correcoes, familia as FamiliaCorrecao)
        : rawResumo,
    [allowCorrecoes, rawResumo, correcoes, familia],
  );

  const rows = useMemo(
    () => mergedRawRows.map((r) => deriveDetailChecks(r, familia)),
    [mergedRawRows, familia],
  );
  const resumo = useMemo(
    () => mergedRawResumo.map((r) => deriveTotalsChecks(r)),
    [mergedRawResumo],
  );

  const dataColumns = useMemo(
    () => (rows.length > 0 ? orderColumns(Object.keys(rows[0]).filter((k) => !k.startsWith('__')), familia, 'data') : []),
    [rows, familia],
  );
  const resumoColumns = useMemo(
    () => (resumo.length > 0 ? orderColumns(Object.keys(resumo[0]), familia, 'totals') : []),
    [resumo, familia],
  );

  const expected = EXPECTED_SCHEMA[familia];
  const missingDataFields = useMemo(
    () => (rows.length > 0 ? findMissingFields(expected.data, dataColumns) : []),
    [rows, expected.data, dataColumns],
  );
  const missingTotalsFields = useMemo(
    () => (expected.hasTotals && resumo.length > 0 ? findMissingFields(expected.totals, resumoColumns) : []),
    [expected.hasTotals, expected.totals, resumo, resumoColumns],
  );

  const handleDeleteCorrecao = async (correcaoId: string) => {
    const target = correcoes.find((c) => c.id === correcaoId);
    if (!target) return;
    try {
      await deleteMutation.mutateAsync(target);
      toast({ title: 'Correção excluída.' });
    } catch (err) {
      toast({
        title: 'Erro ao excluir correção',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

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

  const hasNextPage = rawRows.length === SAIDA_ICMS_PAGE_SIZE;
  const showInitialLoading = isLoading && rows.length === 0;
  const hasMissing = missingDataFields.length > 0 || missingTotalsFields.length > 0;

  return (
    <div className="space-y-6">
      <BaseLegalCard familia={familia} />

      {resumo.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Resumo Mensal
              {allowCorrecoes && correcoes.length > 0 && (
                <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-700">
                  inclui {correcoes.length} correção{correcoes.length > 1 ? 'ões' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" ref={resumoScrollRef}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {resumoColumns.map((col) => (
                      <TableHead
                        key={col}
                        className={cn(
                          'text-[11px] tracking-wider whitespace-nowrap font-semibold',
                          isNumericKey(col, resumo[0]?.[col]) && 'text-right',
                        )}
                      >
                        {renderColumnLabel(labelFor(col), ICMS_T03_COLUMN_TOOLTIPS[col])}
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
                            isCheckKey(col) && checkColorClass(col, row[col], row),
                          )}
                        >
                          {formatCell(col, row[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <FloatingScrollbar targetRef={resumoScrollRef} />
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Análise Detalhada
            {isFetching && !showInitialLoading && (
              <Loader2 className="inline-block h-3.5 w-3.5 ml-2 animate-spin text-slate-400" />
            )}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Página {page}</span>
            <span>·</span>
            <span>{rows.length} {rows.length === 1 ? 'item' : 'itens'}</span>
            {allowCorrecoes && (
              <ButtonTooltip text={ICMS_FAMILIA_TAB_TOOLBAR_TOOLTIPS.adicionarCorrecao}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  className="ml-2 h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar correção
                </Button>
              </ButtonTooltip>
            )}
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
            <>
              <div className="overflow-x-auto" ref={detailScrollRef}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      {allowCorrecoes && <TableHead className="w-10" />}
                      {dataColumns.map((col) => (
                        <TableHead
                          key={col}
                          className={cn(
                            'text-[11px] tracking-wider whitespace-nowrap font-semibold',
                            isNumericKey(col, rows[0]?.[col]) && 'text-right',
                          )}
                        >
                          {renderColumnLabel(labelFor(col), ICMS_T03_COLUMN_TOOLTIPS[col])}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const isCorrecao = row.__correcao === true;
                      const correcaoId = row.__correcao_id as string | undefined;
                      return (
                        <TableRow
                          key={`row-${page}-${idx}`}
                          className={cn(
                            'hover:bg-slate-50',
                            isCorrecao && 'bg-amber-50/60 hover:bg-amber-50',
                          )}
                        >
                          {allowCorrecoes && (
                            <TableCell className="p-1 text-center">
                              {isCorrecao && correcaoId && (
                                <ButtonTooltip text={ICMS_FAMILIA_TAB_TOOLBAR_TOOLTIPS.excluirCorrecao}>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteCorrecao(correcaoId)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </ButtonTooltip>
                              )}
                            </TableCell>
                          )}
                          {dataColumns.map((col) => (
                            <TableCell
                              key={col}
                              className={cn(
                                'font-mono text-xs whitespace-nowrap',
                                isNumericKey(col, row[col]) && 'text-right',
                                isCheckKey(col) && checkColorClass(col, row[col], row),
                              )}
                            >
                              {col === 'NUM_NOTA' && isCorrecao ? (
                                <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px]">
                                  Correção
                                </Badge>
                              ) : (
                                formatCell(col, row[col])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <FloatingScrollbar targetRef={detailScrollRef} />
            </>
          )}
        </CardContent>
        {rows.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
            <ButtonTooltip text={ICMS_FAMILIA_TAB_TOOLBAR_TOOLTIPS.paginaAnterior}>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Anterior
              </Button>
            </ButtonTooltip>
            <ButtonTooltip text={ICMS_FAMILIA_TAB_TOOLBAR_TOOLTIPS.paginaProxima}>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </ButtonTooltip>
          </div>
        )}
      </Card>

      {allowCorrecoes && (
        <NovaCorrecaoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          familia={familia as FamiliaCorrecao}
          contribuinteId={contribuinteId}
        />
      )}
    </div>
  );
}
