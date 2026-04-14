import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

// ── Interfaces ──────────────────────────────────────────────────────

export interface ClienteListItem {
  id: string;
  nome: string;
}

export interface ContribuinteFilterItem {
  id: string;
  nome_razao_social: string;
  cliente_id: string;
}

export interface ContribuinteExpandItem {
  id: string;
  cpf_cnpj: string | null;
  nome_razao_social: string;
  inscricao_estadual: string | null;
  simples_nacional: boolean | null;
}

export interface ClienteFiltrado {
  id: string;
  nome: string;
  ativo: boolean | null;
  fixo: string | null;
  telefone: string | null;
  setor_cliente: string | null;
  categoria: string | null;
  _clusters: string[];
  [key: string]: unknown;
}

export interface ClientesFiltradosParams {
  clienteId: string;
  status: string;
  tipo: string;
  categoria: string;
  nomeRazaoSocial: string;
}

// ── Hooks ────────────────────────────────────────────────────────────

/** Lista simples id+nome para dropdown de filtro */
export function useClientesLista() {
  return useQuery<ClienteListItem[]>({
    queryKey: ['clientes-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .not('nome', 'is', null)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as ClienteListItem[];
    },
  });
}

/** Contribuintes para filtro com dedup por nome */
export function useContribuintesPorCliente(clienteId: string) {
  return useQuery<ContribuinteFilterItem[]>({
    queryKey: ['contribuintes-por-cliente', clienteId],
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cliente_id')
        .not('nome_razao_social', 'is', null)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (clienteId && clienteId !== '__todos__') {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const unique = [
        ...new Map(
          (data ?? []).map((d) => [d.nome_razao_social, d])
        ).values(),
      ];
      return unique as ContribuinteFilterItem[];
    },
  });
}

/** Query principal com filtros + enriquecimento de clusters */
export function useClientesFiltrados(params: ClientesFiltradosParams, enabled: boolean) {
  const { clienteId, status, tipo, categoria, nomeRazaoSocial } = params;
  const hasContribuinteFilters = !!nomeRazaoSocial;

  return useQuery<ClienteFiltrado[]>({
    queryKey: ['clientes-filtrados', clienteId, status, tipo, categoria, nomeRazaoSocial],
    queryFn: async () => {
      let filteredClienteIds: string[] | null = null;

      if (hasContribuinteFilters) {
        let contribuinteQuery = supabase
          .from('contribuinte')
          .select('cliente_id')
          .eq('excluido', false);

        if (nomeRazaoSocial) contribuinteQuery = contribuinteQuery.eq('nome_razao_social', nomeRazaoSocial);

        const { data: contribData, error: contribError } = await contribuinteQuery;
        if (contribError) throw contribError;

        filteredClienteIds = [...new Set(contribData?.map((c) => c.cliente_id))] as string[];
        if (filteredClienteIds.length === 0) return [];
      }

      let clienteQuery = supabase
        .from('cliente')
        .select('*')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente);

      if (clienteId && clienteId !== '__todos__') {
        clienteQuery = clienteQuery.eq('id', clienteId);
      }
      if (status) clienteQuery = clienteQuery.eq('ativo', status === 'true');
      if (tipo) clienteQuery = clienteQuery.eq('fixo', tipo);
      if (categoria) clienteQuery = clienteQuery.eq('categoria', categoria);
      if (filteredClienteIds !== null) {
        clienteQuery = clienteQuery.in('id', filteredClienteIds);
      }

      const { data, error } = await clienteQuery.order('nome');
      if (error) throw error;

      // Enrich with cluster names
      const clienteIds = (data || []).map((c) => c.id);
      const clusterMap: Record<string, string[]> = {};
      if (clienteIds.length > 0) {
        const { data: ccRows } = await supabase
          .from('cliente_clusters')
          .select('cliente_id, cluster_id, estrutura_clusters(name)')
          .in('cliente_id', clienteIds);
        if (ccRows) {
          for (const row of ccRows) {
            const cid = row.cliente_id as string;
            const cname = (row.estrutura_clusters as unknown as { name: string } | null)?.name;
            if (!clusterMap[cid]) clusterMap[cid] = [];
            if (cname) clusterMap[cid].push(cname);
          }
        }
      }

      return (data || []).map((c) => ({
        ...c,
        _clusters: clusterMap[c.id] || [],
      })) as ClienteFiltrado[];
    },
    enabled,
  });
}

/** Contribuintes expandidos na tabela */
export function useContribuintesExpand(clienteId: string) {
  return useQuery<ContribuinteExpandItem[]>({
    queryKey: ['contribuintes-expand', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, cpf_cnpj, nome_razao_social, inscricao_estadual, simples_nacional')
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return (data ?? []) as ContribuinteExpandItem[];
    },
  });
}
