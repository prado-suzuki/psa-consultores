import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { CorrecoesSpedResponse, A170Item, D100Item, F100Item } from '@/types/correcoesSped';

interface UseCorrecoesSpedParams {
  id_contribuinte: string;
  dt_ini: string;
  dt_fin: string;
}

function useCorrecoesQuery<T>(
  key: string,
  endpoint: string,
  params: UseCorrecoesSpedParams,
) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<T>({
    queryKey: [key, params.id_contribuinte, params.dt_ini, params.dt_fin],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
        dt_ini: params.dt_ini,
        dt_fin: params.dt_fin,
      });
      const url = getApiUrl(`${endpoint}?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar ${key}: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });
}

export function useCorrecoesSped(params: UseCorrecoesSpedParams) {
  return useCorrecoesQuery<CorrecoesSpedResponse>(
    'correcoes-sped',
    '/api/v1/pis_cofins/revisao/notas-itens',
    params,
  );
}

export function useCorrecoesA170(params: UseCorrecoesSpedParams) {
  return useCorrecoesQuery<A170Item[]>(
    'correcoes-a170',
    '/api/v1/pis_cofins/revisao/servicos_itens',
    params,
  );
}

export function useCorrecoesD100(params: UseCorrecoesSpedParams) {
  return useCorrecoesQuery<D100Item[]>(
    'correcoes-d100',
    '/api/v1/pis_cofins/revisao/transp',
    params,
  );
}

export function useCorrecoesF100(params: UseCorrecoesSpedParams) {
  return useCorrecoesQuery<F100Item[]>(
    'correcoes-f100',
    '/api/v1/pis_cofins/revisao/transp_outros',
    params,
  );
}
