import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { isWithinGracePeriodAt } from '@/lib/selicCalculator';
import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Busca a taxa SELIC acumulada vigente em uma data de referência específica.
 * Diferente de useSelicDataPerPer (que mira o dia atual), este aceita data arbitrária —
 * usado quando precisamos do fator vigente na dt_envio de uma DCOMP ou dt_pagamento de um ressarcimento.
 */
export function useSelicTaxaAt(
  dtSolicitada: string | null | undefined,
  dtReferencia: string | null | undefined,
) {
  const { fetchWithAuth } = useApiAuth();

  const emCarencia =
    !!dtSolicitada && !!dtReferencia && isWithinGracePeriodAt(dtSolicitada, dtReferencia);

  return useQuery<SelicTaxa | null>({
    queryKey: ['selic-taxa-at', dtSolicitada, dtReferencia],
    queryFn: async () => {
      if (!dtSolicitada || !dtReferencia) return null;

      const url = getApiUrl(
        `/api/v1/selic?data_inicio=${dtSolicitada}&data_fim=${dtReferencia}`,
      );
      const response = await fetchWithAuth(url);
      if (!response.ok) return null;

      const data = await response.json();
      const taxas: SelicTaxa[] = data.taxas || [];
      if (taxas.length === 0) return null;

      const refMonth = dtReferencia.substring(0, 7);
      const found = taxas.find(
        (t) => t.data_atualizacao.substring(0, 7) === refMonth,
      );
      return found || taxas[taxas.length - 1] || null;
    },
    enabled: !!dtSolicitada && !!dtReferencia && !emCarencia,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });
}
