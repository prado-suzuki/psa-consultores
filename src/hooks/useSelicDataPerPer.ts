import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { isWithinGracePeriod, getSelicEndDate } from '@/lib/selicCalculator';
import { format } from 'date-fns';
import type { SelicTaxa } from '@/hooks/useSelicData';

interface PerInput {
  numero_processo_per: string;
  dt_solicitada: string;
}

/**
 * Hook que busca taxa Selic individual para cada PER elegível (fora da carência).
 * Retorna um mapa: numero_processo_per → SelicTaxa (última taxa do range específico).
 */
export function useSelicDataPerPer(pers: PerInput[]) {
  const { fetchWithAuth } = useApiAuth();

  const eligiblePers = pers.filter(
    (p) => p.dt_solicitada && !isWithinGracePeriod(p.dt_solicitada)
  );

  // Chave estável baseada nos PERs elegíveis
  const cacheKey = eligiblePers
    .map((p) => p.numero_processo_per)
    .sort()
    .join(',');

  return useQuery<Record<string, SelicTaxa>>({
    queryKey: ['selic-per-individual', cacheKey],
    queryFn: async () => {
      const map: Record<string, SelicTaxa> = {};
      const hoje = format(new Date(), 'yyyy-MM-dd');

      // Busca em paralelo para melhor performance
      const results = await Promise.allSettled(
        eligiblePers.map(async (per) => {
          const dataFim = getSelicEndDate(per.dt_solicitada);
          const url = getApiUrl(
            `/api/v1/selic?data_inicio=${hoje}&data_fim=${dataFim}`
          );
          const response = await fetchWithAuth(url);

          if (response.ok) {
            const data = await response.json();
            const taxas: SelicTaxa[] = data.taxas || [];
            if (taxas.length > 0) {
              return {
                key: per.numero_processo_per,
                taxa: taxas[taxas.length - 1],
              };
            }
          }
          return null;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          map[result.value.key] = result.value.taxa;
        }
      }

      return map;
    },
    enabled: eligiblePers.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });
}
