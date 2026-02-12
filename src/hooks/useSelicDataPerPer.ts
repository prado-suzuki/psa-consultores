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
 * Hook que busca taxa Selic em lote para todos os PERs elegíveis (fora da carência).
 * Faz UMA única chamada de API cobrindo o período mais antigo até hoje,
 * depois calcula o fator por subtração para cada PER.
 *
 * Fator = vlr_acumulado_dec(mês_carência) - vlr_acumulado_dec(mês_atual)
 */
export function useSelicDataPerPer(pers: PerInput[]) {
  const { fetchWithAuth } = useApiAuth();

  const eligiblePers = pers.filter(
    (p) => p.dt_solicitada && !isWithinGracePeriod(p.dt_solicitada)
  );

  const cacheKey = eligiblePers
    .map((p) => p.numero_processo_per)
    .sort()
    .join(',');

  return useQuery<Record<string, SelicTaxa>>({
    queryKey: ['selic-per-batch', cacheKey],
    queryFn: async () => {
      const map: Record<string, SelicTaxa> = {};
      if (eligiblePers.length === 0) return map;

      // 1. Encontrar a dt_solicitada mais antiga entre os PERs em aberto
      const hoje = format(new Date(), 'yyyy-MM-dd');
      let oldestDtSolicitada = hoje;
      const perEndDates: Record<string, string> = {};

      for (const per of eligiblePers) {
        const endDate = getSelicEndDate(per.dt_solicitada);
        perEndDates[per.numero_processo_per] = endDate;
        if (per.dt_solicitada < oldestDtSolicitada) {
          oldestDtSolicitada = per.dt_solicitada;
        }
      }

      // 2. Uma única chamada: data_inicio = dt_solicitada mais antiga, data_fim = hoje
      const url = getApiUrl(`/api/v1/selic?data_inicio=${oldestDtSolicitada}&data_fim=${hoje}`);
      console.log(`[Selic] 1 chamada cobrindo ${oldestDtSolicitada} ate ${hoje} (${eligiblePers.length} PERs)`);

      const response = await fetchWithAuth(url);
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[Selic] Erro ${response.status}: ${errorText}`);
        return map;
      }

      const data = await response.json();
      const taxas: SelicTaxa[] = data.taxas || [];
      if (taxas.length === 0) {
        console.warn('[Selic] Nenhuma taxa retornada pela API');
        return map;
      }

      // Indexar taxas por YYYY-MM para lookup rápido
      const taxasByMonth: Record<string, SelicTaxa> = {};
      for (const t of taxas) {
        const month = t.data_atualizacao.substring(0, 7); // YYYY-MM (competência tributária)
        taxasByMonth[month] = t;
      }

      // Último registro = mês vigente (sempre ~1%)
      const lastTaxa = taxas[taxas.length - 1];

      // 3. Para cada PER, calcular fator por subtração
      for (const per of eligiblePers) {
        const endDate = perEndDates[per.numero_processo_per];
        const endMonth = endDate.substring(0, 7); // YYYY-MM
        const firstTaxa = taxasByMonth[endMonth];

        if (!firstTaxa) {
          console.warn(`[Selic] ${per.numero_processo_per}: sem registro para mês ${endMonth}, ignorado`);
          continue;
        }

        const fator = firstTaxa.vlr_acumulado_dec - lastTaxa.vlr_acumulado_dec;
        console.log(
          `[Selic] ${per.numero_processo_per}: ${firstTaxa.vlr_acumulado_dec.toFixed(4)} - ${lastTaxa.vlr_acumulado_dec.toFixed(4)} = ${fator.toFixed(4)} (${(fator * 100).toFixed(2)}%)`
        );

        map[per.numero_processo_per] = {
          ...firstTaxa,
          vlr_acumulado_dec: fator,
        };
      }

      console.log(`[Selic] Resultado: ${Object.keys(map).length}/${eligiblePers.length} PERs com taxa`);
      return map;
    },
    enabled: eligiblePers.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });
}
