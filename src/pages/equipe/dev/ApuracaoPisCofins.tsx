import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { usePisCofinsApuracao } from '@/hooks/usePisCofinsApuracao';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import { RequiredMark } from '@/components/ui/required-mark';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, PieChart, Loader2, Eraser, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { PisCofinsRow } from '@/types/pisCofins';

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPeriodo = (dtIni: string) => {
  const [year, month] = dtIni.split('-');
  return `${month}/${year}`;
};

const ApuracaoPisCofins = () => {
  // Filter states
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedContribuinte, setSelectedContribuinte] = useState('');
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(null);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Clients query
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

  // Contribuintes query
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

  // Auto-select single contribuinte
  useEffect(() => {
    if (selectedCliente && contribuintes?.length === 1 && !selectedContribuinte) {
      setSelectedContribuinte(contribuintes[0].id);
    }
  }, [selectedCliente, contribuintes, selectedContribuinte]);

  // Reset contribuinte when client changes
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

  // Flatten transformation
  const rows: PisCofinsRow[] = useMemo(() => {
    if (!apiData?.periodos) return [];
    return apiData.periodos.flatMap(periodo =>
      periodo.itens_credito.map(item => ({
        ...item,
        periodo: formatPeriodo(periodo.dt_ini),
        dt_ini: periodo.dt_ini,
        rateio_receitas: periodo.rateio_receitas,
      }))
    );
  }, [apiData]);

  const handleSearch = () => {
    if (!selectedContribuinte) {
      toast({ title: 'Selecione um contribuinte', variant: 'destructive' });
      return;
    }
    // Date pair validation
    if ((mesInicio && !mesFim) || (!mesInicio && mesFim)) {
      toast({ title: 'Informe ambas as datas ou nenhuma', variant: 'destructive' });
      return;
    }
    // End >= Start validation
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
          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center">
              Cliente <RequiredMark />
            </label>
            {loadingClientes ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedCliente} onValueChange={v => { setSelectedCliente(v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Contribuinte */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center">
              Contribuinte <RequiredMark />
            </label>
            {loadingContribuintes && selectedCliente ? (
              <Skeleton className="h-10 w-full" />
            ) : (
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
                      {c.cpf_cnpj && <span className="ml-2 text-slate-400 text-xs">{c.cpf_cnpj}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data Início */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Data Início
            </label>
            <MonthYearPicker value={mesInicio} onChange={setMesInicio} placeholder="Mês/Ano" />
          </div>

          {/* Data Fim */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Data Fim
            </label>
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

      {/* Data Grid */}
      {searchTriggered && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
              <p className="text-sm text-slate-600">Erro ao buscar dados</p>
              <p className="text-xs text-slate-400">{(error as Error).message}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-slate-100 hover:bg-slate-100">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Período</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">CST</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Alíq %</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">CTA</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descrição Conta</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bloco EFD</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">VLR EFD</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Crédito</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Débito</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Saldo Per.</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Saldo Atual</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={`${row.dt_ini}-${row.cod_cta}-${idx}`} className="hover:bg-slate-50">
                      <TableCell className="text-sm font-medium text-slate-700 whitespace-nowrap">{row.periodo}</TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums">{row.cst_pis}</TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums text-right">{formatCurrency(row.aliq_pis)}</TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums">{row.cod_cta}</TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[200px] truncate" title={row.descricao_conta}>{row.descricao_conta}</TableCell>
                      <TableCell className="text-sm text-slate-600">{row.bloco_efd}</TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums text-right">{formatCurrency(row.vlr_efd)}</TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums text-right">{formatCurrency(row.credito)}</TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums text-right">{formatCurrency(row.debito)}</TableCell>
                      <TableCell className={cn(
                        'text-sm tabular-nums text-right font-medium',
                        row.saldo_periodo < 0 ? 'text-red-600' : 'text-slate-700'
                      )}>
                        {formatCurrency(row.saldo_periodo)}
                      </TableCell>
                      <TableCell className={cn(
                        'text-sm tabular-nums text-right font-medium',
                        row.saldo_atual < 0 ? 'text-red-600' : 'text-slate-700'
                      )}>
                        {formatCurrency(row.saldo_atual)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-teal-600"
                          title="Rateio de receitas"
                          disabled={!row.rateio_receitas}
                        >
                          <PieChart className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Row count */}
          {rows.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 text-xs text-slate-500">
              {rows.length} registro{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </DevLayout>
  );
};

export default ApuracaoPisCofins;
