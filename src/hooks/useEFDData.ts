import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { EFDOverview, EFDDetail, EFDTipo } from '@/types/efd';

// Parâmetros para busca de overview (lista de arquivos)
interface UseEFDOverviewParams {
  enabled?: boolean;
  idContribuinte: string;    // UUID do contribuinte (obrigatório)
  uf?: string;               // Filtro opcional
  indAtiv?: number;          // Filtro opcional
  start_date?: string;       // DT_INI (YYYY-MM-DD)
  end_date?: string;          // DT_FIN (YYYY-MM-DD)
  tipo?: EFDTipo;            // 'contribuicoes' (default) ou 'icms'
}

// Parâmetros para busca de detalhes (registros de um arquivo)
interface UseEFDDetailParams {
  idContribuinte: string;    // UUID do contribuinte
  idArquivo: string;         // ID do arquivo
  registro: string;          // Código do registro (ex: "REG_C100")
  page?: number;             // Página (default: 1)
  limit?: number;            // Limite por página (default: 100, max: 200)
  filters?: Record<string, string>; // Filtros dinâmicos (IND_OPER, COD_MOD, etc.)
  tipo?: EFDTipo;            // 'contribuicoes' (default) ou 'icms'
}

export function useEFDOverview(params?: UseEFDOverviewParams) {
  const { fetchWithAuth } = useApiAuth();
  const tipo = params?.tipo || 'contribuicoes';

  return useQuery({
    queryKey: [
      'efd-overview',
      tipo,
      params?.idContribuinte,
      params?.uf,
      params?.indAtiv,
      params?.start_date,
      params?.end_date,
    ],
    queryFn: async (): Promise<EFDOverview> => {
      if (!params?.idContribuinte) {
        throw new Error('idContribuinte é obrigatório');
      }

      // Rota dinâmica: /api/v1/efd/{tipo}/{id_contribuinte}
      const url = new URL(getApiUrl(`/api/v1/efd/${tipo}/${params.idContribuinte}`));

      if (params.uf) {
        url.searchParams.set('UF', params.uf);
      }
      if (params.indAtiv !== undefined) {
        url.searchParams.set('IND_ATIV', String(params.indAtiv));
      }
      // NOTA: Os parâmetros DT_INI e DT_FIN da API são filtros de IGUALDADE EXATA,
      // não de intervalo. Por isso, a filtragem por período é feita no frontend
      // após receber todos os arquivos do contribuinte.

      const response = await fetchWithAuth(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro ${response.status}: Falha ao buscar dados EFD`);
      }

      return response.json();
    },
    enabled: (params?.enabled ?? true) && !!params?.idContribuinte,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useEFDDetail(params?: UseEFDDetailParams) {
  const { fetchWithAuth } = useApiAuth();
  const tipo = params?.tipo || 'contribuicoes';

  return useQuery({
    queryKey: [
      'efd-detail',
      tipo,
      params?.idContribuinte,
      params?.idArquivo,
      params?.registro,
      params?.page,
      params?.limit,
      params?.filters,
    ],
    queryFn: async (): Promise<EFDDetail> => {
      if (!params?.idContribuinte || !params?.idArquivo || !params?.registro) {
        throw new Error('idContribuinte, ID do arquivo e registro são obrigatórios');
      }

      // Rota dinâmica: /api/v1/efd/{tipo}/{id_contribuinte}/{id_arquivo}/registro/{codigo}
      const url = new URL(
        getApiUrl(
          `/api/v1/efd/${tipo}/${params.idContribuinte}/${params.idArquivo}/registro/${params.registro}`
        )
      );

      // Paginação
      url.searchParams.set('page', String(params.page || 1));
      url.searchParams.set('limit', String(params.limit || 100));

      // Filtros dinâmicos
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value) {
            url.searchParams.set(key, value);
          }
        });
      }

      const response = await fetchWithAuth(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro ${response.status}: Falha ao buscar detalhes`);
      }

      return response.json();
    },
    enabled: !!params?.idContribuinte && !!params?.idArquivo && !!params?.registro,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
