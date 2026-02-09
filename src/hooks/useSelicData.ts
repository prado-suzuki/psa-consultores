import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';

export interface SelicTaxa {
  data: string;
  valor: number;
  valor_decimal: number;
  valor_acumulado: number;
  vlr_acumulado_dec: number;
  data_atualizacao: string;
}

interface SelicResponse {
  taxas: SelicTaxa[];
}

/**
 * Hook para buscar taxas Selic da API Cloud Run.
 * Retorna as taxas para o período informado.
 * Dados históricos são imutáveis, então usamos staleTime alto.
 */
export function useSelicData(dataInicio: string | null, dataFim: string | null) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<SelicTaxa[]>({
    queryKey: ['selic-taxas', dataInicio, dataFim],
    queryFn: async () => {
      if (!dataInicio || !dataFim) return [];

      const url = getApiUrl(`/api/v1/selic?data_inicio=${dataInicio}&data_fim=${dataFim}`);
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        throw new Error(`Erro ao buscar taxas Selic: ${response.status}`);
      }

      const data: SelicResponse = await response.json();
      return data.taxas || [];
    },
    enabled: !!dataInicio && !!dataFim,
    staleTime: 24 * 60 * 60 * 1000, // 24h - dados históricos são imutáveis
    gcTime: 48 * 60 * 60 * 1000,
  });
}
