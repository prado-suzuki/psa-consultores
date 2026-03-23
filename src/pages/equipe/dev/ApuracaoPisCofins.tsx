import { useState, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { usePisCofinsApuracao } from '@/hooks/usePisCofinsApuracao';
import { usePisCofinsCalculator } from '@/hooks/usePisCofinsCalculator';
import { useTableHeaders } from '@/hooks/useTableHeaders';
import { ApuracaoDataTable } from '@/components/equipe/dev/pis-cofins/ApuracaoDataTable';
import { DynamicTableHeader } from '@/components/equipe/dev/pis-cofins/DynamicTableHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import { RequiredMark } from '@/components/ui/required-mark';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Eraser, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { useQuery } from '@tanstack/react-query';
import type { ResultadoPeriodo } from '@/types/pisCofins';

/* ── Formatters ── */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/* ── Helpers para somar valores de resultados por dataKeys ── */
const getResultadoColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (r: ResultadoPeriodo) => number,
): number => {
  return resultados
    .filter(r => dataKeys.includes(r.dt_ini.substring(0, 7)))
    .reduce((sum, r) => sum + accessor(r), 0);
};

const getRateioReceitasColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => number,
): number => {
  return resultados
    .filter(r => dataKeys.includes(r.dt_ini.substring(0, 7)) && r.rateio_receitas)
    .reduce((sum, r) => sum + accessor(r.rateio_receitas!), 0);
};

/* ── Main page ── */

const ApuracaoPisCofins = () => {
  // Filter state
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedContribuinte, setSelectedContribuinte] = useState('');
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(null);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // New UI state
  const [activeTab, setActiveTab] = useState<'apuracao' | 'dados' | 'rateio'>('apuracao');
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [tipoApuracao, setTipoApuracao] = useState<'EFD' | 'BALANCETE'>('EFD');
  const [periodoFechado, setPeriodoFechado] = useState(false);

  // ── Queries de clientes e contribuintes ──
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

  // ── Fetch de dados ──
  const dataInicio = monthYearToDateString(mesInicio, 'start');
  const dataFim = monthYearToDateString(mesFim, 'end');

  const { data: apiData, isLoading, error } = usePisCofinsApuracao({
    idContribuinte: selectedContribuinte,
    dtIni: dataInicio,
    dtFim: dataFim,
    enabled: searchTriggered && !!selectedContribuinte,
  });

  // ── Calculator + Headers ──
  const { resultados, totais, columnsData, tables } = usePisCofinsCalculator({
    data: apiData ?? null,
    tipoApuracao,
    periodoFechado,
  });

  const { headerRow1, headerRow2, hasExpandedYear, headerRowsCount, headerBottom } = useTableHeaders({
    columnsData,
    expandedYear,
  });

  const hasData = resultados.length > 0;

  // ── Handlers ──
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
    setExpandedYear(null);
  };

  // Shared table props for data tables
  const dataTableProps = {
    columnsData,
    expandedYear,
    setExpandedYear,
  };

  return (
    <DevLayout title="Apuração PIS/COFINS" subtitle="Auditoria e cruzamento de apurações tributárias">
      {/* Filters */}
      <div className="bg-muted/50 rounded-xl p-5 mb-6 space-y-4">
        {/* Row 1: Cliente, Contribuinte, Tipo de documento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Tipo de documento
            </label>
            <Select value={tipoApuracao} onValueChange={v => setTipoApuracao(v as 'EFD' | 'BALANCETE')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EFD">EFD Contribuições</SelectItem>
                <SelectItem value="BALANCETE">Balancete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Datas, switch, botões */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data Início</label>
            <MonthYearPicker value={mesInicio} onChange={setMesInicio} placeholder="Mês/Ano" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data Fim</label>
            <MonthYearPicker value={mesFim} onChange={setMesFim} placeholder="Mês/Ano" />
          </div>

          {tipoApuracao === 'BALANCETE' && (
            <div className="flex items-center gap-2 pb-1">
              <Switch
                id="periodo-fechado"
                checked={periodoFechado}
                onCheckedChange={setPeriodoFechado}
              />
              <Label htmlFor="periodo-fechado" className="text-sm text-muted-foreground">
                Período Fechado
              </Label>
            </div>
          )}

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5">
              <Eraser className="h-3.5 w-3.5" /> Limpar
            </Button>
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={isLoading}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Consultar
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searchTriggered && (
        <>
          {isLoading ? (
            <div className="bg-card rounded-xl shadow-sm p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : error ? (
            <div className="bg-card rounded-xl shadow-sm p-8 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-foreground">Erro ao buscar dados</p>
              <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : !hasData ? (
            <div className="bg-card rounded-xl shadow-sm p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="mb-6">
                <TabsList>
                  <TabsTrigger value="apuracao">Apuração</TabsTrigger>
                  <TabsTrigger value="dados">Dados</TabsTrigger>
                  {tipoApuracao === 'EFD' && <TabsTrigger value="rateio">Rateio</TabsTrigger>}
                </TabsList>
              </Tabs>

              {/* Tab: Apuração */}
              {activeTab === 'apuracao' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Saldo a Pagar Consolidado</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader
                            firstColumns={[{ label: 'Descrição' }]}
                            headerRow1={headerRow1}
                            headerRow2={headerRow2}
                            hasExpandedYear={hasExpandedYear}
                            headerRowsCount={headerRowsCount}
                            setExpandedYear={setExpandedYear}
                          />
                          <TableBody>
                            <TableRow className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-foreground">Valor Devido PIS</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono">
                                  {formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisDue))}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">
                                {formatCurrency(totais.pisDue)}
                              </TableCell>
                            </TableRow>

                            <TableRow className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-foreground">Valor Devido COFINS</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono">
                                  {formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsDue))}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">
                                {formatCurrency(totais.cofinsDue)}
                              </TableCell>
                            </TableRow>

                            <TableRow className="bg-primary/5 hover:bg-primary/10">
                              <TableCell className="font-bold text-primary">Total a Recolher</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono font-bold text-primary">
                                  {formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => Math.max(0, r.resultado.pisDue) + Math.max(0, r.resultado.cofinsDue)))}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold text-primary bg-primary/10">
                                {formatCurrency(Math.max(0, totais.pisDue) + Math.max(0, totais.cofinsDue))}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>
                </div>
              )}

              {/* Tab: Dados */}
              {activeTab === 'dados' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <ApuracaoDataTable title="DK — Resumo" data={tables.resumoData} showCst showBloco {...dataTableProps} />
                  <ApuracaoDataTable title="Débitos" data={tables.debitosData} {...dataTableProps} />
                  <ApuracaoDataTable title="Isenções e Exclusões" data={tables.isencoesData} {...dataTableProps} />
                  <ApuracaoDataTable title="Outras Saídas" data={tables.outrasSaidasData} {...dataTableProps} />
                  <ApuracaoDataTable title="Créditos" data={tables.creditosData} {...dataTableProps} />
                  <ApuracaoDataTable title="Isenções de Crédito" data={tables.isencoesCreditoData} {...dataTableProps} />
                </div>
              )}

              {/* Tab: Rateio */}
              {activeTab === 'rateio' && tipoApuracao === 'EFD' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Rateio das Receitas (Percentuais)</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader
                            firstColumns={[{ label: 'Descrição' }]}
                            headerRow1={headerRow1}
                            headerRow2={headerRow2}
                            hasExpandedYear={hasExpandedYear}
                            headerRowsCount={headerRowsCount}
                            setExpandedYear={setExpandedYear}
                          />
                          <TableBody>
                            {[
                              { label: 'Tributado no Mercado Interno', accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => r.rec_bru_ncum_trib_mi },
                              { label: 'Não Tributado no Mercado Interno', accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => r.rec_bru_ncum_nt_mi },
                              { label: 'Exportação', accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => r.rec_bru_ncum_exp },
                              { label: 'Cumulativo', accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => r.rec_bru_cum },
                            ].map((row) => (
                              <TableRow key={row.label} className="hover:bg-muted/30">
                                <TableCell className="font-semibold text-foreground">{row.label}</TableCell>
                                {headerBottom.map((col) => {
                                  const total = getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_total);
                                  const val = getRateioReceitasColValue(resultados, col.dataKeys, row.accessor);
                                  const perc = total > 0 ? val / total : 0;
                                  return (
                                    <TableCell key={col.id} className="text-right font-mono">
                                      {(perc * 100).toFixed(2)}%
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="bg-muted/30" />
                              </TableRow>
                            ))}

                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell className="font-bold text-foreground">Receita Bruta Total</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono font-bold">
                                  {formatCurrency(getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_total))}
                                </TableCell>
                              ))}
                              <TableCell className="bg-muted/30" />
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>
                </div>
              )}
            </>
          )}
        </>
      )}
    </DevLayout>
  );
};

export default ApuracaoPisCofins;