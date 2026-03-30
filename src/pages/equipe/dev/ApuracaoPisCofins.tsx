import { useState, useEffect, useCallback } from "react";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { usePisCofinsApuracao } from "@/hooks/usePisCofinsApuracao";
import { usePisCofinsCalculator } from "@/hooks/usePisCofinsCalculator";
import { useTableHeaders } from "@/hooks/useTableHeaders";
import { ApuracaoDataTable } from "@/components/equipe/dev/pis-cofins/ApuracaoDataTable";
import { DynamicTableHeader } from "@/components/equipe/dev/pis-cofins/DynamicTableHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthYearPicker, monthYearToDateString } from "@/components/ui/month-year-picker";
import { RequiredMark } from "@/components/ui/required-mark";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Eraser, AlertCircle, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { currentAmbiente } from "@/config/api";
import { useQuery } from "@tanstack/react-query";
import type { StickyColumnConfig } from "@/components/equipe/dev/pis-cofins/ApuracaoDataTable";
import type { ResultadoPeriodo, RateioResultado } from "@/types/pisCofins";

/* ── Formatters ── */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

/* ── Helpers para somar valores de resultados por dataKeys ── */
const getResultadoColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (r: ResultadoPeriodo) => number,
): number => {
  return resultados.filter((r) => dataKeys.includes(r.dt_ini.substring(0, 7))).reduce((sum, r) => sum + accessor(r), 0);
};

const getRateioReceitasColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (r: NonNullable<ResultadoPeriodo["rateio_receitas"]>) => number,
): number => {
  return resultados
    .filter((r) => dataKeys.includes(r.dt_ini.substring(0, 7)) && r.rateio_receitas)
    .reduce((sum, r) => sum + accessor(r.rateio_receitas!), 0);
};

const getRateioColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (r: NonNullable<RateioResultado>) => number,
): number => {
  return resultados
    .filter((r) => dataKeys.includes(r.dt_ini.substring(0, 7)) && r.rateio)
    .reduce((sum, r) => sum + accessor(r.rateio!), 0);
};

/* ── Sticky config for single-column inline tables ── */
const SINGLE_STICKY: StickyColumnConfig[] = [{ label: "Descrição", width: 250, left: 0, isLast: true }];

const RATEIO_STICKY: StickyColumnConfig[] = [{ label: "Rateio das receitas", width: 250, left: 0, isLast: true }];

const TWO_COL_STICKY: StickyColumnConfig[] = [
  { label: "Conta", width: 100, left: 0, isLast: false },
  { label: "Descrição", width: 250, left: 100, isLast: true },
];

/* ── Inline table wrapper (single scroll container, no shadcn Table wrapper) ── */
const InlineTableWrapper = ({ children }: { children: React.ReactNode }) => (
  <Card className="overflow-x-auto max-w-full">
    <table className="w-full caption-bottom text-sm min-w-max">{children}</table>
  </Card>
);

/* ── Sticky first cell helper ── */
const StickyCell = ({
  config,
  className,
  children,
  ...props
}: {
  config: StickyColumnConfig;
  className?: string;
  children: React.ReactNode;
} & React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <TableCell
    className={`sticky z-10 bg-card ${config.isLast ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" : ""} ${className || ""}`}
    style={{ left: config.left, minWidth: config.width }}
    {...props}
  >
    {children}
  </TableCell>
);

/* ── Sticky cell for highlighted rows ── */
const StickyCellMuted = ({
  config,
  className,
  children,
  ...props
}: {
  config: StickyColumnConfig;
  className?: string;
  children: React.ReactNode;
} & React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <TableCell
    className={`sticky z-10 bg-muted/50 ${config.isLast ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" : ""} ${className || ""}`}
    style={{ left: config.left, minWidth: config.width }}
    {...props}
  >
    {children}
  </TableCell>
);

/* ── Main page ── */

const ApuracaoPisCofins = () => {
  // Filter state
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedContribuinte, setSelectedContribuinte] = useState("");
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(null);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Committed filter values — only updated when "Consultar" is clicked
  const [committedMesInicio, setCommittedMesInicio] = useState<{ month: number; year: number } | null>(null);
  const [committedMesFim, setCommittedMesFim] = useState<{ month: number; year: number } | null>(null);
  const [committedContribuinte, setCommittedContribuinte] = useState("");

  // New UI state
  const [activeTab, setActiveTab] = useState<"resumo" | "debitos" | "creditos" | "apuracao" | "rateio">("resumo");
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const toggleYear = useCallback((year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);
  const [tipoApuracao, setTipoApuracao] = useState<"EFD" | "BALANCETE">("EFD");
  const [periodoFechado, setPeriodoFechado] = useState(false);

  // ── Queries de clientes e contribuintes ──
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-piscofins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cliente")
        .select("id, nome")
        .eq("ativo", true)
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente)
        .order("nome");
      return (data || []) as { id: string; nome: string }[];
    },
  });

  const { data: contribuintes, isLoading: loadingContribuintes } = useQuery({
    queryKey: ["contribuintes-piscofins", selectedCliente],
    queryFn: async () => {
      const { data } = await supabase
        .from("contribuinte")
        .select("id, nome_razao_social, cpf_cnpj")
        .eq("cliente_id", selectedCliente)
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente)
        .order("nome_razao_social");
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
    setSelectedContribuinte("");
    setSearchTriggered(false);
  }, [selectedCliente]);

  // ── Fetch de dados ──
  const committedDataInicio = monthYearToDateString(committedMesInicio, "start");
  const committedDataFim = monthYearToDateString(committedMesFim, "end");

  const {
    data: apiData,
    isLoading,
    error,
  } = usePisCofinsApuracao({
    idContribuinte: committedContribuinte,
    dtIni: committedDataInicio,
    dtFim: committedDataFim,
    enabled: searchTriggered && !!committedContribuinte,
  });

  // ── Calculator + Headers ──
  const { resultados, totais, columnsData, tables } = usePisCofinsCalculator({
    data: apiData ?? null,
    tipoApuracao,
    periodoFechado,
  });

  const { headerRow1, headerRow2, hasExpandedYear, headerRowsCount, headerBottom } = useTableHeaders({
    columnsData,
    expandedYears,
  });

  const hasData = resultados.length > 0;

  // ── Handlers ──
  const handleSearch = () => {
    if (!selectedContribuinte) {
      toast({ title: "Selecione um contribuinte", variant: "destructive" });
      return;
    }
    if ((mesInicio && !mesFim) || (!mesInicio && mesFim)) {
      toast({ title: "Informe ambas as datas ou nenhuma", variant: "destructive" });
      return;
    }
    if (mesInicio && mesFim) {
      const startVal = mesInicio.year * 12 + mesInicio.month;
      const endVal = mesFim.year * 12 + mesFim.month;
      if (endVal < startVal) {
        toast({ title: "Data final deve ser ≥ data inicial", variant: "destructive" });
        return;
      }
    }
    // Commit current filter values so the query uses them
    setCommittedContribuinte(selectedContribuinte);
    setCommittedMesInicio(mesInicio);
    setCommittedMesFim(mesFim);
    setSearchTriggered(true);
  };

  const handleClear = () => {
    setSelectedCliente("");
    setSelectedContribuinte("");
    setMesInicio(null);
    setMesFim(null);
    setCommittedContribuinte("");
    setCommittedMesInicio(null);
    setCommittedMesFim(null);
    setSearchTriggered(false);
    setExpandedYears(new Set());
  };

  // Shared table props for data tables
  const dataTableProps = {
    columnsData,
    expandedYears,
    toggleYear,
  };

  // Shared header props for inline tables
  const inlineHeaderProps = {
    headerRow1,
    headerRow2,
    hasExpandedYear,
    headerRowsCount,
    toggleYear,
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
            {loadingClientes ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedCliente} onValueChange={(v) => setSelectedCliente(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Contribuinte <RequiredMark />
            </label>
            {loadingContribuintes && selectedCliente ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedContribuinte}
                onValueChange={(v) => {
                  setSelectedContribuinte(v);
                  setSearchTriggered(false);
                }}
                disabled={!selectedCliente}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes?.map((c) => (
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
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              Tipo de análise
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p><strong>Cliente:</strong> Traz os dados do EFD Contribuições do cliente.</p>
                  <p><strong>Prado:</strong> Traz informações do Balancete do cliente.</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={tipoApuracao} onValueChange={(v) => setTipoApuracao(v as "EFD" | "BALANCETE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFD">Cliente</SelectItem>
                <SelectItem value="BALANCETE">Prado</SelectItem>
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

          {tipoApuracao === "BALANCETE" && (
            <div className="flex items-center gap-2 pb-1">
              <Switch id="periodo-fechado" checked={periodoFechado} onCheckedChange={setPeriodoFechado} />
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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
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
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
                <TabsList>
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="debitos">Débitos</TabsTrigger>
                  <TabsTrigger value="creditos">Créditos</TabsTrigger>
                  <TabsTrigger value="apuracao">Apuração</TabsTrigger>
                  {tipoApuracao === "EFD" && <TabsTrigger value="rateio">Rateio</TabsTrigger>}
                </TabsList>
              </Tabs>

              {/* ══════════════ Tab: RESUMO ══════════════ */}
              {activeTab === "resumo" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <ApuracaoDataTable
                    title="Resumo Geral"
                    data={tables.resumoData}
                    showCst
                    showBloco
                    {...dataTableProps}
                  />
                </div>
              )}

              {/* ══════════════ Tab: DÉBITOS ══════════════ */}
              {activeTab === "debitos" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <ApuracaoDataTable
                    title="Débitos"
                    titleTooltip="Para débitos são considerados itens de CST 01 a 10."
                    data={tables.debitosData}
                    showTotals
                    {...dataTableProps}
                  />
                  <ApuracaoDataTable
                    title="Isenções e Exclusões"
                    titleTooltip="Para isenções e exclusões de débito são considerados itens de CST 04 a 09."
                    data={tables.isencoesData}
                    emptyMessage="Nenhuma isenção/exclusão encontrada."
                    showTotals
                    {...dataTableProps}
                  />
                   {tables.outrasSaidasData.length > 0 && (
                     <ApuracaoDataTable
                       title="Outras Saídas"
                       data={tables.outrasSaidasData}
                       showTotals
                       {...dataTableProps}
                     />
                   )}

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">
                      Base de Cálculo Após Isenções/Exclusões
                    </h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={SINGLE_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Base Normal
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.baseDebito.baseNormal),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30">
                            {formatCurrency(totais.receitaBruta)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </InlineTableWrapper>
                  </section>
                </div>
              )}

              {/* ══════════════ Tab: CRÉDITOS ══════════════ */}
              {activeTab === "creditos" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <ApuracaoDataTable
                    title="Créditos"
                    titleTooltip="Para créditos são considerados itens de CST 50 a 66."
                    data={tables.creditosData}
                    showTotals
                    {...dataTableProps}
                  />
                  <ApuracaoDataTable
                    title="Adições e Exclusões do Crédito"
                    titleTooltip="Para adições e exclusões de crédito são considerados itens de CST 70 a 99."
                    data={tables.isencoesCreditoData}
                    emptyMessage="Nenhuma adição/exclusão de crédito encontrada."
                    showTotals
                    {...dataTableProps}
                  />

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Base de Cálculo do Crédito</h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={SINGLE_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Base Normal
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.baseCredito.baseNormal),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30">
                            {formatCurrency(totais.baseCredito)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </InlineTableWrapper>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Crédito do Mês</h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={SINGLE_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            PIS
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-green-600">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.pisCreditoMes),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">
                            {formatCurrency(totais.pisCreditoMes)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            COFINS
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-green-600">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.cofinsCreditoMes),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">
                            {formatCurrency(totais.cofinsCreditoMes)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </InlineTableWrapper>
                  </section>
                </div>
              )}

              {/* ══════════════ Tab: APURAÇÃO ══════════════ */}
              {activeTab === "apuracao" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Apuração</h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={SINGLE_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        <TableRow className="bg-muted/50 font-bold">
                          <StickyCellMuted config={SINGLE_STICKY[0]} className="font-bold">
                            Valor Devido PIS
                          </StickyCellMuted>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.pisDue),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30">
                            {formatCurrency(totais.pisDue)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-bold">
                          <StickyCellMuted config={SINGLE_STICKY[0]} className="font-bold">
                            Valor Devido COFINS
                          </StickyCellMuted>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.cofinsDue),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30">
                            {formatCurrency(totais.cofinsDue)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/5 hover:bg-primary/10 font-bold text-sm">
                          <TableCell
                            className="font-bold text-primary sticky left-0 z-10 bg-primary/5 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                            style={{ minWidth: 250 }}
                          >
                            Total Devido
                          </TableCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono font-bold text-primary">
                              {formatCurrency(
                                getResultadoColValue(
                                  resultados,
                                  col.dataKeys,
                                  (r) => Math.max(0, r.resultado.pisDue) + Math.max(0, r.resultado.cofinsDue),
                                ),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-primary bg-primary/10">
                            {formatCurrency(Math.max(0, totais.pisDue) + Math.max(0, totais.cofinsDue))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </InlineTableWrapper>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Apuração do Débito de COFINS</h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={SINGLE_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Contribuição Bruta (Débito)
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-destructive">
                              {formatCurrency(
                                getResultadoColValue(
                                  resultados,
                                  col.dataKeys,
                                  (r) => r.resultado.cofinsContribuicaoBruta,
                                ),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-destructive bg-muted/30">
                            {formatCurrency(totais.cofinsContribuicaoBruta)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Crédito do Mês
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-green-600">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.cofinsCreditoMes),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">
                            {formatCurrency(totais.cofinsCreditoMes)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Crédito Anterior (Carryforward)
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-green-600">
                              {formatCurrency(
                                getResultadoColValue(
                                  resultados,
                                  col.dataKeys,
                                  (r) => r.resultado.cofinsCreditoAnterior,
                                ),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">-</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-bold">
                          <StickyCellMuted config={SINGLE_STICKY[0]} className="font-bold">
                            Valor Devido
                          </StickyCellMuted>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.cofinsDue),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30">
                            {formatCurrency(totais.cofinsDue)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="text-muted-foreground">
                          <StickyCell config={SINGLE_STICKY[0]}>Saldo Acumulado p/ Próximo Mês</StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.cofinsSaldoAcumulado),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono bg-muted/30">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </InlineTableWrapper>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Apuração do Débito de PIS</h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={SINGLE_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Contribuição Bruta (Débito)
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-destructive">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.pisContribuicaoBruta),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-destructive bg-muted/30">
                            {formatCurrency(totais.pisContribuicaoBruta)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Crédito do Mês
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-green-600">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.pisCreditoMes),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">
                            {formatCurrency(totais.pisCreditoMes)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <StickyCell config={SINGLE_STICKY[0]} className="font-semibold">
                            Crédito Anterior (Carryforward)
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono text-green-600">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.pisCreditoAnterior),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold text-green-600 bg-muted/30">-</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-bold">
                          <StickyCellMuted config={SINGLE_STICKY[0]} className="font-bold">
                            Valor Devido
                          </StickyCellMuted>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.pisDue),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30">
                            {formatCurrency(totais.pisDue)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="text-muted-foreground">
                          <StickyCell config={SINGLE_STICKY[0]}>Saldo Acumulado p/ Próximo Mês</StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getResultadoColValue(resultados, col.dataKeys, (r) => r.resultado.pisSaldoAcumulado),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono bg-muted/30">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </InlineTableWrapper>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Isenções e Exclusões</h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={TWO_COL_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        {[...tables.isencoesData, ...tables.isencoesCreditoData].length > 0 ? (
                          [...tables.isencoesData, ...tables.isencoesCreditoData].map((row) => (
                            <TableRow key={row.key}>
                              <StickyCell config={TWO_COL_STICKY[0]} className="font-mono text-xs">
                                {row.cod_cta}
                              </StickyCell>
                              <StickyCell config={TWO_COL_STICKY[1]} className="text-sm">
                                <span className="block truncate" style={{ maxWidth: 250 }} title={row.descricao_conta}>
                                  {row.descricao_conta}
                                </span>
                              </StickyCell>
                              {headerBottom.map((col) => (
                                <TableCell
                                  key={col.id}
                                  className="text-right font-mono text-sm border-r border-border/30"
                                >
                                  {formatCurrency(
                                    col.dataKeys.reduce((sum, key) => sum + ((row[key] as number) || 0), 0),
                                  )}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-mono font-bold text-sm bg-muted/30">
                                {formatCurrency(row.total)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={99} className="text-center text-muted-foreground p-8 italic">
                              Nenhuma isenção/exclusão encontrada.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </InlineTableWrapper>
                  </section>
                </div>
              )}

              {/* ══════════════ Tab: RATEIO ══════════════ */}
              {activeTab === "rateio" && tipoApuracao === "EFD" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h2 className="text-lg font-bold uppercase mb-4 text-primary">Rateio</h2>
                    <InlineTableWrapper>
                      <DynamicTableHeader stickyConfig={RATEIO_STICKY} {...inlineHeaderProps} />
                      <TableBody>
                        <TableRow>
                          <StickyCell config={RATEIO_STICKY[0]} className="font-bold">
                            Total de Receitas apuradas
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getRateioReceitasColValue(resultados, col.dataKeys, (r) => r.rec_bru_total),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30" />
                        </TableRow>
                        <TableRow>
                          <StickyCell config={RATEIO_STICKY[0]} className="font-bold">
                            Total Tributadas
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getRateioReceitasColValue(resultados, col.dataKeys, (r) => r.rec_bru_ncum_trib_mi),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30" />
                        </TableRow>
                        <TableRow>
                          <StickyCell config={RATEIO_STICKY[0]} className="font-bold">
                            Total Não Tributadas
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getRateioReceitasColValue(resultados, col.dataKeys, (r) => r.rec_bru_ncum_nt_mi),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30" />
                        </TableRow>
                        <TableRow>
                          <StickyCell config={RATEIO_STICKY[0]} className="font-bold">
                            Total Não Tributadas - Exp.
                          </StickyCell>
                          {headerBottom.map((col) => (
                            <TableCell key={col.id} className="text-right font-mono">
                              {formatCurrency(
                                getRateioReceitasColValue(resultados, col.dataKeys, (r) => r.rec_bru_ncum_exp),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-bold bg-muted/30" />
                        </TableRow>

                        <TableRow className="bg-primary text-primary-foreground uppercase text-xs hover:bg-primary">
                          <TableCell
                            className="font-bold sticky left-0 z-10 bg-primary"
                            style={{ minWidth: 250 }}
                            colSpan={1}
                          >
                            Percentual de rateio
                          </TableCell>
                          <TableCell colSpan={headerBottom.length + 1} />
                        </TableRow>
                        {[
                          {
                            label: "Tributado",
                            accessor: (r: NonNullable<ResultadoPeriodo["rateio_receitas"]>) => r.rec_bru_ncum_trib_mi,
                          },
                          {
                            label: "Não Tributado",
                            accessor: (r: NonNullable<ResultadoPeriodo["rateio_receitas"]>) => r.rec_bru_ncum_nt_mi,
                          },
                          {
                            label: "Não Tributado - Exportação",
                            accessor: (r: NonNullable<ResultadoPeriodo["rateio_receitas"]>) => r.rec_bru_ncum_exp,
                          },
                        ].map((row) => (
                          <TableRow key={row.label}>
                            <StickyCell config={RATEIO_STICKY[0]} className="font-bold">
                              {row.label}
                            </StickyCell>
                            {headerBottom.map((col) => {
                              const total = getRateioReceitasColValue(resultados, col.dataKeys, (r) => r.rec_bru_total);
                              const val = getRateioReceitasColValue(resultados, col.dataKeys, row.accessor);
                              const perc = total > 0 ? val / total : 0;
                              return (
                                <TableCell key={col.id} className="text-right font-mono">
                                  {(perc * 100).toFixed(2)}%
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-mono font-bold bg-muted/30" />
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted text-muted-foreground uppercase text-xs">
                          <StickyCellMuted config={RATEIO_STICKY[0]} className="font-bold text-right bg-muted">
                            Total % Apurado
                          </StickyCellMuted>
                          {headerBottom.map((col) => {
                            const total = getRateioReceitasColValue(resultados, col.dataKeys, (r) => r.rec_bru_total);
                            const trib = getRateioReceitasColValue(
                              resultados,
                              col.dataKeys,
                              (r) => r.rec_bru_ncum_trib_mi,
                            );
                            const naoTrib = getRateioReceitasColValue(
                              resultados,
                              col.dataKeys,
                              (r) => r.rec_bru_ncum_nt_mi,
                            );
                            const exp = getRateioReceitasColValue(resultados, col.dataKeys, (r) => r.rec_bru_ncum_exp);
                            const perc = total > 0 ? (trib + naoTrib + exp) / total : 0;
                            return (
                              <TableCell key={col.id} className="text-right font-mono font-bold">
                                {(perc * 100).toFixed(2)}%
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-mono font-bold bg-muted/30" />
                        </TableRow>

                        <TableRow className="bg-transparent border-none hover:bg-transparent">
                          <TableCell colSpan={headerBottom.length + 2} className="p-2" />
                        </TableRow>
                        {[
                          {
                            label: "PIS - 101 (Créditos Vinculados a Receita Tributada M.I.)",
                            field: "pis101" as const,
                          },
                          {
                            label: "PIS - 201 (Créditos Vinculados a Receita Não Tributada M.I.)",
                            field: "pis201" as const,
                          },
                          {
                            label: "PIS - 301 (Créditos Vinculados a Receita de Exportação)",
                            field: "pis301" as const,
                          },
                        ].map((row) => (
                          <TableRow key={row.field} className="bg-muted/50 text-xs">
                            <StickyCellMuted config={RATEIO_STICKY[0]} className="font-bold">
                              {row.label}
                            </StickyCellMuted>
                            {headerBottom.map((col) => (
                              <TableCell key={col.id} className="text-right font-mono">
                                {formatCurrency(getRateioColValue(resultados, col.dataKeys, (r) => r[row.field]))}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-mono font-bold bg-muted/30">
                              {formatCurrency(resultados.reduce((sum, r) => sum + (r.rateio?.[row.field] || 0), 0))}
                            </TableCell>
                          </TableRow>
                        ))}

                        <TableRow className="bg-transparent border-none hover:bg-transparent">
                          <TableCell colSpan={headerBottom.length + 2} className="p-2" />
                        </TableRow>
                        {[
                          {
                            label: "COFINS - 101 (Créditos Vinculados a Receita Tributada M.I.)",
                            field: "cofins101" as const,
                          },
                          {
                            label: "COFINS - 201 (Créditos Vinculados a Receita Não Tributada M.I.)",
                            field: "cofins201" as const,
                          },
                          {
                            label: "COFINS - 301 (Créditos Vinculados a Receita de Exportação)",
                            field: "cofins301" as const,
                          },
                        ].map((row) => (
                          <TableRow key={row.field} className="bg-muted/50 text-xs">
                            <StickyCellMuted config={RATEIO_STICKY[0]} className="font-bold">
                              {row.label}
                            </StickyCellMuted>
                            {headerBottom.map((col) => (
                              <TableCell key={col.id} className="text-right font-mono">
                                {formatCurrency(getRateioColValue(resultados, col.dataKeys, (r) => r[row.field]))}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-mono font-bold bg-muted/30">
                              {formatCurrency(resultados.reduce((sum, r) => sum + (r.rateio?.[row.field] || 0), 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </InlineTableWrapper>
                  </section>
                </div>
              )}

              {/* Tab: Apuração (placeholder) */}
              {activeTab === "apuracao" && (
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
