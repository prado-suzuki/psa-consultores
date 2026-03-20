import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { PisCofinsApuracaoResponse } from '@/types/pisCofins';

interface UsePisCofinsApuracaoParams {
  cnpj: string;
  dataInicio: string;
  dataFim: string;
  enabled?: boolean;
}

export function usePisCofinsApuracao({ cnpj, dataInicio, dataFim, enabled = false }: UsePisCofinsApuracaoParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery({
    queryKey: ['pis-cofins-apuracao', cnpj, dataInicio, dataFim],
    queryFn: async (): Promise<PisCofinsApuracaoResponse> => {
      if (!cnpj) throw new Error('CNPJ é obrigatório');

      const url = new URL(getApiUrl(`/api/v1/pis_cofins/apuracao`));
      url.searchParams.set('cnpj', cnpj);
      if (dataInicio) url.searchParams.set('data_inicio', dataInicio);
      if (dataFim) url.searchParams.set('data_fim', dataFim);

      const res = await fetchWithAuth(url.toString());
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Erro ${res.status}`);
      }
      return res.json();
    },
    enabled: enabled && !!cnpj,
  });
}
