import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardFilterType } from './useDashboards';

/**
 * Acesso a dashboards via TABELAS DE JUNÇÃO (20260701100000):
 *   dashboard_cluster_access (dashboard_id -> cluster_id)
 *   dashboard_cliente_access (dashboard_id -> cliente_id)
 * Tipos do Supabase ainda não regerados -> `as any` no acesso.
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
      const { data, error } = await (supabase
        .from('dashboard_cluster_access' as any)
        .select('dashboard_id, cluster_id') as any);
      if (error) throw error;
      return (data || []) as { dashboard_id: string; cluster_id: string }[];
    },
  });
}

function useClienteAccessRows() {
  return useQuery({
    queryKey: CLIENTE_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('dashboard_cliente_access' as any)
        .select('dashboard_id, cliente_id') as any);
      if (error) throw error;
      return (data || []) as { dashboard_id: string; cliente_id: string }[];
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

// Sincroniza uma junção (delete removidos + insere novos) — preserva as linhas mantidas.
async function syncJunction(
  table: string,
  column: 'cluster_id' | 'cliente_id',
  dashboardId: string,
  desired: string[],
  createdBy?: string,
) {
  const { data, error } = await (supabase
    .from(table as any)
    .select(`id, ${column}`)
    .eq('dashboard_id', dashboardId) as any);
  if (error) throw error;
  const existing = (data || []) as Record<string, string>[];
  const existingIds = new Set(existing.map((r) => r[column]));
  const desiredSet = new Set(desired);

  const toRemove = existing.filter((r) => !desiredSet.has(r[column])).map((r) => r.id);
  const toAdd = desired.filter((id) => !existingIds.has(id));

  if (toRemove.length) {
    const { error: delErr } = await (supabase.from(table as any) as any).delete().in('id', toRemove);
    if (delErr) throw delErr;
  }
  if (toAdd.length) {
    const rows = toAdd.map((id) => ({ dashboard_id: dashboardId, [column]: id, created_by: createdBy }));
    const { error: insErr } = await (supabase.from(table as any) as any).insert(rows);
    if (insErr) throw insErr;
  }
}

async function clearJunction(table: string, dashboardId: string) {
  const { error } = await (supabase.from(table as any) as any).delete().eq('dashboard_id', dashboardId);
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
        await syncJunction('dashboard_cliente_access', 'cliente_id', dashboardId, clienteIds, user?.id);
        await clearJunction('dashboard_cluster_access', dashboardId);
      } else {
        await syncJunction('dashboard_cluster_access', 'cluster_id', dashboardId, clusterIds, user?.id);
        await clearJunction('dashboard_cliente_access', dashboardId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLUSTER_KEY });
      qc.invalidateQueries({ queryKey: CLIENTE_KEY });
    },
  });
}
