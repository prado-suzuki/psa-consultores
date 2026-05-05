import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseNotasSaidaCsv } from "@/lib/ibs-cbs/csv";
import {
  aplicaFiltros,
  composicaoAntes,
  listaAnexos,
  listaUfs,
  porAnexo,
  porMes,
  porProduto,
  quebraNatureza,
  rangeMeses,
  totais,
} from "@/lib/ibs-cbs/calc";
import type { ApuracaoFiltros, NotaSaida } from "@/lib/ibs-cbs/types";

const MOCK_URL = "/mocks/ibs_cbs_saidas.csv";

async function fetchNotas(): Promise<NotaSaida[]> {
  const res = await fetch(MOCK_URL);
  if (!res.ok) throw new Error(`Falha ao carregar mock IBS/CBS (${res.status})`);
  const text = await res.text();
  return parseNotasSaidaCsv(text);
}

export function useApuracaoIbsCbs(filtros: ApuracaoFiltros) {
  const query = useQuery({
    queryKey: ["ibs-cbs-saidas-mock"],
    queryFn: fetchNotas,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const all = useMemo(() => query.data ?? [], [query.data]);

  const filtradas = useMemo(() => aplicaFiltros(all, filtros), [all, filtros]);
  const aggTotais = useMemo(() => totais(filtradas), [filtradas]);
  const aggComposicaoAntes = useMemo(() => composicaoAntes(filtradas), [filtradas]);
  const aggPorMes = useMemo(() => porMes(filtradas), [filtradas]);
  const aggPorAnexo = useMemo(() => porAnexo(filtradas), [filtradas]);
  const aggPorProduto = useMemo(() => porProduto(filtradas), [filtradas]);
  const aggQuebra = useMemo(() => quebraNatureza(filtradas), [filtradas]);

  const ufsDisponiveis = useMemo(() => listaUfs(all), [all]);
  const anexosDisponiveis = useMemo(() => listaAnexos(all), [all]);
  const periodo = useMemo(() => rangeMeses(all), [all]);

  return {
    isLoading: query.isLoading,
    error: query.error,
    notas: filtradas,
    notasTotal: all.length,
    totais: aggTotais,
    composicaoAntes: aggComposicaoAntes,
    porMes: aggPorMes,
    porAnexo: aggPorAnexo,
    porProduto: aggPorProduto,
    quebra: aggQuebra,
    ufsDisponiveis,
    anexosDisponiveis,
    periodo,
  };
}
