import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { isWithinGracePeriod } from '@/lib/selicCalculator';
import { format } from 'date-fns';
import type { SelicTaxa } from '@/hooks/useSelicData';

interface PerInput {
  nr_per: string;
  dt_solicitada: string;
}

/**
 * Hook que busca taxa SELIC em lote para todos os PERs elegíveis (fora da carência).
 * Faz UMA chamada de API cobrindo (dt_solicitada mais antiga → hoje) e, para cada
 * PER, lê a linha cujo `data_atualizacao = mês(per.dt_solicitada)`.
 *
 * `vlr_acumulado_dec` é global por linha (acumulado desse mês até o último mês
 * cadastrado), independente de data_inicio/data_fim.
 *
 * Sem fallback silencioso: erro da API ou ausência da linha do mês de início
 * de qualquer PER → throw, propagado como `error` pelo React Query.
 */
export function useSelicDataPerPer(pers: PerInput[]) {
  const { fetchWithAuth } = useApiAuth();

  const eligiblePers = pers.filter(
    (p) => p.dt_solicitada && !isWithinGracePeriod(p.dt_solicitada)
  );

  const cacheKey = eligiblePers
    .map((p) => p.nr_per)
    .sort()
    .join(',');

  return useQuery<Record<string, SelicTaxa>>({
    queryKey: ['selic-per-batch', cacheKey],
    queryFn: async () => {
      const map: Record<string, SelicTaxa> = {};
      if (eligiblePers.length === 0) return map;

      const hoje = format(new Date(), 'yyyy-MM-dd');
      let oldestDtSolicitada = hoje;
      for (const per of eligiblePers) {
        if (per.dt_solicitada < oldestDtSolicitada) {
          oldestDtSolicitada = per.dt_solicitada;
        }
      }

      // API filtra por data_atualizacao >= data_inicio (dia exato); normaliza
      // para o 1º dia do mês para garantir que a linha do mês da dt_solicitada
      // mais antiga seja retornada.
      const dataInicioApi = `${oldestDtSolicitada.substring(0, 7)}-01`;
      const url = getApiUrl(`/api/v1/selic?data_inicio=${dataInicioApi}&data_fim=${hoje}`);
      console.log(`[Selic] 1 chamada cobrindo ${dataInicioApi} ate ${hoje} (${eligiblePers.length} PERs)`);

      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`API SELIC retornou ${response.status}`);
      }

      const data = await response.json();
      const taxas: SelicTaxa[] = data.taxas || [];
      if (taxas.length === 0) {
        throw new Error(
          `API SELIC sem dados para ${oldestDtSolicitada} → ${hoje}`,
        );
      }

      const taxasByMonth: Record<string, SelicTaxa> = {};
      for (const t of taxas) {
        const month = t.data_atualizacao.substring(0, 7);
        taxasByMonth[month] = t;
      }

      const ausentes: string[] = [];
      for (const per of eligiblePers) {
        const startMonth = per.dt_solicitada.substring(0, 7);
        const taxa = taxasByMonth[startMonth];
        if (!taxa) {
          ausentes.push(`${per.nr_per}@${startMonth}`);
          continue;
        }
        map[per.nr_per] = taxa;
      }

      if (ausentes.length > 0) {
        throw new Error(
          `API SELIC sem linhas para ${ausentes.length} PER(s): ${ausentes.join(', ')}. ` +
          `Ambiente provavelmente defasado.`,
        );
      }

      console.log(`[Selic] Resultado: ${Object.keys(map).length}/${eligiblePers.length} PERs com taxa`);
      return map;
    },
    enabled: eligiblePers.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    retry: false,
  });
}
