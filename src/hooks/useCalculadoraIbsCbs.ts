import { useQuery } from "@tanstack/react-query";
import { useApiAuth } from "@/hooks/useApiAuth";
import { getApiUrl } from "@/config/api";
import type {
  ApuracaoFiltros,
  CalculadoraFiltrosResponse,
  CalculadoraPorAnexoResponse,
  CalculadoraPorProdutoResponse,
  CalculadoraPorUfResponse,
  CalculadoraResumoResponse,
} from "@/lib/ibs-cbs/types";

const STALE = 30_000;

function buildFiltrosParams(idContribuinte: string, filtros: ApuracaoFiltros): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("id_contribuinte", idContribuinte);
  if (filtros.inicio) sp.set("inicio", filtros.inicio);
  if (filtros.fim) sp.set("fim", filtros.fim);
  if (filtros.ufs.length > 0) sp.set("ufs", filtros.ufs.join(","));
  if (filtros.anexos.length > 0) sp.set("anexos", filtros.anexos.join(","));
  return sp;
}

async function parseError(response: Response, base: string): Promise<Error> {
  const body = await response.text();
  let detail = body;
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.detail?.error_message ?? parsed?.detail ?? parsed?.message ?? body;
    if (typeof detail !== "string") detail = JSON.stringify(detail);
  } catch {
    // mantém corpo bruto se não for JSON
  }
  const err = new Error(`${base} ${response.status} - ${detail}`);
  (err as Error & { status?: number }).status = response.status;
  return err;
}

export function useCalculadoraFiltros(idContribuinte: string) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<CalculadoraFiltrosResponse>({
    queryKey: ["calc-ibs-cbs", "filtros", idContribuinte],
    queryFn: async () => {
      const sp = new URLSearchParams({ id_contribuinte: idContribuinte });
      const url = getApiUrl(`/api/v1/calculadora_ibs_cbs/filtros?${sp.toString()}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) throw await parseError(response, "Filtros");
      return response.json();
    },
    enabled: !!idContribuinte,
    staleTime: STALE,
  });
}

export function useCalculadoraResumo(idContribuinte: string, filtros: ApuracaoFiltros) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<CalculadoraResumoResponse>({
    queryKey: ["calc-ibs-cbs", "resumo", idContribuinte, filtros],
    queryFn: async () => {
      const sp = buildFiltrosParams(idContribuinte, filtros);
      const url = getApiUrl(`/api/v1/calculadora_ibs_cbs/resumo?${sp.toString()}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) throw await parseError(response, "Resumo");
      return response.json();
    },
    enabled: !!idContribuinte,
    staleTime: STALE,
  });
}

export function useCalculadoraPorAnexo(idContribuinte: string, filtros: ApuracaoFiltros) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<CalculadoraPorAnexoResponse>({
    queryKey: ["calc-ibs-cbs", "por_anexo", idContribuinte, filtros],
    queryFn: async () => {
      const sp = buildFiltrosParams(idContribuinte, filtros);
      const url = getApiUrl(`/api/v1/calculadora_ibs_cbs/por_anexo?${sp.toString()}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) throw await parseError(response, "Por anexo");
      return response.json();
    },
    enabled: !!idContribuinte,
    staleTime: STALE,
  });
}

export function useCalculadoraPorProduto(idContribuinte: string, filtros: ApuracaoFiltros) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<CalculadoraPorProdutoResponse>({
    queryKey: ["calc-ibs-cbs", "por_produto", idContribuinte, filtros],
    queryFn: async () => {
      const sp = buildFiltrosParams(idContribuinte, filtros);
      const url = getApiUrl(`/api/v1/calculadora_ibs_cbs/por_produto?${sp.toString()}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) throw await parseError(response, "Por produto");
      return response.json();
    },
    enabled: !!idContribuinte,
    staleTime: STALE,
  });
}

export function useCalculadoraPorUf(idContribuinte: string, filtros: ApuracaoFiltros) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<CalculadoraPorUfResponse>({
    queryKey: ["calc-ibs-cbs", "por_uf", idContribuinte, filtros],
    queryFn: async () => {
      const sp = buildFiltrosParams(idContribuinte, filtros);
      const url = getApiUrl(`/api/v1/calculadora_ibs_cbs/por_uf?${sp.toString()}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) throw await parseError(response, "Por UF");
      return response.json();
    },
    enabled: !!idContribuinte,
    staleTime: STALE,
  });
}
