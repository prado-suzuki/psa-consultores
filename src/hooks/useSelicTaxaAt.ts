import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import {
  computeSelicFator,
  getStartAccumulationMonth,
  isWithinGracePeriodAt,
  prevMonth,
} from '@/lib/selicCalculator';
import type { SelicTaxa } from '@/hooks/useSelicData';

export interface SelicFatorResult {
  fator: number;
  acumulado: number;
  mesesContabilizados: string[];
}

/**
 * Calcula o fator SELIC vigente entre dt_solicitada e dt_referência seguindo a
 * regra RFB: carência de 1 ano sem SELIC, depois soma das taxas mensais dos
 * meses CHEIOS após o fim da carência até o mês anterior à referência, mais
 * 1% fixo do mês de referência.
 *
 * - Em carência (referência <= fim-carência) → fator = 0.
 * - Logo após o fim da carência (sem nenhum mês cheio completo) → fator = 1%
 *   (apenas a parcela fixa do mês corrente).
 *
 * Sem fallback: se a API SELIC retornar erro ou faltar a linha de algum mês
 * necessário para o cálculo, o erro é propagado pelo React Query.
 */
export function useSelicTaxaAt(
  dtSolicitada: string | null | undefined,
  dtReferencia: string | null | undefined,
) {
  const { fetchWithAuth } = useApiAuth();

  const emCarencia =
    !!dtSolicitada && !!dtReferencia && isWithinGracePeriodAt(dtSolicitada, dtReferencia);

  return useQuery<SelicFatorResult>({
    queryKey: ['selic-fator-at', dtSolicitada, dtReferencia],
    queryFn: async () => {
      if (!dtSolicitada || !dtReferencia) {
        throw new Error('dtSolicitada e dtReferencia são obrigatórios');
      }

      // Faixa de meses cheios a contabilizar.
      const startAccMonth = getStartAccumulationMonth(dtSolicitada);
      const refMonth = dtReferencia.substring(0, 7);
      const endAccMonth = prevMonth(refMonth);

      // Se não há meses cheios para contabilizar, fator = 1% (mês corrente).
      if (startAccMonth > endAccMonth) {
        return { fator: 0.01, acumulado: 0, mesesContabilizados: [] };
      }

      // A linha da API que tem o valor mensal aplicado ao mês X é a
      // data_atualizacao = (X-1). Logo, intervalo de data_atualizacao a buscar:
      const apiStartMonth = prevMonth(startAccMonth);

      // A API filtra data_atualizacao >= data_inicio (dia exato), por isso
      // enviamos sempre o 1º dia do mês inicial.
      const url = getApiUrl(
        `/api/v1/selic?data_inicio=${apiStartMonth}-01&data_fim=${dtReferencia}`,
      );
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`API SELIC retornou ${response.status}`);
      }

      const data = await response.json();
      const taxas: SelicTaxa[] = data.taxas || [];

      const ratesByMonth: Record<string, number> = {};
      for (const t of taxas) {
        ratesByMonth[t.data_atualizacao.substring(0, 7)] = t.valor_decimal;
      }

      return computeSelicFator(dtSolicitada, dtReferencia, ratesByMonth);
    },
    enabled: !!dtSolicitada && !!dtReferencia && !emCarencia,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    retry: false,
  });
}
