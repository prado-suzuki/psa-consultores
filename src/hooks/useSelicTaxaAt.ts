import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { getSelicEndDate, isWithinGracePeriodAt } from '@/lib/selicCalculator';
import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Busca a taxa SELIC acumulada vigente em uma data de referência específica.
 * Diferente de useSelicDataPerPer (que mira o dia atual), este aceita data arbitrária —
 * usado quando precisamos do fator vigente na dt_envio de uma DCOMP ou dt_pagamento de um ressarcimento.
 *
 * A linha buscada é a do mês do fim da carência (dt_solicitada + 360 dias). O `vlr_acumulado_dec`
 * dessa linha representa a SELIC acumulada do fim da carência até o mês anterior à `dtReferencia`;
 * somando-se o +1% do mês corrente em `applySelicCorrection`, obtém-se o fator total.
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

      const endMonth = getSelicEndDate(dtSolicitada).substring(0, 7);
      const found = taxas.find(
        (t) => t.data_atualizacao.substring(0, 7) === endMonth,
      );
      if (found) return found;
      // Edge: dtReferencia no mesmo mês do fim da carência — sem acumulado anterior,
      // apenas +1% do mês corrente (somado em applySelicCorrection).
      return {
        data: '',
        valor: 0,
        valor_decimal: 0,
        valor_acumulado: 0,
        vlr_acumulado_dec: 0,
        data_atualizacao: `${endMonth}-01`,
      };
    },
    enabled: !!dtSolicitada && !!dtReferencia && !emCarencia,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });
}
