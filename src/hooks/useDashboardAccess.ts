import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardFilterType } from './useDashboards';

/**
 * Acesso a dashboards via TABELAS DE JUNÇÃO (20260701100000):
 *   dashboard_cluster_access (dashboard_id -> cluster_id)
 *   dashboard_cliente_access (dashboard_id -> cliente_id)
 *
 * Todo acesso aqui era `as any`, com o motivo escrito: os tipos do Supabase
 * ainda não conheciam as junções. Hoje conhecem, e o cast saiu.
 */

const CLUSTER_KEY = ['dashboard-cluster-access'] as const;
const CLIENTE_KEY = ['dashboard-cliente-access'] as const;

function pushInto(map: Map<string, string[]>, key: string, value: string) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

function useClusterAccessRows() {
  return useQuery({
    queryKey: CLUSTER_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_cluster_access')
        .select('dashboard_id, cluster_id');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useClienteAccessRows() {
  return useQuery({
    queryKey: CLIENTE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_cliente_access')
        .select('dashboard_id, cliente_id');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Mapas dashboard_id -> [ids] para render da coluna Acesso e prefill do form. */
export function useDashboardAccessMaps() {
  const clusters = useClusterAccessRows();
  const clientes = useClienteAccessRows();

  const clustersByDashboard = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of clusters.data ?? []) pushInto(m, r.dashboard_id, r.cluster_id);
    return m;
  }, [clusters.data]);

  const clientesByDashboard = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of clientes.data ?? []) pushInto(m, r.dashboard_id, r.cliente_id);
    return m;
  }, [clientes.data]);

  return { clustersByDashboard, clientesByDashboard, isLoading: clusters.isLoading || clientes.isLoading };
}

/**
 * Qual junção sincronizar.
 *
 * A assinatura era `(table: string, column: 'cluster_id' | 'cliente_id')`, e
 * nessa forma `syncJunction('dashboard_cluster_access', 'cliente_id', …)`
 * COMPILAVA, para falhar em runtime com coluna inexistente. A coluna deixou de
 * viajar como parâmetro: cada ramo nomeia a sua, então o par errado não é mais
 * expressável.
 */
type Juncao = 'dashboard_cluster_access' | 'dashboard_cliente_access';

/** Linha da junção reduzida ao que a sincronia usa: o id da linha e o alvo. */
interface LinhaDaJuncao {
  id: string;
  alvo: string;
}

// Os ramos por tabela existem porque o cliente tipado precisa do nome da tabela e
// da coluna como literais — `.select(`id, ${coluna}`)` volta a ser string opaca.
// A duplicação é de duas linhas e paga a checagem de nome de coluna.
async function linhasDaJuncao(juncao: Juncao, dashboardId: string): Promise<LinhaDaJuncao[]> {
  if (juncao === 'dashboard_cluster_access') {
    const { data, error } = await supabase
      .from('dashboard_cluster_access')
      .select('id, cluster_id')
      .eq('dashboard_id', dashboardId);
    if (error) throw error;
    return (data ?? []).map((r) => ({ id: r.id, alvo: r.cluster_id }));
  }
  const { data, error } = await supabase
    .from('dashboard_cliente_access')
    .select('id, cliente_id')
    .eq('dashboard_id', dashboardId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, alvo: r.cliente_id }));
}

async function inserirNaJuncao(
  juncao: Juncao,
  dashboardId: string,
  alvos: string[],
  createdBy?: string,
) {
  if (juncao === 'dashboard_cluster_access') {
    const { error } = await supabase.from('dashboard_cluster_access').insert(
      alvos.map((alvo) => ({ dashboard_id: dashboardId, cluster_id: alvo, created_by: createdBy })),
    );
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('dashboard_cliente_access').insert(
    alvos.map((alvo) => ({ dashboard_id: dashboardId, cliente_id: alvo, created_by: createdBy })),
  );
  if (error) throw error;
}

async function apagarPorId(juncao: Juncao, ids: string[]) {
  const { error } =
    juncao === 'dashboard_cluster_access'
      ? await supabase.from('dashboard_cluster_access').delete().in('id', ids)
      : await supabase.from('dashboard_cliente_access').delete().in('id', ids);
  if (error) throw error;
}

// Sincroniza uma junção (delete removidos + insere novos) — preserva as linhas mantidas.
async function syncJunction(
  juncao: Juncao,
  dashboardId: string,
  desired: string[],
  createdBy?: string,
) {
  const existing = await linhasDaJuncao(juncao, dashboardId);
  const existingIds = new Set(existing.map((r) => r.alvo));
  const desiredSet = new Set(desired);

  const toRemove = existing.filter((r) => !desiredSet.has(r.alvo)).map((r) => r.id);
  const toAdd = desired.filter((id) => !existingIds.has(id));

  if (toRemove.length) await apagarPorId(juncao, toRemove);
  if (toAdd.length) await inserirNaJuncao(juncao, dashboardId, toAdd, createdBy);
}

async function clearJunction(juncao: Juncao, dashboardId: string) {
  const { error } =
    juncao === 'dashboard_cluster_access'
      ? await supabase.from('dashboard_cluster_access').delete().eq('dashboard_id', dashboardId)
      : await supabase.from('dashboard_cliente_access').delete().eq('dashboard_id', dashboardId);
  if (error) throw error;
}

/** Persiste as listas de acesso do dashboard nas junções conforme o filter_type. */
export function useSetDashboardAccess() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ dashboardId, filterType, clusterIds, clienteIds }: {
      dashboardId: string;
      filterType: DashboardFilterType;
      clusterIds: string[];
      clienteIds: string[];
    }) => {
      if (filterType === 'cliente') {
        await syncJunction('dashboard_cliente_access', dashboardId, clienteIds, user?.id);
        await clearJunction('dashboard_cluster_access', dashboardId);
      } else {
        await syncJunction('dashboard_cluster_access', dashboardId, clusterIds, user?.id);
        await clearJunction('dashboard_cliente_access', dashboardId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLUSTER_KEY });
      qc.invalidateQueries({ queryKey: CLIENTE_KEY });
    },
  });
}
