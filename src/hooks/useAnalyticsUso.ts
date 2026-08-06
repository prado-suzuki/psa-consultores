/**
 * Hooks do dashboard "Controle de uso e envio" (migracao do Looker Studio).
 *
 * Mesmo formato dos hooks de API existentes (useCalculadoraIbsCbs): um
 * useQuery por endpoint, `fetchWithAuth` injetado. A diferenca e que o fetch
 * passa por `src/lib/analytics-uso/client.ts`, que hoje devolve fixtures e
 * amanha chama o Cloud Run — sem que estes hooks mudem.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import {
  fetchArquivos,
  fetchFiltros,
  fetchUsoApi,
  USANDO_FIXTURES,
} from '@/lib/analytics-uso/client';
import type {
  AnalyticsArquivosResponse,
  AnalyticsUsoApiResponse,
  AnalyticsUsoFiltros,
  AnalyticsUsoFiltrosResponse,
} from '@/lib/analytics-uso/types';

const STALE = 60_000;

export function useAnalyticsFiltros() {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<AnalyticsUsoFiltrosResponse>({
    queryKey: ['analytics-uso', 'filtros'],
    queryFn: () => fetchFiltros(fetchWithAuth),
    staleTime: STALE,
  });
}

export function useAnalyticsUsoApi(filtros: AnalyticsUsoFiltros) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<AnalyticsUsoApiResponse>({
    queryKey: ['analytics-uso', 'api-consumo', filtros],
    queryFn: () => fetchUsoApi(fetchWithAuth, filtros),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useAnalyticsArquivos(filtros: AnalyticsUsoFiltros) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<AnalyticsArquivosResponse>({
    queryKey: ['analytics-uso', 'arquivos', filtros],
    queryFn: () => fetchArquivos(fetchWithAuth, filtros),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export { USANDO_FIXTURES };
