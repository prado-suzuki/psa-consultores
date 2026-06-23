import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useDashboardsList } from '@/hooks/useDashboards';
import {
  useUserDashboardAccess, useDashboardAccessMutations, type DashboardAccessRow,
} from '@/hooks/useUserDashboardAccess';
import { useUserEstrutura } from '@/hooks/useUserEstrutura';
import { DASHBOARD_PAGES, DASHBOARD_PAGE_LABEL } from '@/config/dashboardPages';

const FILTER_BADGE: Record<string, string> = {
  cluster: 'Por cluster',
  cliente: 'Por cliente',
  nenhum: 'Sem filtro',
};

/**
 * Concede/revoga acesso a dashboards para um usuário (tabela dashboard_access).
 *
 * Override do sócio: quando o dashboard filtra por cluster E o usuário não tem
 * cluster derivável (sócio/conta sem vínculo), aparece o controle "Clusters
 * visíveis" (lista explícita ou "todos") — sem isso, fail-closed (não vê nada).
 */
export function DashboardAccessPanel({ userId }: { userId: string }) {
  const { data: dashboards = [], isLoading } = useDashboardsList();
  const { data: access = [] } = useUserDashboardAccess(userId);
  const { clusters: userClusters, isLoading: loadingEstrutura } = useUserEstrutura(userId);
  const { grant, revoke, setOverride } = useDashboardAccessMutations();

  const { data: allClusters = [] } = useQuery({
    queryKey: ['estrutura-clusters-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_clusters').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  const accessByDashboard = useMemo(() => {
    const m = new Map<string, DashboardAccessRow>();
    for (const a of access) m.set(a.dashboard_id, a);
    return m;
  }, [access]);

  const userHasNoCluster = !loadingEstrutura && userClusters.length === 0;

  const grouped = useMemo(() => {
    const order = DASHBOARD_PAGES.map((p) => p.key) as string[];
    const byPage = new Map<string, typeof dashboards>();
    for (const d of dashboards) {
      const key = d.target_page ?? '_sem_pagina';
      if (!byPage.has(key)) byPage.set(key, []);
      byPage.get(key)!.push(d);
    }
    return [...byPage.entries()].sort(
      (a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99),
    );
  }, [dashboards]);

  if (isLoading) return <div className="text-sm text-slate-500">Carregando dashboards…</div>;
  if (dashboards.length === 0) {
    return <div className="text-sm text-slate-500">Nenhum dashboard cadastrado. Cadastre na aba "Dashboards".</div>;
  }

  return (
    <div className="space-y-4">
      {grouped.map(([pageKey, items]) => (
        <div key={pageKey} className="space-y-2">
          <Badge variant="outline" className="text-xs">
            {DASHBOARD_PAGE_LABEL[pageKey] ?? 'Sem página'}
          </Badge>
          <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200">
            {items.map((d) => {
              const row = accessByDashboard.get(d.id);
              const granted = !!row;
              const showOverride = granted && d.filter_type === 'cluster' && userHasNoCluster;
              return (
                <div key={d.id} className="p-2.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={granted}
                      disabled={grant.isPending || revoke.isPending}
                      onCheckedChange={(v) =>
                        v ? grant.mutate({ userId, dashboardId: d.id }) : revoke.mutate({ userId, dashboardId: d.id })
                      }
                      aria-label={`Acesso a ${d.name}`}
                      className="border-slate-300"
                    />
                    <span className="text-sm text-slate-900 flex-1 truncate">{d.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{FILTER_BADGE[d.filter_type]}</Badge>
                  </div>

                  {showOverride && row && (
                    <div className="mt-2 ml-6 rounded-md border border-amber-200 bg-amber-50/60 p-2 space-y-2">
                      <p className="text-[11px] text-amber-700">
                        Usuário sem cluster derivável (sócio). Defina o que ele enxerga:
                      </p>
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <Switch
                          checked={row.override_all_clusters}
                          onCheckedChange={(checked) =>
                            setOverride.mutate({
                              userId, dashboardId: d.id,
                              overrideClusterIds: checked ? [] : row.override_cluster_ids,
                              overrideAllClusters: checked,
                            })
                          }
                        />
                        Todos os clusters ativos
                      </label>
                      {!row.override_all_clusters && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {allClusters.map((c) => {
                            const checked = row.override_cluster_ids.includes(c.id);
                            return (
                              <label key={c.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    const next = v
                                      ? [...row.override_cluster_ids, c.id]
                                      : row.override_cluster_ids.filter((x) => x !== c.id);
                                    setOverride.mutate({
                                      userId, dashboardId: d.id,
                                      overrideClusterIds: next, overrideAllClusters: false,
                                    });
                                  }}
                                  className="border-slate-300"
                                />
                                {c.name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
