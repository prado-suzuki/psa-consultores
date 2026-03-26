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
import type { ResultadoPeriodo, RateioResultado } from '@/types/pisCofins';

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

const getRateioColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (r: NonNullable<RateioResultado>) => number,
): number => {
  return resultados
    .filter(r => dataKeys.includes(r.dt_ini.substring(0, 7)) && r.rateio)
    .reduce((sum, r) => sum + accessor(r.rateio!), 0);
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
  const [activeTab, setActiveTab] = useState<'resumo' | 'debitos' | 'creditos' | 'apuracao' | 'rateio'>('resumo');
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
        .eq('excluido', false)
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
        .eq('ambiente', currentAmbiente)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
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
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
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
            <Button variant="outline" size="default" onClick={handleClear} className="gap-1.5">
              <Eraser className="h-4 w-4" /> Limpar
            </Button>
            <Button
              size="default"
              onClick={handleSearch}
              disabled={isLoading}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="debitos">Débitos</TabsTrigger>
                  <TabsTrigger value="creditos">Créditos</TabsTrigger>
                  <TabsTrigger value="apuracao">Apuração</TabsTrigger>
                  {tipoApuracao === 'EFD' && <TabsTrigger value="rateio">Rateio</TabsTrigger>}
                </TabsList>
              </Tabs>

              {/* ══════════════ Tab: RESUMO ══════════════ */}
              {activeTab === 'resumo' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <ApuracaoDataTable title="Resumo Geral" data={tables.resumoData} showCst showBloco {...dataTableProps} />
                </div>
              )}

              {/* ══════════════ Tab: DÉBITOS ══════════════ */}
              {activeTab === 'debitos' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <ApuracaoDataTable title="Débitos" titleTooltip="CSTs 01 a 10" data={tables.debitosData} {...dataTableProps} />
                  <ApuracaoDataTable title="Isenções e Exclusões" titleTooltip="CSTs 04 a 09" data={tables.isencoesData} emptyMessage="Nenhuma isenção/exclusão encontrada." {...dataTableProps} />
                  <ApuracaoDataTable title="Outras Saídas" data={tables.outrasSaidasData} emptyMessage="Nenhuma outra saída encontrada." {...dataTableProps} />

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Base de Cálculo Após Isenções/Exclusões</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Descrição' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold">Base Normal</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.baseDebito.baseNormal))}</TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(totais.receitaBruta)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>
                </div>
              )}

              {/* ══════════════ Tab: CRÉDITOS ══════════════ */}
              {activeTab === 'creditos' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <ApuracaoDataTable title="Créditos" titleTooltip="CSTs 50 a 66" data={tables.creditosData} {...dataTableProps} />
                  <ApuracaoDataTable title="Isenções e Exclusões do Crédito" titleTooltip="CSTs 70 a 99" data={tables.isencoesCreditoData} emptyMessage="Nenhuma isenção/exclusão de crédito encontrada." {...dataTableProps} />

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Base de Cálculo do Crédito</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Descrição' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold">Base Normal</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.baseCredito.baseNormal))}</TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(totais.baseCredito)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Crédito do Mês</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Descrição' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold">PIS</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono text-green-600">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisCreditoMes))}</TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">{formatCurrency(totais.pisCreditoMes)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">COFINS</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono text-green-600">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsCreditoMes))}</TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">{formatCurrency(totais.cofinsCreditoMes)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>
                </div>
              )}

              {/* ══════════════ Tab: APURAÇÃO ══════════════ */}
              {activeTab === 'apuracao' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Apuração</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Descrição' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell className="font-bold">Valor Devido PIS</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisDue))}</TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(totais.pisDue)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell className="font-bold">Valor Devido COFINS</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsDue))}</TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(totais.cofinsDue)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-primary/5 hover:bg-primary/10 font-bold text-lg">
                              <TableCell className="font-bold text-primary">Total Devido</TableCell>
                              {headerBottom.map((col) => (
                                <TableCell key={col.id} className="text-right font-mono font-bold text-primary">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => Math.max(0, r.resultado.pisDue) + Math.max(0, r.resultado.cofinsDue)))}</TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold text-primary bg-primary/10">{formatCurrency(Math.max(0, totais.pisDue) + Math.max(0, totais.cofinsDue))}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Apuração do Débito de COFINS</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Descrição' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold">Contribuição Bruta (Débito)</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono text-destructive">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsContribuicaoBruta))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold text-destructive bg-muted/30">{formatCurrency(totais.cofinsContribuicaoBruta)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">Crédito do Mês</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono text-green-600">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsCreditoMes))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">{formatCurrency(totais.cofinsCreditoMes)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">Crédito Anterior (Carryforward)</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono text-green-600">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsCreditoAnterior))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">-</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell className="font-bold">Valor Devido</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsDue))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(totais.cofinsDue)}</TableCell>
                            </TableRow>
                            <TableRow className="text-muted-foreground">
                              <TableCell>Saldo Acumulado p/ Próximo Mês</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.cofinsSaldoAcumulado))}</TableCell>))}
                              <TableCell className="text-right font-mono bg-muted/30">-</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Apuração do Débito de PIS</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Descrição' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold">Contribuição Bruta (Débito)</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono text-destructive">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisContribuicaoBruta))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold text-destructive bg-muted/30">{formatCurrency(totais.pisContribuicaoBruta)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">Crédito do Mês</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono text-green-600">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisCreditoMes))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">{formatCurrency(totais.pisCreditoMes)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold">Crédito Anterior (Carryforward)</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono text-green-600">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisCreditoAnterior))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">-</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell className="font-bold">Valor Devido</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisDue))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(totais.pisDue)}</TableCell>
                            </TableRow>
                            <TableRow className="text-muted-foreground">
                              <TableCell>Saldo Acumulado p/ Próximo Mês</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getResultadoColValue(resultados, col.dataKeys, r => r.resultado.pisSaldoAcumulado))}</TableCell>))}
                              <TableCell className="text-right font-mono bg-muted/30">-</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Isenções e Exclusões</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Conta' }, { label: 'Descrição' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            {[...tables.isencoesData, ...tables.isencoesCreditoData].length > 0 ? (
                              [...tables.isencoesData, ...tables.isencoesCreditoData].map((row) => (
                                <TableRow key={row.key}>
                                  <TableCell className="font-mono text-xs">{row.cod_cta}</TableCell>
                                  <TableCell className="text-sm truncate max-w-[250px]" title={row.descricao_conta}>{row.descricao_conta}</TableCell>
                                  {headerBottom.map((col) => (
                                    <TableCell key={col.id} className="text-right font-mono text-sm border-r border-border/30">{formatCurrency(col.dataKeys.reduce((sum, key) => sum + ((row[key] as number) || 0), 0))}</TableCell>
                                  ))}
                                  <TableCell className="text-right font-mono font-bold text-sm bg-muted/30">{formatCurrency(row.total)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={99} className="text-center text-muted-foreground p-8 italic">Nenhuma isenção/exclusão encontrada.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>
                </div>
              )}

              {/* ══════════════ Tab: RATEIO ══════════════ */}
              {activeTab === 'rateio' && tipoApuracao === 'EFD' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Rateio</h2>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <DynamicTableHeader firstColumns={[{ label: 'Rateio das receitas' }]} headerRow1={headerRow1} headerRow2={headerRow2} hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} setExpandedYear={setExpandedYear} />
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-bold">Total de Receitas apuradas</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_total))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30" />
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Total Tributadas</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_ncum_trib_mi))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30" />
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Total Não Tributadas</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_ncum_nt_mi))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30" />
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Total Não Tributadas - Exp.</TableCell>
                              {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_ncum_exp))}</TableCell>))}
                              <TableCell className="text-right font-mono font-bold bg-muted/30" />
                            </TableRow>

                            <TableRow className="bg-primary text-primary-foreground uppercase text-xs hover:bg-primary">
                              <TableCell className="font-bold" colSpan={headerBottom.length + 2}>Percentual de rateio</TableCell>
                            </TableRow>
                            {[
                              { label: 'Tributado', accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => r.rec_bru_ncum_trib_mi },
                              { label: 'Não Tributado', accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => r.rec_bru_ncum_nt_mi },
                              { label: 'Não Tributado - Exportação', accessor: (r: NonNullable<ResultadoPeriodo['rateio_receitas']>) => r.rec_bru_ncum_exp },
                            ].map((row) => (
                              <TableRow key={row.label}>
                                <TableCell className="font-bold">{row.label}</TableCell>
                                {headerBottom.map((col) => {
                                  const total = getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_total);
                                  const val = getRateioReceitasColValue(resultados, col.dataKeys, row.accessor);
                                  const perc = total > 0 ? val / total : 0;
                                  return (<TableCell key={col.id} className="text-right font-mono">{(perc * 100).toFixed(2)}%</TableCell>);
                                })}
                                <TableCell className="text-right font-mono font-bold bg-muted/30" />
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted text-muted-foreground uppercase text-xs">
                              <TableCell className="font-bold text-right">Total % Apurado</TableCell>
                              {headerBottom.map((col) => {
                                const total = getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_total);
                                const trib = getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_ncum_trib_mi);
                                const naoTrib = getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_ncum_nt_mi);
                                const exp = getRateioReceitasColValue(resultados, col.dataKeys, r => r.rec_bru_ncum_exp);
                                const perc = total > 0 ? (trib + naoTrib + exp) / total : 0;
                                return (<TableCell key={col.id} className="text-right font-mono font-bold">{(perc * 100).toFixed(2)}%</TableCell>);
                              })}
                              <TableCell className="text-right font-mono font-bold bg-muted/30" />
                            </TableRow>

                            <TableRow className="bg-transparent border-none hover:bg-transparent">
                              <TableCell colSpan={headerBottom.length + 2} className="p-2" />
                            </TableRow>
                            {[
                              { label: 'PIS - 101 (Créditos Vinculados a Receita Tributada M.I.)', field: 'pis101' as const },
                              { label: 'PIS - 201 (Créditos Vinculados a Receita Não Tributada M.I.)', field: 'pis201' as const },
                              { label: 'PIS - 301 (Créditos Vinculados a Receita de Exportação)', field: 'pis301' as const },
                            ].map((row) => (
                              <TableRow key={row.field} className="bg-muted/50 text-xs">
                                <TableCell className="font-bold">{row.label}</TableCell>
                                {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getRateioColValue(resultados, col.dataKeys, r => r[row.field]))}</TableCell>))}
                                <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(resultados.reduce((sum, r) => sum + (r.rateio?.[row.field] || 0), 0))}</TableCell>
                              </TableRow>
                            ))}

                            <TableRow className="bg-transparent border-none hover:bg-transparent">
                              <TableCell colSpan={headerBottom.length + 2} className="p-2" />
                            </TableRow>
                            {[
                              { label: 'COFINS - 101 (Créditos Vinculados a Receita Tributada M.I.)', field: 'cofins101' as const },
                              { label: 'COFINS - 201 (Créditos Vinculados a Receita Não Tributada M.I.)', field: 'cofins201' as const },
                              { label: 'COFINS - 301 (Créditos Vinculados a Receita de Exportação)', field: 'cofins301' as const },
                            ].map((row) => (
                              <TableRow key={row.field} className="bg-muted/50 text-xs">
                                <TableCell className="font-bold">{row.label}</TableCell>
                                {headerBottom.map((col) => (<TableCell key={col.id} className="text-right font-mono">{formatCurrency(getRateioColValue(resultados, col.dataKeys, r => r[row.field]))}</TableCell>))}
                                <TableCell className="text-right font-mono font-bold bg-muted/30">{formatCurrency(resultados.reduce((sum, r) => sum + (r.rateio?.[row.field] || 0), 0))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </section>
                </div>
              )}

              {/* Tab: Apuração */}
              {activeTab === 'apuracao' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Tabelas detalhadas de apuração serão adicionadas aqui */}
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