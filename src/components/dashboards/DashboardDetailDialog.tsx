import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Shield, Building2, Users } from 'lucide-react';
import { useClientesList } from '@/hooks/useClientesList';
import { useDashboardAccessMaps } from '@/hooks/useDashboardAccess';
import { DASHBOARD_PAGE_PATH } from '@/config/dashboardPages';
import type { Dashboard, DashboardFilterType, MinRole } from '@/hooks/useDashboards';

const FILTER_LABEL: Record<DashboardFilterType, string> = {
  cluster: 'Por cluster', cliente: 'Por cliente', nenhum: 'Sem filtro',
};
const MIN_ROLE_LABEL: Record<MinRole, string> = {
  team_member: 'Membro (equipe) ou superior', sublider: 'Sublíder ou superior',
  lider: 'Líder ou superior', admin: 'Admin',
};

/**
 * Visão somente-leitura do dashboard (aberta ao clicar na linha): config + quem
 * tem acesso (por cliente, ou por cluster + nível) + botão pra abrir o preview.
 */
interface DashboardDetailDialogProps {
  dashboard: Dashboard | null;
  onOpenChange: (open: boolean) => void;
  onPreview: (d: Dashboard) => void;
}

export function DashboardDetailDialog({ dashboard, onOpenChange, onPreview }: DashboardDetailDialogProps) {
  const { data: clientes = [] } = useClientesList();
  const { data: allClusters = [] } = useQuery({
    queryKey: ['estrutura-clusters-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_clusters').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });
  const clusterName = useMemo(() => new Map(allClusters.map((c) => [c.id, c.name])), [allClusters]);
  const clienteName = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const { clustersByDashboard, clientesByDashboard } = useDashboardAccessMaps();

  const isCliente = dashboard?.filter_type === 'cliente';
  const clienteIds = (dashboard && clientesByDashboard.get(dashboard.id)) || [];
  const clusterIds = (dashboard && clustersByDashboard.get(dashboard.id)) || [];
  const allClustersOn = dashboard?.all_clusters ?? false;

  return (
    <Dialog open={!!dashboard} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dashboard?.name}</DialogTitle>
        </DialogHeader>

        {dashboard && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{FILTER_LABEL[dashboard.filter_type]}</Badge>
              {dashboard.target_page && (
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {DASHBOARD_PAGE_PATH[dashboard.target_page] ?? dashboard.target_page}
                </Badge>
              )}
              {!dashboard.is_active && <Badge className="bg-slate-200 text-slate-600">Inativo</Badge>}
            </div>

            <div>
              <p className="text-xs text-slate-500">URL do embed</p>
              <p className="font-mono text-xs break-all text-slate-700">{dashboard.embed_url}</p>
            </div>

            {(dashboard.param_names || []).length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Parâmetros (dsN)</p>
                <div className="flex flex-wrap gap-1">
                  {dashboard.param_names.map((p) => (
                    <Badge key={p} variant="secondary" className="font-mono text-[11px]">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Acesso */}
            {isCliente ? (
              <div>
                <p className="text-xs text-slate-500 mb-1 inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Clientes com acesso ({clienteIds.length})
                </p>
                {clienteIds.length === 0 ? (
                  <p className="text-slate-400 text-xs">Ninguém ainda. Conceda ao editar.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {clienteIds.map((id) => (
                      <Badge key={id} variant="outline" className="text-xs border-indigo-200 bg-indigo-50 text-indigo-700">
                        {clienteName.get(id) ?? id}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1 inline-flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> Nível mínimo
                  </p>
                  <Badge variant="outline" className="text-xs">{MIN_ROLE_LABEL[dashboard.min_role ?? 'team_member']}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1 inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Clusters com acesso {!allClustersOn && clusterIds.length > 0 && `(${clusterIds.length})`}
                  </p>
                  {allClustersOn ? (
                    <Badge variant="outline" className="text-xs border-teal-200 bg-teal-50 text-teal-700">Todos os gestores</Badge>
                  ) : clusterIds.length === 0 ? (
                    <span className="text-slate-400 text-xs">Só admin (nenhum cluster marcado).</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {clusterIds.map((id) => (
                        <Badge key={id} variant="outline" className="text-xs border-teal-200 bg-teal-50 text-teal-700">
                          {clusterName.get(id) ?? id}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">Gestor vê o próprio cluster · admin/digital vê todos consolidado.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => dashboard && onPreview(dashboard)}>
            <Eye className="h-4 w-4 mr-1" />Visualizar preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
