import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';

export type FamiliaSaida =
  | 'acucar'
  | 'biodiesel'
  | 'etanol_interestado'
  | 'etanol_interno'
  | 'residuos_producao'
  | 'sucata';

export interface SaidaIcmsResponse {
  data: Record<string, unknown>[];
  totalizadores_mensal: Record<string, unknown>[];
}

interface UseSaidaIcmsParams {
  id_contribuinte: string;
  data_nota_ini?: string;
  data_nota_fim?: string;
  page: number;
  enabled?: boolean;
}

export function useSaidaIcms(familia: FamiliaSaida, params: UseSaidaIcmsParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<SaidaIcmsResponse>({
    queryKey: [
      'saida-icms',
      familia,
      params.id_contribuinte,
      params.data_nota_ini ?? null,
      params.data_nota_fim ?? null,
      params.page,
    ],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('id_contribuinte', params.id_contribuinte);
      if (params.data_nota_ini) sp.set('data_nota_ini', params.data_nota_ini);
      if (params.data_nota_fim) sp.set('data_nota_fim', params.data_nota_fim);
      sp.set('page', String(params.page));

      const url = getApiUrl(`/api/v1/saida_icms/${familia}?${sp.toString()}`);
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const body = await response.text();
        let detail = body;
        try {
          const parsed = JSON.parse(body);
          detail = parsed?.detail?.error_message ?? parsed?.detail ?? parsed?.message ?? body;
          if (typeof detail !== 'string') detail = JSON.stringify(detail);
        } catch {
          // body não era JSON, mantém o texto bruto
        }
        const err = new Error(`HTTP ${response.status} — ${detail}`);
        (err as Error & { status?: number }).status = response.status;
        throw err;
      }

      const json = await response.json();

      // Normaliza: residuos_producao/sucata devolvem array; demais devolvem { data, totalizadores_mensal }
      if (Array.isArray(json)) {
        return { data: json, totalizadores_mensal: [] };
      }
      return {
        data: Array.isArray(json?.data) ? json.data : [],
        totalizadores_mensal: Array.isArray(json?.totalizadores_mensal)
          ? json.totalizadores_mensal
          : [],
      };
    },
    enabled: (params.enabled ?? true) && !!params.id_contribuinte,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export const SAIDA_ICMS_PAGE_SIZE = 50;
