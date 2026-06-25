import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { useAllDashboardAccess } from '@/hooks/useUserDashboardAccess';
import { useUsersClusterNames } from '@/hooks/useUsersClusterNames';
import { usePreviewDashboardEmbedUrl } from '@/hooks/usePreviewDashboardEmbedUrl';
import type { DashboardFilterType } from '@/hooks/useDashboards';
import { DicaIcon } from '@/components/equipe/mapa/Tooltip';
import { SingleSelectCombobox } from './SingleSelectCombobox';
import { DashboardIframe } from './DashboardIframe';

export interface PreviewTarget {
  dashboardId: string;
  dashboardName: string;
  filterType: DashboardFilterType;
  /** Pré-seleção do usuário (ex.: vindo da aba Usuários). */
  initialUserId?: string | null;
}

interface DashboardPreviewDialogProps {
  target: PreviewTarget | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Pré-visualiza o dashboard "como" um usuário COM ACESSO — o filtro RLS é
 * resolvido no servidor pelo usuário escolhido. Sem toggles: só o seletor de
 * usuário (mostrando o cluster de cada um). Lista apenas quem já tem acesso.
 */
export function DashboardPreviewDialog({ target, onOpenChange }: DashboardPreviewDialogProps) {
  const open = !!target;
  const filterType = target?.filterType ?? 'nenhum';

  const [userId, setUserId] = useState<string | null>(null);

  const { data: users = [] } = useUsersWithRoles();
  const { data: allAccess = [] } = useAllDashboardAccess();

  // usuários que JÁ têm acesso a este dashboard
  const accessUserIds = useMemo(
    () => allAccess.filter((a) => a.dashboard_id === target?.dashboardId).map((a) => a.user_id),
    [allAccess, target?.dashboardId],
  );
  const { data: clusterNames } = useUsersClusterNames(accessUserIds);

  const options = useMemo(() => {
    const byId = new Map(users.map((u) => [u.id, u]));
    return accessUserIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((u) => {
        const name = `${u!.first_name ?? ''} ${u!.last_name ?? ''}`.trim() || u!.email;
        const cluster = clusterNames?.get(u!.id);
        return { value: u!.id, label: cluster ? `${name} · ${cluster}` : name };
      });
  }, [users, accessUserIds, clusterNames]);

  // pré-seleciona o usuário (o da aba Usuários, ou o primeiro com acesso)
  useEffect(() => {
    if (!target) return;
    setUserId(target.initialUserId ?? null);
  }, [target?.dashboardId, target?.initialUserId]);
  useEffect(() => {
    if (!userId && accessUserIds.length) {
      setUserId(target?.initialUserId && accessUserIds.includes(target.initialUserId) ? target.initialUserId : accessUserIds[0]);
    }
  }, [accessUserIds, userId, target?.initialUserId]);

  const preview = usePreviewDashboardEmbedUrl({
    dashboardId: target?.dashboardId ?? null,
    filterType, mode: 'user', userId,
  });

  const noUsers = accessUserIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[92vw] w-[92vw] h-[90vh] flex flex-col gap-3 p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">Preview — {target?.dashboardName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-500 inline-flex items-center gap-1">
            Pré-visualizar como
            <DicaIcon text="O filtro é resolvido no servidor pelo usuário escolhido — exatamente como ele veria. Só aparecem usuários com acesso a este dashboard." />
          </span>
          <SingleSelectCombobox
            options={options}
            value={userId}
            onChange={setUserId}
            placeholder={noUsers ? 'Nenhum usuário com acesso' : 'Selecionar usuário…'}
            searchPlaceholder="Buscar usuário…"
            emptyText="Nenhum usuário com acesso."
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {noUsers ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500">Conceda acesso a algum usuário pra pré-visualizar.</p>
            </div>
          ) : !userId ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500">Selecione um usuário acima para visualizar.</p>
            </div>
          ) : (
            <DashboardIframe
              embed={preview.data}
              isLoading={preview.isLoading}
              title={target?.dashboardName ?? 'Dashboard'}
              fill
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
