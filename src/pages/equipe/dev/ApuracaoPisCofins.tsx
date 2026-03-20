import { useState, useMemo } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { usePisCofinsApuracao } from '@/hooks/usePisCofinsApuracao';
import { calcularApuracao, type FonteValor, type ContaPeriodoValor, type ApuracaoMensal } from '@/lib/pisCofinsEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import { RequiredMark } from '@/components/ui/required-mark';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, Loader2, Eraser, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

// ── Formatters ──────────────────────────────────────────────────────
const fmt = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Pivot table for accounts ────────────────────────────────────────
function PivotAccountTable({
  title,
  contas,
  periodos,
  totais,
  totaisLabel,
}: {
  title: string;
  contas: ContaPeriodoValor[];
  periodos: string[];
  totais?: Record<string, number>;
  totaisLabel?: string;
}) {
  if (contas.length === 0 && !totais) return null;

  return (
    <div className="mb-6">
      <div className="bg-slate-100 px-3 py-2 rounded-t-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{title}</h3>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-0 bg-white z-10 min-w-[220px]">
                Conta / Descrição
              </TableHead>
              {periodos.map(p => (
                <TableHead key={p} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right min-w-[110px]">
                  {p}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.map(conta => (
              <TableRow key={conta.cod_cta} className="hover:bg-slate-50/60">
                <TableCell className="text-xs text-slate-700 sticky left-0 bg-white z-10 py-1 px-2">
                  <span className="font-medium tabular-nums">{conta.cod_cta}</span>
                  <span className="ml-1.5 text-slate-500 truncate max-w-[160px] inline-block align-bottom" title={conta.descricao_conta}>
                    {conta.descricao_conta}
                  </span>
                </TableCell>
                {periodos.map(p => {
                  const v = conta.valores[p] || 0;
                  return (
                    <TableCell key={p} className={cn('text-xs tabular-nums text-right py-1 px-2', v < 0 && 'text-red-600')}>
                      {fmt(v)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {totais && (
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableCell className="text-xs font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 py-1.5 px-2">
                  {totaisLabel || 'Total'}
                </TableCell>
                {periodos.map(p => {
                  const v = totais[p] || 0;
                  return (
                    <TableCell key={p} className={cn('text-xs font-semibold tabular-nums text-right py-1.5 px-2', v < 0 && 'text-red-600')}>
                      {fmt(v)}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Apuração summary table ─────────────────────────────────────────
function ApuracaoSummaryTable({
  apuracaoMensal,
  periodos,
}: {
  apuracaoMensal: ApuracaoMensal[];
  periodos: string[];
}) {
  const byPeriodo = new Map(apuracaoMensal.map(a => [a.periodo, a]));

  const lines: { label: string; key: string; getValue: (a: ApuracaoMensal) => number; bold?: boolean; colorPositive?: string; colorNegative?: string; indent?: boolean }[] = [
    // PIS
    { label: '── PIS ──', key: 'pis-header', getValue: () => NaN },
    { label: 'Contribuição Bruta PIS', key: 'cbp', getValue: a => a.contribuicaoBrutaPis },
    { label: '(-) Crédito do Mês PIS', key: 'cmp', getValue: a => a.creditoMesPis, indent: true },
    { label: '(-) Crédito Período Anterior PIS', key: 'cap', getValue: a => a.creditoAnteriorPis, indent: true },
    { label: '(=) PIS Devido', key: 'pd', getValue: a => a.pisDevido, bold: true, colorPositive: 'text-red-600' },
    { label: 'Saldo Crédito Acumulado PIS', key: 'sap', getValue: a => a.saldoAcumuladoPis, bold: true, colorPositive: 'text-green-600' },
    // COFINS
    { label: '── COFINS ──', key: 'cof-header', getValue: () => NaN },
    { label: 'Contribuição Bruta COFINS', key: 'cbc', getValue: a => a.contribuicaoBrutaCofins },
    { label: '(-) Crédito do Mês COFINS', key: 'cmc', getValue: a => a.creditoMesCofins, indent: true },
    { label: '(-) Crédito Período Anterior COFINS', key: 'cac', getValue: a => a.creditoAnteriorCofins, indent: true },
    { label: '(=) COFINS Devido', key: 'cd', getValue: a => a.cofinsDevido, bold: true, colorPositive: 'text-red-600' },
    { label: 'Saldo Crédito Acumulado COFINS', key: 'sac', getValue: a => a.saldoAcumuladoCofins, bold: true, colorPositive: 'text-green-600' },
  ];

  return (
    <div className="mb-6">
      <div className="bg-slate-100 px-3 py-2 rounded-t-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Resumo da Apuração Final</h3>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-0 bg-white z-10 min-w-[280px]">
                Descrição
              </TableHead>
              {periodos.map(p => (
                <TableHead key={p} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right min-w-[110px]">
                  {p}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map(line => {
              const isHeader = isNaN(line.getValue({ periodo: '', baseDebito: 0, baseCredito: 0, contribuicaoBrutaPis: 0, contribuicaoBrutaCofins: 0, creditoMesPis: 0, creditoMesCofins: 0, creditoAnteriorPis: 0, creditoAnteriorCofins: 0, pisDevido: 0, cofinsDevido: 0, saldoAcumuladoPis: 0, saldoAcumuladoCofins: 0 }));

              if (isHeader) {
                return (
                  <TableRow key={line.key} className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableCell colSpan={periodos.length + 1} className="text-xs font-bold text-slate-500 py-1.5 px-2">
                      {line.label}
                    </TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow key={line.key} className="hover:bg-slate-50/60">
                  <TableCell className={cn('text-xs text-slate-700 sticky left-0 bg-white z-10 py-1 px-2', line.indent && 'pl-5', line.bold && 'font-semibold')}>
                    {line.label}
                  </TableCell>
                  {periodos.map(p => {
                    const a = byPeriodo.get(p);
                    const v = a ? line.getValue(a) : 0;
                    let color = '';
                    if (v > 0 && line.colorPositive) color = line.colorPositive;
                    if (v < 0) color = line.colorNegative || 'text-red-600';
                    return (
                      <TableCell key={p} className={cn('text-xs tabular-nums text-right py-1 px-2', line.bold && 'font-semibold', color)}>
                        {fmt(v)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────
const ApuracaoPisCofins = () => {
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedContribuinte, setSelectedContribuinte] = useState('');
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(null);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [fonte, setFonte] = useState<FonteValor>('efd');

  // Clients
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

  // Contribuintes
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

  // Engine calculation
  const result = useMemo(() => {
    if (!apiData?.periodos?.length) return null;
    return calcularApuracao(apiData.periodos, fonte);
  }, [apiData, fonte]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center">
              Cliente <RequiredMark />
            </label>
            {loadingClientes ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedCliente} onValueChange={v => setSelectedCliente(v)}>
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
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Data Início</label>
            <MonthYearPicker value={mesInicio} onChange={setMesInicio} placeholder="Mês/Ano" />
          </div>

          {/* Data Fim */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Data Fim</label>
            <MonthYearPicker value={mesFim} onChange={setMesFim} placeholder="Mês/Ano" />
          </div>

          {/* Toggle Fonte */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Fonte</label>
            <ToggleGroup
              type="single"
              value={fonte}
              onValueChange={v => { if (v) setFonte(v as FonteValor); }}
              className="justify-start"
            >
              <ToggleGroupItem value="efd" className="text-xs px-3 h-10 data-[state=on]:bg-teal-600 data-[state=on]:text-white">
                EFD
              </ToggleGroupItem>
              <ToggleGroupItem value="balancete" className="text-xs px-3 h-10 data-[state=on]:bg-teal-600 data-[state=on]:text-white">
                Balancete
              </ToggleGroupItem>
            </ToggleGroup>
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
              <p className="text-sm text-slate-600">Erro ao buscar dados</p>
              <p className="text-xs text-slate-400">{(error as Error).message}</p>
            </div>
          ) : !result ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {/* Table 1: Resumo Analítico */}
              <PivotAccountTable
                title="Resumo Analítico"
                contas={result.resumoAnalitico}
                periodos={result.periodos}
              />

              {/* Table 2: Base de Débitos */}
              <PivotAccountTable
                title="Base de Débitos (CST 01–10)"
                contas={result.baseDebitos}
                periodos={result.periodos}
                totais={result.totaisDebito}
                totaisLabel="Total Base Débito"
              />

              {/* Table 3: Base de Créditos */}
              <PivotAccountTable
                title="Base de Créditos (CST 50–69)"
                contas={result.baseCreditos}
                periodos={result.periodos}
                totais={result.totaisCredito}
                totaisLabel="Total Base Crédito"
              />

              {/* Table 4: Resumo Apuração Final */}
              <ApuracaoSummaryTable
                apuracaoMensal={result.apuracaoMensal}
                periodos={result.periodos}
              />
            </div>
          )}
        </div>
      )}
    </DevLayout>
  );
};

export default ApuracaoPisCofins;
