import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import {
  computeSelicFator,
  getStartAccumulationMonth,
  isWithinGracePeriod,
  prevMonth,
} from '@/lib/selicCalculator';
import { format } from 'date-fns';
import type { SelicTaxa } from '@/hooks/useSelicData';
import type { SelicFatorResult } from '@/hooks/useSelicTaxaAt';

interface PerInput {
  nr_per: string;
  dt_solicitada: string;
}

/**
 * Calcula o fator SELIC para cada PER elegível (fora de carência) em lote,
 * usando hoje como referência. Mesma regra de `useSelicTaxaAt`.
 *
 * Faz UMA chamada de API cobrindo o intervalo necessário e, em memória, soma
 * as taxas mensais para cada PER. Sem fallback: erro de API ou linha ausente
 * para qualquer PER vira `throw`.
 */
export function useSelicDataPerPer(pers: PerInput[]) {
  const { fetchWithAuth } = useApiAuth();

  const eligiblePers = pers.filter(
    (p) => p.dt_solicitada && !isWithinGracePeriod(p.dt_solicitada),
  );

  const cacheKey = eligiblePers
    .map((p) => p.nr_per)
    .sort()
    .join(',');

  return useQuery<Record<string, SelicFatorResult>>({
    queryKey: ['selic-fator-batch', cacheKey],
    queryFn: async () => {
      const map: Record<string, SelicFatorResult> = {};
      if (eligiblePers.length === 0) return map;

      const hoje = format(new Date(), 'yyyy-MM-dd');
      const refMonth = hoje.substring(0, 7);
      const endAccMonth = prevMonth(refMonth);

      // Menor apiStartMonth entre todos os PERs (= mês mais antigo de data_atualizacao
      // necessário para cobrir todos). Se algum PER não tem mês cheio para
      // contabilizar, ele entra no map direto com fator 1%.
      let oldestApiStart: string | null = null;
      const persParaApi: PerInput[] = [];

      for (const per of eligiblePers) {
        const startAccMonth = getStartAccumulationMonth(per.dt_solicitada);
        if (startAccMonth > endAccMonth) {
          // Fora de carência mas sem mês cheio acumulado → só +1% do mês corrente.
          map[per.nr_per] = { fator: 0.01, acumulado: 0, mesesContabilizados: [] };
          continue;
        }
        const apiStartMonth = prevMonth(startAccMonth);
        if (oldestApiStart === null || apiStartMonth < oldestApiStart) {
          oldestApiStart = apiStartMonth;
        }
        persParaApi.push(per);
      }

      if (persParaApi.length === 0) {
        // Todos os PERs caíram no caminho "só +1%".
        return map;
      }

      const url = getApiUrl(
        `/api/v1/selic?data_inicio=${oldestApiStart}-01&data_fim=${hoje}`,
      );
      console.log(
        `[Selic] 1 chamada cobrindo data_atualizacao>=${oldestApiStart} ate ${hoje} ` +
          `(${persParaApi.length} PERs para acumular + ${eligiblePers.length - persParaApi.length} só +1%)`,
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

      for (const per of persParaApi) {
        map[per.nr_per] = computeSelicFator(per.dt_solicitada, hoje, ratesByMonth);
      }

      console.log(`[Selic] Resultado: ${Object.keys(map).length}/${eligiblePers.length} PERs calculados`);
      return map;
    },
    enabled: eligiblePers.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    retry: false,
  });
}
