import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { CorrecoesSpedResponse } from '@/types/correcoesSped';

interface UseCorrecoesSpedParams {
  id_contribuinte: string;
  dt_ini: string;
  dt_fin: string;
}

export function useCorrecoesSped(params: UseCorrecoesSpedParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<CorrecoesSpedResponse>({
    queryKey: ['correcoes-sped', params.id_contribuinte, params.dt_ini, params.dt_fin],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
        dt_ini: params.dt_ini,
        dt_fin: params.dt_fin,
      });
      const url = getApiUrl(`/api/v1/pis_cofins/revisao/notas-itens?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar correções SPED: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });
}
