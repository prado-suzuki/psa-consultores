import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { BalanceteEfdResponse } from '@/types/auditoriaCruzada';

interface UseBalanceteEfdParams {
  id_contribuinte: string;
  dt_ini: string;
  dt_fim: string;
}

export function useBalanceteEfd(params: UseBalanceteEfdParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<BalanceteEfdResponse>({
    queryKey: ['balancete-efd', params.id_contribuinte, params.dt_ini, params.dt_fim],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
      });
      if (params.dt_ini && params.dt_fim) {
        searchParams.append('dt_ini', params.dt_ini);
        searchParams.append('dt_fim', params.dt_fim);
      }
      const url = getApiUrl(`/api/v1/pis_cofins/comparacoes/efdc_balancete?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar auditoria: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });
}
