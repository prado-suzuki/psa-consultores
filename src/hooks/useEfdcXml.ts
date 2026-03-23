import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { EfdcXmlLote } from '@/types/efdcXml';

interface UseEfdcXmlParams {
  id_contribuinte: string;
  dt_ini: string;
  dt_fim: string;
}

export function useEfdcXml(params: UseEfdcXmlParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<EfdcXmlLote[]>({
    queryKey: ['efdc-xml', params.id_contribuinte, params.dt_ini, params.dt_fim],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
      });
      if (params.dt_ini && params.dt_fim) {
        searchParams.append('dt_ini', params.dt_ini);
        searchParams.append('dt_fim', params.dt_fim);
      }
      const url = getApiUrl(`/api/v1/pis_cofins/comparacoes/cte_lote?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar CT-e Lotes: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });
}
