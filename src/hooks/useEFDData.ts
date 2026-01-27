import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import type { EFDOverview, EFDDetail, EFDTipo } from '@/types/efd';

// Parâmetros para busca de overview (lista de arquivos)
interface UseEFDOverviewParams {
  enabled?: boolean;
  cnpj: string;              // CNPJ do contribuinte (obrigatório, apenas números)
  uf?: string;               // Filtro opcional
  indAtiv?: number;          // Filtro opcional
  dataInicio?: string;       // DT_INI (YYYY-MM-DD)
  dataFim?: string;          // DT_FIN (YYYY-MM-DD)
  tipo?: EFDTipo;            // 'contribuicoes' (default) ou 'icms'
}

// Parâmetros para busca de detalhes (registros de um arquivo)
interface UseEFDDetailParams {
  cnpj: string;              // CNPJ do contribuinte
  idArquivo: string;         // ID do arquivo
  registro: string;          // Código do registro (ex: "REG_C100")
  page?: number;             // Página (default: 1)
  limit?: number;            // Limite por página (default: 100, max: 200)
  filters?: Record<string, string>; // Filtros dinâmicos (IND_OPER, COD_MOD, etc.)
  tipo?: EFDTipo;            // 'contribuicoes' (default) ou 'icms'
}

// Função auxiliar para buscar JSON do Supabase Storage
async function fetchMockFromStorage(fileName: string): Promise<any> {
  const { data, error } = await supabase.storage
    .from('project-documents')
    .download(fileName);
  
  if (error) {
    throw new Error(`Erro ao buscar mock ${fileName}: ${error.message}`);
  }
  
  const text = await data.text();
  return JSON.parse(text);
}

export function useEFDOverview(params?: UseEFDOverviewParams) {
  const { fetchWithAuth } = useApiAuth();
  const tipo = params?.tipo || 'contribuicoes';

  return useQuery({
    queryKey: [
      'efd-overview',
      tipo,
      params?.cnpj,
      params?.uf,
      params?.indAtiv,
      params?.dataInicio,
      params?.dataFim,
    ],
    queryFn: async (): Promise<EFDOverview> => {
      if (!params?.cnpj) {
        throw new Error('CNPJ é obrigatório');
      }

      // Para ICMS, buscar dados do mock no Storage
      if (tipo === 'icms') {
        return fetchMockFromStorage('M1_EFD_ICMS.json');
      }

      // Para Contribuições, usar a API real
      const url = new URL(getApiUrl(`/api/v1/efd/contribuicoes/${params.cnpj}`));
      
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
    enabled: (params?.enabled ?? true) && !!params?.cnpj,
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
      params?.cnpj,
      params?.idArquivo,
      params?.registro,
      params?.page,
      params?.limit,
      params?.filters,
    ],
    queryFn: async (): Promise<EFDDetail> => {
      if (!params?.cnpj || !params?.idArquivo || !params?.registro) {
        throw new Error('CNPJ, ID do arquivo e registro são obrigatórios');
      }

      // Para ICMS, buscar dados do mock no Storage (apenas para REG_C100 por enquanto)
      if (tipo === 'icms') {
        // O mock M2 contém dados do REG_C100
        const mockData = await fetchMockFromStorage('M2_EFD_ICMS.json');
        return mockData;
      }

      // Para Contribuições, usar a API real
      // URL: /api/v1/efd/contribuicoes/{cnpj}/{id_arquivo}/registro/{codigo_registro}
      const url = new URL(
        getApiUrl(
          `/api/v1/efd/contribuicoes/${params.cnpj}/${params.idArquivo}/registro/${params.registro}`
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
    enabled: !!params?.cnpj && !!params?.idArquivo && !!params?.registro,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
