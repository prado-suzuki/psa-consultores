import { useCallback, useEffect, useMemo, useState } from "react";
import { monthYearToDateString } from "@/components/ui/month-year-picker.utils";
import { useDomainApuracaoPisCofins } from "@/hooks/useDomainApuracaoPisCofins";
import { usePisCofinsApuracao } from "@/hooks/usePisCofinsApuracao";
import { usePisCofinsCalculator } from "@/hooks/usePisCofinsCalculator";
import { usePisCofinsImportStatus } from "@/hooks/usePisCofinsImportStatus";
import { useTableHeaders } from "@/hooks/useTableHeaders";
import { toast } from "@/hooks/use-toast";
import {
  buildColumnTooltips,
  buildContaOptions,
  buildTreeContaOptions,
  filterContaTree,
  getImportEmptyMessage,
} from "@/lib/pisCofinsPresentation";

export type PisCofinsTab = "resumo" | "debitos" | "creditos" | "apuracao" | "rateio";
export type TipoApuracao = "EFD" | "BALANCETE";
export type MonthYear = { month: number; year: number };

export function useApuracaoPisCofinsController() {
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedContribuinte, setSelectedContribuinte] = useState("");
  const [mesInicio, setMesInicio] = useState<MonthYear | null>(null);
  const [mesFim, setMesFim] = useState<MonthYear | null>(null);
  const [committedMesInicio, setCommittedMesInicio] = useState<MonthYear | null>(null);
  const [committedMesFim, setCommittedMesFim] = useState<MonthYear | null>(null);
  const [committedContribuinte, setCommittedContribuinte] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [activeTab, setActiveTab] = useState<PisCofinsTab>("resumo");
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [tipoApuracao, setTipoApuracao] = useState<TipoApuracao>("EFD");
  const [periodoFechado, setPeriodoFechado] = useState(false);
  const [selectedContas, setSelectedContas] = useState<string[]>([]);
  const [extraContas, setExtraContas] = useState<Map<string, { tipo: "D" | "C"; desc: string }>>(new Map());

  const { clientesQuery, contribuintesQuery } = useDomainApuracaoPisCofins(selectedCliente);
  const { data: contribuintes } = contribuintesQuery;
  useEffect(() => {
    if (selectedCliente && contribuintes?.length === 1 && !selectedContribuinte) setSelectedContribuinte(contribuintes[0].id);
  }, [selectedCliente, contribuintes, selectedContribuinte]);
  useEffect(() => { setSelectedContribuinte(""); setSearchTriggered(false); }, [selectedCliente]);

  const committedDataInicio = monthYearToDateString(committedMesInicio, "start");
  const committedDataFim = monthYearToDateString(committedMesFim, "end");
  const query = usePisCofinsApuracao({
    idContribuinte: committedContribuinte,
    dtIni: committedDataInicio,
    dtFim: committedDataFim,
    enabled: searchTriggered && !!committedContribuinte,
  });
  const calculation = usePisCofinsCalculator({
    data: query.data ?? null,
    tipoApuracao,
    periodoFechado,
    extraContas: tipoApuracao === "BALANCETE" ? extraContas : undefined,
  });
  const headers = useTableHeaders({ columnsData: calculation.columnsData, expandedYears });
  const hasData = calculation.resultados.length > 0;
  const shouldCheckImports = searchTriggered && !!committedContribuinte && !query.isLoading && !query.error && !hasData;
  const imports = usePisCofinsImportStatus({
    idContribuinte: committedContribuinte,
    dtIni: committedDataInicio,
    dtFim: committedDataFim,
    enabled: shouldCheckImports,
  });

  const toggleYear = useCallback((year: string) => setExpandedYears((current) => {
    const next = new Set(current);
    if (next.has(year)) next.delete(year); else next.add(year);
    return next;
  }), []);
  const handleSearch = () => {
    if (!selectedContribuinte) return void toast({ title: "Selecione um contribuinte", variant: "destructive" });
    if ((mesInicio && !mesFim) || (!mesInicio && mesFim)) return void toast({ title: "Informe ambas as datas ou nenhuma", variant: "destructive" });
    if (mesInicio && mesFim && mesFim.year * 12 + mesFim.month < mesInicio.year * 12 + mesInicio.month) {
      return void toast({ title: "Data final deve ser ≥ data inicial", variant: "destructive" });
    }
    setCommittedContribuinte(selectedContribuinte);
    setCommittedMesInicio(mesInicio);
    setCommittedMesFim(mesFim);
    setSearchTriggered(true);
  };
  const handleClear = () => {
    setSelectedCliente(""); setSelectedContribuinte(""); setMesInicio(null); setMesFim(null);
    setCommittedContribuinte(""); setCommittedMesInicio(null); setCommittedMesFim(null); setSearchTriggered(false);
    setExpandedYears(new Set()); setSelectedContas([]); setExtraContas(new Map());
  };
  const handleToggleExtra = useCallback((codCta: string, desc: string, tipo: "D" | "C") => {
    setExtraContas((current) => new Map(current).set(codCta, { tipo, desc }));
  }, []);
  const handleRemoveExtra = useCallback((codCta: string) => setExtraContas((current) => {
    const next = new Map(current); next.delete(codCta); return next;
  }), []);

  const contaOptions = useMemo(() => buildContaOptions(calculation.tables.resumoData), [calculation.tables.resumoData]);
  const contaOptionsBalancete = useMemo(() => buildTreeContaOptions(calculation.contasTree), [calculation.contasTree]);
  const filteredResumoData = useMemo(() => selectedContas.length
    ? calculation.tables.resumoData.filter((row) => selectedContas.includes(row.cod_cta))
    : calculation.tables.resumoData, [calculation.tables.resumoData, selectedContas]);
  const filteredContasTree = useMemo(() => filterContaTree(calculation.contasTree, selectedContas), [calculation.contasTree, selectedContas]);
  const columnTooltips = useMemo(() => buildColumnTooltips(calculation.columnsData.yearsMap), [calculation.columnsData.yearsMap]);
  const emptyStateMessage = shouldCheckImports && imports.ready
    ? getImportEmptyMessage(imports.hasEfd, imports.hasBalancete)
    : "Nenhum dado encontrado para os filtros selecionados.";

  return {
    selectedCliente, setSelectedCliente, selectedContribuinte, setSelectedContribuinte, mesInicio, setMesInicio,
    mesFim, setMesFim, searchTriggered, setSearchTriggered, activeTab, setActiveTab, expandedYears, tipoApuracao,
    setTipoApuracao, periodoFechado, setPeriodoFechado, selectedContas, setSelectedContas, extraContas,
    clientesQuery, contribuintesQuery, query, calculation, headers, imports, hasData, shouldCheckImports,
    toggleYear, handleSearch, handleClear, handleToggleExtra, handleRemoveExtra, contaOptions, contaOptionsBalancete,
    filteredResumoData, filteredContasTree, columnTooltips, emptyStateMessage,
  };
}

export type ApuracaoPisCofinsController = ReturnType<typeof useApuracaoPisCofinsController>;
