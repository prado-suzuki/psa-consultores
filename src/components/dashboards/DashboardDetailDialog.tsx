import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Shield, Building2, Users, LayoutDashboard, Link2 } from 'lucide-react';
import { useClientesList } from '@/hooks/useClientesList';
import { useDashboardAccessMaps } from '@/hooks/useDashboardAccess';
import { DASHBOARD_PAGE_PATH } from '@/config/dashboardPages';
import type { Dashboard, DashboardFilterType, MinRole } from '@/hooks/useDashboards';

const FILTER_LABEL: Record<DashboardFilterType, string> = {
  cluster: 'Por cluster', cliente: 'Por cliente', nenhum: 'Sem filtro',
};
const FILTER_BADGE_CLASS: Record<DashboardFilterType, string> = {
  cluster: 'border-teal-200 bg-teal-50 text-teal-700',
  cliente: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  nenhum: 'border-slate-200 bg-slate-100 text-slate-500',
};
const MIN_ROLE_LABEL: Record<MinRole, string> = {
  team_member: 'Membro (equipe) ou superior', sublider: 'Sublíder ou superior',
  lider: 'Líder ou superior', admin: 'Admin',
};
const tipoLabel = (ft: DashboardFilterType) => (ft === 'nenhum' ? 'Interno' : 'Externo');
const tipoBadgeClass = (ft: DashboardFilterType) =>
  ft === 'nenhum' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700';

/** Rótulo de seção (ícone + texto). */
const SectionLabel = ({ icon: Icon, children }: { icon: typeof Shield; children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 inline-flex items-center gap-1.5">
    <Icon className="h-3.5 w-3.5" /> {children}
  </p>
);

/**
 * Visão somente-leitura do dashboard (aberta ao clicar na linha): config + quem
 * tem acesso + botões Editar / Visualizar preview.
 */
interface DashboardDetailDialogProps {
  dashboard: Dashboard | null;
  onOpenChange: (open: boolean) => void;
  onPreview: (d: Dashboard) => void;
  onEdit: (d: Dashboard) => void;
}

export function DashboardDetailDialog({ dashboard, onOpenChange, onPreview, onEdit }: DashboardDetailDialogProps) {
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
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <LayoutDashboard className="h-5 w-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate">{dashboard?.name}</DialogTitle>
              <DialogDescription>Detalhes e acesso do dashboard.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {dashboard && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={tipoBadgeClass(dashboard.filter_type)}>{tipoLabel(dashboard.filter_type)}</Badge>
              <Badge variant="outline" className={FILTER_BADGE_CLASS[dashboard.filter_type]}>{FILTER_LABEL[dashboard.filter_type]}</Badge>
              {dashboard.target_page && (
                <Badge variant="outline" className="font-mono text-[11px] border-slate-200 bg-slate-50 text-slate-600">
                  {DASHBOARD_PAGE_PATH[dashboard.target_page] ?? dashboard.target_page}
                </Badge>
              )}
              {!dashboard.is_active && <Badge className="bg-slate-200 text-slate-600">Inativo</Badge>}
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5 space-y-1">
              <SectionLabel icon={Link2}>URL do embed</SectionLabel>
              <p className="font-mono text-xs break-all text-slate-600">{dashboard.embed_url}</p>
              {(dashboard.param_names || []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {dashboard.param_names.map((p) => (
                    <span key={p} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{p}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Acesso */}
            {isCliente ? (
              <div className="space-y-1.5">
                <SectionLabel icon={Building2}>Clientes com acesso ({clienteIds.length})</SectionLabel>
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
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <SectionLabel icon={Shield}>Nível mínimo</SectionLabel>
                  <Badge variant="outline" className="text-xs">{MIN_ROLE_LABEL[dashboard.min_role ?? 'team_member']}</Badge>
                </div>
                <div className="space-y-1.5">
                  <SectionLabel icon={Users}>
                    Clusters com acesso {!allClustersOn && clusterIds.length > 0 && `(${clusterIds.length})`}
                  </SectionLabel>
                  {allClustersOn ? (
                    <Badge variant="outline" className="text-xs border-teal-200 bg-teal-50 text-teal-700">Todos os clusters</Badge>
                  ) : clusterIds.length === 0 ? (
                    <p className="text-slate-400 text-xs">Só Admin (nenhum cluster marcado).</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {clusterIds.map((id) => (
                        <Badge key={id} variant="outline" className="text-xs border-teal-200 bg-teal-50 text-teal-700">
                          {clusterName.get(id) ?? id}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">Cada usuário vê o próprio cluster · Admin vê todos consolidado.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => dashboard && onEdit(dashboard)}>
            <Pencil className="h-4 w-4 mr-1" />Editar
          </Button>
          <Button onClick={() => dashboard && onPreview(dashboard)}>
            <Eye className="h-4 w-4 mr-1" />Visualizar preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
