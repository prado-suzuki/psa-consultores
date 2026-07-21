import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, currentAmbiente } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  PROCESSO_DIFAL_CLIENTES_PERMITIDOS,
  PROCESSO_DIFAL_ITEMS_PER_PAGE,
} from '@/lib/processoDifal';
import type {
  ClassificacoesBuscarResponse,
  DifalApiGroupedResponse,
  DifalGroupedItem,
} from '@/types/difal';

export interface ProcessoDifalCliente {
  id: string;
  nome: string;
}

export interface ProcessoDifalContribuinte {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
}

type StatusFilter = 'all' | 'validated' | 'pending';

export function useProcessoDifalClientesQuery() {
  return useQuery({
    queryKey: ['difal-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .or(PROCESSO_DIFAL_CLIENTES_PERMITIDOS.map((name) => `nome.ilike.${name}`).join(','))
        .order('nome');
      if (error) throw error;
      return (data || []) as ProcessoDifalCliente[];
    },
  });
}

export function useProcessoDifalContribuintesQuery(selectedCliente: string) {
  return useQuery({
    queryKey: ['difal-contribuintes', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', selectedCliente)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return (data || []) as ProcessoDifalContribuinte[];
    },
    enabled: !!selectedCliente,
  });
}

interface GroupedQueryParams {
  selectedContribuinte: string;
  startDate: string;
  endDate: string;
  currentPage: number;
  statusFilter: StatusFilter;
  searchTriggered: boolean;
}

export function useProcessoDifalGroupedItemsQuery(params: GroupedQueryParams) {
  const { fetchWithAuth } = useApiAuth();
  const { selectedContribuinte, startDate, endDate, currentPage, statusFilter, searchTriggered } =
    params;
  return useQuery({
    queryKey: [
      'difal-grouped-items',
      selectedContribuinte,
      startDate,
      endDate,
      currentPage,
      statusFilter,
    ],
    queryFn: async () => {
      if (!selectedContribuinte) throw new Error('Contribuinte não selecionado');
      let url = `${API_BASE_URL}/api/v1/query/contribuintes/${selectedContribuinte}/nfes/agrupado-item?data_inicio=${startDate}&data_fim=${endDate}&tipo_mov=Entrada&page=${currentPage}&page_size=${PROCESSO_DIFAL_ITEMS_PER_PAGE}`;
      if (statusFilter === 'validated') url += '&valid=true';
      else if (statusFilter === 'pending') url += '&valid=false';
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('Erro ao buscar itens agrupados');
      const data: DifalApiGroupedResponse = await response.json();
      return {
        items: data.items,
        total: data.total,
        hasMore: data.has_more,
        qtdValidados: data.qtd_validados,
        qtdPendentes: data.qtd_pendentes,
      };
    },
    enabled: searchTriggered && !!selectedContribuinte,
  });
}

export function useProcessoDifalClassificacoesQuery(groupedItems: DifalGroupedItem[]) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery({
    queryKey: [
      'difal-classificacoes',
      groupedItems.map((item) => `${item.cod_produto}|${item.cod_ncm}`),
    ],
    queryFn: async () => {
      if (groupedItems.length === 0) return {};
      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/classificacoes/buscar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: groupedItems.map((item) => ({
            id_contribuinte: item.id_contribuinte,
            cod_produto: item.cod_produto,
            cod_ncm: item.cod_ncm,
          })),
        }),
      });
      if (!response.ok) throw new Error('Erro ao buscar classificações');
      return response.json() as Promise<ClassificacoesBuscarResponse>;
    },
    enabled: groupedItems.length > 0,
  });
}
