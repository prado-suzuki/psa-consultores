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

export interface OsExpandProduto {
  id: string;
  label: string;
  horas_contratadas: number | null;
}

export interface OsExpandItem {
  id: string;
  numero_os: string | null;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  valor_projeto: number | null;
  setor_cliente: string | null;
  produtos: OsExpandProduto[];
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
  /** Quantidade de OS cadastradas (não excluídas) do cliente. */
  _osCount: number;
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
export function useClientesFiltrados(
  params: ClientesFiltradosParams,
  enabled: boolean,
  scopeClusterId?: string,
  includeUnmapped = false,
) {
  const { clienteId, status, tipo, categoria, nomeRazaoSocial } = params;
  const hasContribuinteFilters = !!nomeRazaoSocial;

  return useQuery<ClienteFiltrado[]>({
    queryKey: ['clientes-filtrados', clienteId, status, tipo, categoria, nomeRazaoSocial, scopeClusterId, includeUnmapped],
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

      // Enrich with cluster names + setor_cliente vindo da OS mais recente
      const clienteIds = (data || []).map((c) => c.id);
      const clusterMap: Record<string, string[]> = {};
      const clusterIdMap: Record<string, string[]> = {};
      const setorMap: Record<string, string | null> = {};
      const osCountMap: Record<string, number> = {};
      if (clienteIds.length > 0) {
        const { data: ccRows } = await supabase
          .from('cliente_clusters')
          .select('cliente_id, cluster_id, estrutura_clusters(name)')
          .in('cliente_id', clienteIds);
        if (ccRows) {
          for (const row of ccRows) {
            const cid = row.cliente_id as string;
            const clId = row.cluster_id as string | null;
            const cname = (row.estrutura_clusters as unknown as { name: string } | null)?.name;
            if (!clusterMap[cid]) clusterMap[cid] = [];
            if (cname) clusterMap[cid].push(cname);
            if (!clusterIdMap[cid]) clusterIdMap[cid] = [];
            if (clId) clusterIdMap[cid].push(clId);
          }
        }

        const { data: viewRows } = await (supabase.from('cliente_setor_regiao_atual' as any) as any)
          .select('id_cliente, setor_cliente')
          .in('id_cliente', clienteIds);
        for (const row of (viewRows || []) as Array<{ id_cliente: string; setor_cliente: string | null }>) {
          setorMap[row.id_cliente] = row.setor_cliente;
        }

        // Contagem de OS por cliente (ordem_servico não tem coluna ambiente)
        const { data: osRows } = await supabase
          .from('ordem_servico')
          .select('id_cliente')
          .in('id_cliente', clienteIds)
          .eq('excluido', false);
        for (const row of osRows ?? []) {
          const cid = row.id_cliente as string;
          osCountMap[cid] = (osCountMap[cid] ?? 0) + 1;
        }
      }

      const result = (data || []).map((c) => ({
        ...c,
        setor_cliente: setorMap[c.id] ?? null,
        _clusters: clusterMap[c.id] || [],
        _osCount: osCountMap[c.id] ?? 0,
      })) as ClienteFiltrado[];

      // Escopo por cluster (visualização). Sem scopeClusterId → sem filtro (compat).
      // includeUnmapped: mantém clientes sem vínculo de cluster (legado) — usar só no Tax.
      if (!scopeClusterId) return result;
      return result.filter((c) => {
        const ids = clusterIdMap[c.id] || [];
        return ids.includes(scopeClusterId) || (includeUnmapped && ids.length === 0);
      });
    },
    enabled,
  });
}

/** OS do cliente + produtos contratados de cada uma (linha expandida da tabela) */
export function useOsExpand(clienteId: string) {
  return useQuery<OsExpandItem[]>({
    queryKey: ['os-expand', clienteId],
    queryFn: async () => {
      const { data: osRows, error } = await supabase
        .from('ordem_servico')
        .select('id, numero_os, situacao, data_inicio, data_fim, valor_projeto, setor_cliente')
        .eq('id_cliente', clienteId)
        .eq('excluido', false)
        .order('numero_os');
      if (error) throw error;

      const osIds = (osRows ?? []).map((o) => o.id);
      const produtosPorOs: Record<string, OsExpandProduto[]> = {};
      if (osIds.length > 0) {
        const { data: prodRows } = await supabase
          .from('os_produtos_contratados')
          .select('id, ordem_servico_id, horas_contratadas, produto_segmento(codigo, nome)')
          .in('ordem_servico_id', osIds);
        for (const row of prodRows ?? []) {
          const ps = row.produto_segmento as unknown as { codigo: string; nome: string } | null;
          const osId = row.ordem_servico_id as string;
          if (!produtosPorOs[osId]) produtosPorOs[osId] = [];
          produtosPorOs[osId].push({
            id: row.id as string,
            label: ps ? `${ps.codigo} — ${ps.nome}` : '—',
            horas_contratadas: row.horas_contratadas != null ? Number(row.horas_contratadas) : null,
          });
        }
      }

      return (osRows ?? []).map((os) => ({
        id: os.id,
        numero_os: os.numero_os,
        situacao: os.situacao,
        data_inicio: os.data_inicio,
        data_fim: os.data_fim,
        valor_projeto: os.valor_projeto != null ? Number(os.valor_projeto) : null,
        setor_cliente: os.setor_cliente,
        produtos: produtosPorOs[os.id] ?? [],
      }));
    },
    enabled: !!clienteId,
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
