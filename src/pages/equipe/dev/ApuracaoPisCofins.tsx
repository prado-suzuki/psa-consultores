import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { usePisCofinsApuracao } from '@/hooks/usePisCofinsApuracao';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import { RequiredMark } from '@/components/ui/required-mark';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2, Eraser, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { buildPivot, isDebito, isExclusao, isCredito } from '@/lib/pisCofinsFilters';
import type { PivotRow } from '@/types/pisCofins';

/* ── Formatters ── */
const fmt = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const periodLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
};

/* ── Reusable PivotTable component ── */

interface PivotTableProps {
  title: string;
  rows: PivotRow[];
  periodos: string[];
  showCst?: boolean;
  showBloco?: boolean;
  showTotal?: boolean;
}

const PivotTable = ({ title, rows, periodos, showCst = false, showBloco = false, showTotal = false }: PivotTableProps) => {
  if (rows.length === 0) return null;

  // Build sticky left offsets dynamically based on visible columns
  const colWidths: { key: string; w: number }[] = [];
  if (showCst) colWidths.push({ key: 'cst', w: 60 });
  colWidths.push({ key: 'cta', w: 90 });
  colWidths.push({ key: 'desc', w: 220 });
  if (showBloco) colWidths.push({ key: 'bloco', w: 80 });

  const offsets = colWidths.reduce<Record<string, number>>((acc, col, i) => {
    acc[col.key] = i === 0 ? 0 : acc[colWidths[i - 1].key] + colWidths[i - 1].w;
    return acc;
  }, {});

  const widthOf = (key: string) => colWidths.find(c => c.key === key)?.w ?? 0;
  const lastFixedKey = colWidths[colWidths.length - 1].key;

  // Totals row
  const totals: Record<string, number> = {};
  if (showTotal) {
    for (const row of rows) {
      for (const pk of periodos) {
        totals[pk] = (totals[pk] || 0) + (row.valores[pk] ?? 0);
      }
    }
  }

  const stickyBase = 'sticky z-10 bg-white';
  const stickyHeadBase = 'sticky z-30 bg-slate-100';
  const headCls = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      {/* Section header */}
      <div className="border-l-4 border-teal-600 pl-3 py-3 px-4 bg-slate-50">
        <span className="text-sm font-bold text-slate-800">{title}</span>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-360px)]">
        <Table className="text-xs">
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-slate-100 hover:bg-slate-100">
              {showCst && (
                <TableHead
                  className={cn(headCls, stickyHeadBase, 'left-0')}
                  style={{ width: widthOf('cst'), minWidth: widthOf('cst'), left: offsets.cst }}
                >
                  CST
                </TableHead>
              )}
              <TableHead
                className={cn(headCls, stickyHeadBase)}
                style={{ width: widthOf('cta'), minWidth: widthOf('cta'), left: offsets.cta }}
              >
                Conta
              </TableHead>
              <TableHead
                className={cn(headCls, stickyHeadBase)}
                style={{ width: widthOf('desc'), minWidth: widthOf('desc'), left: offsets.desc }}
              >
                Descrição
              </TableHead>
              {showBloco && (
                <TableHead
                  className={cn(headCls, stickyHeadBase, 'border-r border-slate-200')}
                  style={{ width: widthOf('bloco'), minWidth: widthOf('bloco'), left: offsets.bloco }}
                >
                  Bloco
                </TableHead>
              )}
              {!showBloco && !showCst && (
                // apply border-r to the last fixed col when bloco is hidden
                <></>
              )}
              {periodos.map(pk => (
                <TableHead key={pk} className={cn(headCls, 'text-right')} style={{ minWidth: 110 }}>
                  {periodLabel(pk)}
                </TableHead>
              ))}
              {showTotal && (
                <TableHead className={cn(headCls, 'text-right')} style={{ minWidth: 120 }}>
                  Total
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, idx) => {
              const rowTotal = showTotal
                ? periodos.reduce((s, pk) => s + (row.valores[pk] ?? 0), 0)
                : 0;

              return (
                <TableRow key={idx} className="hover:bg-slate-50">
                  {showCst && (
                    <TableCell
                      className={cn('text-xs tabular-nums whitespace-nowrap p-2', stickyBase)}
                      style={{ left: offsets.cst }}
                    >
                      {row.cst_pis}
                    </TableCell>
                  )}
                  <TableCell
                    className={cn('text-xs tabular-nums whitespace-nowrap p-2', stickyBase)}
                    style={{ left: offsets.cta }}
                  >
                    {row.cod_cta}
                  </TableCell>
                  <TableCell
                    className={cn('text-xs p-2 truncate', stickyBase)}
                    style={{ left: offsets.desc, maxWidth: widthOf('desc') }}
                    title={row.descricao_conta}
                  >
                    {row.descricao_conta}
                  </TableCell>
                  {showBloco && (
                    <TableCell
                      className={cn('text-xs whitespace-nowrap p-2 border-r border-slate-200', stickyBase)}
                      style={{ left: offsets.bloco }}
                    >
                      {row.bloco_efd}
                    </TableCell>
                  )}
                  {periodos.map(pk => {
                    const val = row.valores[pk] ?? 0;
                    return (
                      <TableCell
                        key={pk}
                        className={cn(
                          'text-xs tabular-nums text-right whitespace-nowrap p-2',
                          val === 0 && 'text-slate-300',
                          val < 0 && 'text-red-600',
                          val > 0 && 'text-slate-700',
                        )}
                      >
                        {fmt(val)}
                      </TableCell>
                    );
                  })}
                  {showTotal && (
                    <TableCell
                      className={cn(
                        'text-xs tabular-nums text-right whitespace-nowrap p-2 font-semibold bg-slate-50/50',
                        rowTotal === 0 && 'text-slate-300',
                        rowTotal < 0 && 'text-red-600',
                        rowTotal > 0 && 'text-slate-700',
                      )}
                    >
                      {fmt(rowTotal)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {/* Footer totals row */}
            {showTotal && (
              <TableRow className="bg-slate-100 hover:bg-slate-100 font-bold border-t-2 border-slate-300">
                {showCst && <TableCell className={cn('text-xs p-2', stickyBase, 'bg-slate-100')} style={{ left: offsets.cst }} />}
                <TableCell
                  className={cn('text-xs p-2 uppercase tracking-wider font-bold text-slate-800', stickyBase, 'bg-slate-100')}
                  colSpan={showBloco ? 2 : 1}
                  style={{ left: offsets.cta }}
                >
                  Total
                </TableCell>
                {showBloco && (
                  <TableCell className={cn('text-xs p-2 border-r border-slate-200', stickyBase, 'bg-slate-100')} style={{ left: offsets.bloco }} />
                )}
                {!showBloco && (
                  <TableCell className={cn('text-xs p-2', stickyBase, 'bg-slate-100')} style={{ left: offsets.desc }} />
                )}
                {periodos.map(pk => {
                  const val = totals[pk] ?? 0;
                  return (
                    <TableCell
                      key={pk}
                      className={cn(
                        'text-xs tabular-nums text-right whitespace-nowrap p-2 font-bold text-slate-900',
                        val === 0 && 'text-slate-300',
                        val < 0 && 'text-red-600',
                      )}
                    >
                      {fmt(val)}
                    </TableCell>
                  );
                })}
                <TableCell className="text-xs tabular-nums text-right whitespace-nowrap p-2 font-bold text-slate-900">
                  {fmt(periodos.reduce((s, pk) => s + (totals[pk] ?? 0), 0))}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 py-2 bg-slate-50 text-xs text-muted-foreground">
        {rows.length} conta{rows.length !== 1 ? 's' : ''} · {periodos.length} período{periodos.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

/* ── Main page ── */

const ApuracaoPisCofins = () => {
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedContribuinte, setSelectedContribuinte] = useState('');
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(null);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes-piscofins'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      return (data || []) as { id: string; nome: string }[];
    },
  });

  const { data: contribuintes, isLoading: loadingContribuintes } = useQuery({
    queryKey: ['contribuintes-piscofins', selectedCliente],
    queryFn: async () => {
      const { data } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', selectedCliente)
        .eq('excluido', false)
        .order('nome_razao_social');
      return (data || []) as { id: string; nome_razao_social: string; cpf_cnpj: string | null }[];
    },
    enabled: !!selectedCliente,
  });

  useEffect(() => {
    if (selectedCliente && contribuintes?.length === 1 && !selectedContribuinte) {
      setSelectedContribuinte(contribuintes[0].id);
    }
  }, [selectedCliente, contribuintes, selectedContribuinte]);

  useEffect(() => {
    setSelectedContribuinte('');
    setSearchTriggered(false);
  }, [selectedCliente]);

  const dataInicio = monthYearToDateString(mesInicio, 'start');
  const dataFim = monthYearToDateString(mesFim, 'end');

  const { data: apiData, isLoading, error } = usePisCofinsApuracao({
    idContribuinte: selectedContribuinte,
    dtIni: dataInicio,
    dtFim: dataFim,
    enabled: searchTriggered && !!selectedContribuinte,
  });

  /* ── Pivots ── */
  const resumo = useMemo(() => buildPivot(apiData?.periodos ?? []), [apiData]);
  const debitos = useMemo(() => buildPivot(apiData?.periodos ?? [], item => isDebito(item.cst_pis)), [apiData]);
  const isencoes = useMemo(() => buildPivot(apiData?.periodos ?? [], item => isExclusao(item.cst_pis)), [apiData]);
  const creditos = useMemo(() => buildPivot(apiData?.periodos ?? [], item => isCredito(item.cst_pis, item.aliq_pis)), [apiData]);

  const hasData = resumo.rows.length > 0;

  const handleSearch = () => {
    if (!selectedContribuinte) {
      toast({ title: 'Selecione um contribuinte', variant: 'destructive' });
      return;
    }
    if ((mesInicio && !mesFim) || (!mesInicio && mesFim)) {
      toast({ title: 'Informe ambas as datas ou nenhuma', variant: 'destructive' });
      return;
    }
    if (mesInicio && mesFim) {
      const startVal = mesInicio.year * 12 + mesInicio.month;
      const endVal = mesFim.year * 12 + mesFim.month;
      if (endVal < startVal) {
        toast({ title: 'Data final deve ser ≥ data inicial', variant: 'destructive' });
        return;
      }
    }
    setSearchTriggered(true);
  };

  const handleClear = () => {
    setSelectedCliente('');
    setSelectedContribuinte('');
    setMesInicio(null);
    setMesFim(null);
    setSearchTriggered(false);
  };

  return (
    <DevLayout title="Apuração PIS/COFINS" subtitle="Visão unificada de apuração e cruzamento de dados EFD">
      {/* Filters */}
      <div className="bg-slate-50 rounded-xl p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center">
              Cliente <RequiredMark />
            </label>
            {loadingClientes ? <Skeleton className="h-10 w-full" /> : (
              <Select value={selectedCliente} onValueChange={v => setSelectedCliente(v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center">
              Contribuinte <RequiredMark />
            </label>
            {loadingContribuintes && selectedCliente ? <Skeleton className="h-10 w-full" /> : (
              <Select
                value={selectedContribuinte}
                onValueChange={v => { setSelectedContribuinte(v); setSearchTriggered(false); }}
                disabled={!selectedCliente}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o contribuinte" /></SelectTrigger>
                <SelectContent>
                  {contribuintes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_razao_social}
                      {c.cpf_cnpj && <span className="ml-2 text-muted-foreground text-xs">{c.cpf_cnpj}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data Início</label>
            <MonthYearPicker value={mesInicio} onChange={setMesInicio} placeholder="Mês/Ano" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data Fim</label>
            <MonthYearPicker value={mesFim} onChange={setMesFim} placeholder="Mês/Ano" />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5">
            <Eraser className="h-3.5 w-3.5" /> Limpar
          </Button>
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isLoading}
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Consultar
          </Button>
        </div>
      </div>

      {/* Results */}
      {searchTriggered && (
        <>
          {isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-foreground">Erro ao buscar dados</p>
              <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : !hasData ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <PivotTable title="DK — Resumo" rows={resumo.rows} periodos={resumo.periodos} showCst showBloco />
              <PivotTable title="Débitos" rows={debitos.rows} periodos={debitos.periodos} showTotal />
              <PivotTable title="Isenções e Exclusões" rows={isencoes.rows} periodos={isencoes.periodos} showTotal />
              <PivotTable title="Créditos" rows={creditos.rows} periodos={creditos.periodos} showTotal />
            </div>
          )}
        </>
      )}
    </DevLayout>
  );
};

export default ApuracaoPisCofins;
