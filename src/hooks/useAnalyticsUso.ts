/**
 * Camada de dados do dashboard "Controle de uso e envio".
 * Componentes conhecem apenas estes hooks. As únicas consultas remotas são
 * API e arquivos; catálogo e visão gerencial são derivados dos seus agregados.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useApiAuth } from '@/hooks/useApiAuth';
import { fetchArquivos, fetchUsoApi, USANDO_FIXTURES } from '@/lib/analytics-uso/client';
import {
  montarCatalogoAnalytics,
  montarGerencialAnalytics,
} from '@/lib/analytics-uso/composicao';
import type {
  AnalyticsArquivosResponse,
  AnalyticsGerencialResponse,
  AnalyticsUsoApiResponse,
  AnalyticsUsoCatalogo,
  AnalyticsUsoFiltros,
} from '@/lib/analytics-uso/types';
import { analyticsUsoKeys } from '@/lib/analytics-uso/queryKeys';
import { resolverIntervaloPeriodo } from '@/lib/analytics-uso/periodo';

const STALE_DADOS = 60_000;
const GC_DADOS = 3 * 60_000;

const intervaloCatalogo = resolverIntervaloPeriodo('tudo');
const FILTROS_CATALOGO: AnalyticsUsoFiltros = {
  inicio: intervaloCatalogo.inicio,
  fim: intervaloCatalogo.fim,
};

interface AnalyticsQueryOptions {
  /** Evita abrir a consulta antes de uma aba ou filtro dependente estar pronto. */
  enabled?: boolean;
}

function deveRetentar(failureCount: number, error: Error): boolean {
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return false;
  const status = (error as Error & { status?: number }).status;
  if (status === 429) return failureCount < 1;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

function atrasoRetry(attempt: number, error: Error): number {
  const retryAfterMs = (error as Error & { retryAfterMs?: number }).retryAfterMs;
  if (retryAfterMs) return retryAfterMs;
  return Math.min(1_000 * 2 ** attempt, 4_000) + Math.round(Math.random() * 250);
}

export function useAnalyticsUsoApi(
  filtros: AnalyticsUsoFiltros,
  options: AnalyticsQueryOptions = {},
) {
  const { user } = useAuth();
  const { fetchWithAuth } = useApiAuth();
  const principalId = user?.id ?? 'sem-sessao';
  return useQuery<AnalyticsUsoApiResponse>({
    queryKey: analyticsUsoKeys.api(principalId, filtros),
    queryFn: ({ signal }) => fetchUsoApi(fetchWithAuth, filtros, signal),
    enabled: (options.enabled ?? true) && (USANDO_FIXTURES || Boolean(user)),
    staleTime: STALE_DADOS,
    gcTime: GC_DADOS,
    retry: deveRetentar,
    retryDelay: atrasoRetry,
  });
}

export function useAnalyticsArquivos(
  filtros: AnalyticsUsoFiltros,
  options: AnalyticsQueryOptions = {},
) {
  const { user } = useAuth();
  const { fetchWithAuth } = useApiAuth();
  const principalId = user?.id ?? 'sem-sessao';
  return useQuery<AnalyticsArquivosResponse>({
    queryKey: analyticsUsoKeys.arquivos(principalId, filtros),
    queryFn: ({ signal }) => fetchArquivos(fetchWithAuth, filtros, signal),
    enabled: (options.enabled ?? true) && (USANDO_FIXTURES || Boolean(user)),
    staleTime: STALE_DADOS,
    gcTime: GC_DADOS,
    retry: deveRetentar,
    retryDelay: atrasoRetry,
  });
}

interface AnalyticsComposto<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  refetch: () => Promise<unknown>;
}

function atualizadoEmConjunto(primeiro: number, segundo: number): number {
  if (!primeiro || !segundo) return 0;
  return Math.min(primeiro, segundo);
}

/**
 * Preaquece as duas consultas sem recorte e monta as opções da interface.
 * Quando a tela também pede o período completo, o TanStack reutiliza as mesmas
 * query keys e não abre uma chamada duplicada.
 */
export function useAnalyticsCatalogo(
  options: AnalyticsQueryOptions = {},
): AnalyticsComposto<AnalyticsUsoCatalogo> {
  const usoApi = useAnalyticsUsoApi(FILTROS_CATALOGO, options);
  const arquivos = useAnalyticsArquivos(FILTROS_CATALOGO, options);
  const data = useMemo(
    () =>
      usoApi.data && arquivos.data
        ? montarCatalogoAnalytics(usoApi.data, arquivos.data)
        : undefined,
    [arquivos.data, usoApi.data],
  );

  return {
    data,
    error: usoApi.error ?? arquivos.error,
    isLoading: !data && (usoApi.isLoading || arquivos.isLoading),
    isFetching: usoApi.isFetching || arquivos.isFetching,
    dataUpdatedAt: atualizadoEmConjunto(usoApi.dataUpdatedAt, arquivos.dataUpdatedAt),
    refetch: () => Promise.all([usoApi.refetch(), arquivos.refetch()]),
  };
}

export function useAnalyticsGerencial(
  filtros: AnalyticsUsoFiltros,
  options: AnalyticsQueryOptions = {},
): AnalyticsComposto<AnalyticsGerencialResponse> {
  const usoApi = useAnalyticsUsoApi(filtros, options);
  const filtrosArquivos = useMemo<AnalyticsUsoFiltros>(
    () => ({
      inicio: filtros.inicio,
      fim: filtros.fim,
      usuario: filtros.usuario,
      clusterId: filtros.clusterId,
    }),
    [filtros.clusterId, filtros.fim, filtros.inicio, filtros.usuario],
  );
  const arquivos = useAnalyticsArquivos(filtrosArquivos, options);
  const data = useMemo(
    () =>
      usoApi.data && arquivos.data
        ? montarGerencialAnalytics(
            usoApi.data,
            arquivos.data,
            filtros.clusterId,
            filtros.usuario,
            filtros.inicio,
            filtros.fim,
          )
        : undefined,
    [
      arquivos.data,
      filtros.clusterId,
      filtros.fim,
      filtros.inicio,
      filtros.usuario,
      usoApi.data,
    ],
  );

  return {
    data,
    error: usoApi.error ?? arquivos.error,
    isLoading: !data && (usoApi.isLoading || arquivos.isLoading),
    isFetching: usoApi.isFetching || arquivos.isFetching,
    dataUpdatedAt: atualizadoEmConjunto(usoApi.dataUpdatedAt, arquivos.dataUpdatedAt),
    refetch: () => Promise.all([usoApi.refetch(), arquivos.refetch()]),
  };
}

export { USANDO_FIXTURES };
