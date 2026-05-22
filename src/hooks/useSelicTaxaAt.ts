import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { isWithinGracePeriodAt } from '@/lib/selicCalculator';
import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Busca a taxa SELIC vigente para um PER em uma data de referência específica.
 *
 * Contrato da API `/api/v1/selic`: cada linha tem `data_atualizacao` (mês de
 * competência) e `vlr_acumulado_dec`, que é a SELIC acumulada do mês daquela
 * linha em diante até o último mês cadastrado no banco (valor global —
 * independente de data_inicio/data_fim).
 *
 * Para a correção de um PER, a linha correta é aquela cujo
 * `data_atualizacao = mês(dt_solicitada)`. O +1% fixo do mês de referência
 * é somado em `applySelicCorrection`.
 *
 * Sem fallback silencioso: erro da API, taxas vazias ou ausência da linha
 * do mês de início → throw, propagado como `error` pelo React Query.
 */
export function useSelicTaxaAt(
  dtSolicitada: string | null | undefined,
  dtReferencia: string | null | undefined,
) {
  const { fetchWithAuth } = useApiAuth();

  const emCarencia =
    !!dtSolicitada && !!dtReferencia && isWithinGracePeriodAt(dtSolicitada, dtReferencia);

  return useQuery<SelicTaxa>({
    queryKey: ['selic-taxa-at', dtSolicitada, dtReferencia],
    queryFn: async () => {
      if (!dtSolicitada || !dtReferencia) {
        throw new Error('dtSolicitada e dtReferencia são obrigatórios');
      }

      // API filtra por data_atualizacao >= data_inicio (dia exato), e queremos
      // a linha do mês da dt_solicitada (data_atualizacao = YYYY-MM-01) — normaliza
      // data_inicio para o 1º dia do mês.
      const dataInicioApi = `${dtSolicitada.substring(0, 7)}-01`;
      const url = getApiUrl(
        `/api/v1/selic?data_inicio=${dataInicioApi}&data_fim=${dtReferencia}`,
      );
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`API SELIC retornou ${response.status}`);
      }

      const data = await response.json();
      const taxas: SelicTaxa[] = data.taxas || [];
      if (taxas.length === 0) {
        throw new Error(
          `API SELIC sem dados para ${dtSolicitada} → ${dtReferencia}`,
        );
      }

      const startMonth = dtSolicitada.substring(0, 7);
      const found = taxas.find(
        (t) => t.data_atualizacao.substring(0, 7) === startMonth,
      );
      if (!found) {
        throw new Error(
          `API SELIC sem linha para data_atualizacao=${startMonth} ` +
          `(dt_solicitada=${dtSolicitada}). Ambiente provavelmente defasado.`,
        );
      }
      return found;
    },
    enabled: !!dtSolicitada && !!dtReferencia && !emCarencia,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    retry: false,
  });
}
