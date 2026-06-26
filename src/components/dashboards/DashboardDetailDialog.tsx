import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useAllDashboardAccess } from '@/hooks/useUserDashboardAccess';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { DASHBOARD_PAGE_LABEL } from '@/config/dashboardPages';
import type { Dashboard, DashboardFilterType } from '@/hooks/useDashboards';

const FILTER_LABEL: Record<DashboardFilterType, string> = {
  cluster: 'Por cluster', cliente: 'Por cliente', nenhum: 'Sem filtro',
};

/**
 * Visão somente-leitura do dashboard (aberta ao clicar na linha): config + quem
 * tem acesso + botão pra abrir o preview. Não edita nada.
 */
interface DashboardDetailDialogProps {
  dashboard: Dashboard | null;
  onOpenChange: (open: boolean) => void;
  onPreview: (d: Dashboard) => void;
}

export function DashboardDetailDialog({ dashboard, onOpenChange, onPreview }: DashboardDetailDialogProps) {
  const { data: allAccess = [] } = useAllDashboardAccess();
  const { data: users = [] } = useUsersWithRoles();

  const userIds = new Set(allAccess.filter((a) => a.dashboard_id === dashboard?.id).map((a) => a.user_id));
  const accessUsers = users.filter((u) => userIds.has(u.id));
  const userLabel = (u: { first_name?: string | null; last_name?: string | null; email: string }) =>
    `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;

  return (
    <Dialog open={!!dashboard} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dashboard?.name}</DialogTitle>
        </DialogHeader>

        {dashboard && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{FILTER_LABEL[dashboard.filter_type]}</Badge>
              {dashboard.target_page && (
                <Badge variant="secondary">{DASHBOARD_PAGE_LABEL[dashboard.target_page] ?? dashboard.target_page}</Badge>
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

            <div>
              <p className="text-xs text-slate-500 mb-1">Usuários com acesso ({accessUsers.length})</p>
              {accessUsers.length === 0 ? (
                <p className="text-slate-400 text-xs">Ninguém ainda. Conceda na aba Usuários ou ao editar.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {accessUsers.map((u) => (
                    <Badge key={u.id} variant="outline" className="text-xs">{userLabel(u)}</Badge>
                  ))}
                </div>
              )}
            </div>
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
