import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { EfdcIcmsResponse } from '@/types/efdcIcms';

interface UseEfdcIcmsParams {
  id_contribuinte: string;
}

export function useEfdcIcms(params: UseEfdcIcmsParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<EfdcIcmsResponse>({
    queryKey: ['efdc-icms', params.id_contribuinte],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
      });
      const url = getApiUrl(`/api/v1/pis_cofins/comparacoes/efdc_icms?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar EFD ICMS: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });
}
