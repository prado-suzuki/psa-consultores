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

// Aliases de campos da view BigQuery → nome canônico usado pelo frontend.
// O backend pode mudar os nomes ao longo do tempo; mantemos aqui os sinônimos
// conhecidos para que labels, formatCell e checkColor não precisem saber dessa
// variação.
const FIELD_ALIASES: Record<string, string> = {
  // Documento / produto
  NOTA_FISCAL: 'NUM_NOTA',
  NUM_NF: 'NUM_NOTA',
  PRODUTO: 'DESCRICAO_PRODUTO',
  // CST / quantidades
  CST: 'CST_ICMS',
  QNT_BC_LITROS: 'QUANTIDADE',
  // Base de cálculo
  BC: 'BASE_CALCULO_ICMS',
  BC_CALCULO: 'BASE_CALCULO_ICMS',
  // Valor da mercadoria (etanol interestadual usa "valor"; biodiesel não devolve)
  VALOR: 'VALOR_MERCADORIA',
  // EFD C190 (residuos_producao usa C190_*; biodiesel/sucata usam EFD_C190_*)
  C190_BC: 'BC_ICMS_C190',
  C190_VL_ICMS: 'VL_ICMS_C190',
  EFD_C190_BC: 'BC_ICMS_C190',
  EFD_C190_ICMS: 'VL_ICMS_C190',
};

function canonicalKey(rawKey: string): string {
  const upper = rawKey.toUpperCase();
  return FIELD_ALIASES[upper] ?? upper;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const canon = canonicalKey(key);
    // Não sobrescreve se já existe valor não-nulo (evita um alias derrubar o canônico).
    if (out[canon] === undefined || out[canon] === null || out[canon] === '') {
      out[canon] = value;
    }
  }
  return out;
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
      const rawData: Record<string, unknown>[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data) ? json.data : [];
      const rawTotals: Record<string, unknown>[] = Array.isArray(json?.totalizadores_mensal)
        ? json.totalizadores_mensal
        : [];

      return {
        data: rawData.map(normalizeRow),
        totalizadores_mensal: rawTotals.map(normalizeRow),
      };
    },
    enabled: (params.enabled ?? true) && !!params.id_contribuinte,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export const SAIDA_ICMS_PAGE_SIZE = 50;
