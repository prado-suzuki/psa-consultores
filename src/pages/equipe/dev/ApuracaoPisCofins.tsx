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
import type { PivotRow } from '@/types/pisCofins';

const fmt = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const periodLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
};

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

  // Pivot transformation
  const { pivotRows, periodos } = useMemo(() => {
    if (!apiData?.periodos?.length) return { pivotRows: [] as PivotRow[], periodos: [] as string[] };

    const periodKeys = apiData.periodos
      .map(p => p.dt_ini.slice(0, 7)) // "YYYY-MM"
      .sort();

    const map = new Map<string, PivotRow>();

    for (const periodo of apiData.periodos) {
      const pk = periodo.dt_ini.slice(0, 7);
      for (const item of periodo.itens_credito) {
        const key = `${item.cst_pis}|${item.cod_cta}|${item.descricao_conta}|${item.bloco_efd}`;
        if (!map.has(key)) {
          map.set(key, {
            cst_pis: item.cst_pis,
            cod_cta: item.cod_cta,
            descricao_conta: item.descricao_conta,
            bloco_efd: item.bloco_efd,
            valores: {},
          });
        }
        const row = map.get(key)!;
        row.valores[pk] = (row.valores[pk] || 0) + item.vlr_efd;
      }
    }

    return { pivotRows: Array.from(map.values()), periodos: periodKeys };
  }, [apiData]);

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

  // Sticky left offsets for fixed columns
  const COL_W = { cst: 60, cta: 90, desc: 200, bloco: 80 };
  const stickyLeft = {
    cst: 0,
    cta: COL_W.cst,
    desc: COL_W.cst + COL_W.cta,
    bloco: COL_W.cst + COL_W.cta + COL_W.desc,
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

      {/* Pivot Grid */}
      {searchTriggered && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-foreground">Erro ao buscar dados</p>
              <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : pivotRows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <Table className="text-xs">
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-slate-100 hover:bg-slate-100">
                    <TableHead
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 z-30 bg-slate-100 whitespace-nowrap"
                      style={{ width: COL_W.cst, minWidth: COL_W.cst, left: stickyLeft.cst }}
                    >
                      CST
                    </TableHead>
                    <TableHead
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky z-30 bg-slate-100 whitespace-nowrap"
                      style={{ width: COL_W.cta, minWidth: COL_W.cta, left: stickyLeft.cta }}
                    >
                      CTA
                    </TableHead>
                    <TableHead
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky z-30 bg-slate-100 whitespace-nowrap"
                      style={{ width: COL_W.desc, minWidth: COL_W.desc, left: stickyLeft.desc }}
                    >
                      Descrição Conta
                    </TableHead>
                    <TableHead
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky z-30 bg-slate-100 whitespace-nowrap border-r border-slate-200"
                      style={{ width: COL_W.bloco, minWidth: COL_W.bloco, left: stickyLeft.bloco }}
                    >
                      Bloco
                    </TableHead>
                    {periodos.map(pk => (
                      <TableHead
                        key={pk}
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap"
                        style={{ minWidth: 100 }}
                      >
                        {periodLabel(pk)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotRows.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell
                        className="text-xs tabular-nums sticky left-0 z-10 bg-white whitespace-nowrap p-2"
                        style={{ left: stickyLeft.cst }}
                      >
                        {row.cst_pis}
                      </TableCell>
                      <TableCell
                        className="text-xs tabular-nums sticky z-10 bg-white whitespace-nowrap p-2"
                        style={{ left: stickyLeft.cta }}
                      >
                        {row.cod_cta}
                      </TableCell>
                      <TableCell
                        className="text-xs sticky z-10 bg-white p-2 truncate"
                        style={{ left: stickyLeft.desc, maxWidth: COL_W.desc }}
                        title={row.descricao_conta}
                      >
                        {row.descricao_conta}
                      </TableCell>
                      <TableCell
                        className="text-xs sticky z-10 bg-white whitespace-nowrap p-2 border-r border-slate-200"
                        style={{ left: stickyLeft.bloco }}
                      >
                        {row.bloco_efd}
                      </TableCell>
                      {periodos.map(pk => {
                        const val = row.valores[pk] ?? 0;
                        return (
                          <TableCell
                            key={pk}
                            className={cn(
                              'text-xs tabular-nums text-right whitespace-nowrap p-2',
                              val < 0 ? 'text-red-600' : 'text-foreground'
                            )}
                          >
                            {fmt(val)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pivotRows.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 text-xs text-muted-foreground">
              {pivotRows.length} conta{pivotRows.length !== 1 ? 's' : ''} · {periodos.length} período{periodos.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </DevLayout>
  );
};

export default ApuracaoPisCofins;
