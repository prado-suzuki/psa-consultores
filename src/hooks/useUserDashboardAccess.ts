import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Grants de dashboards de um usuário (tabela `dashboard_access`).
 * Edição na aba Usuários do Controle de Acessos. Espelha o padrão de
 * useUserPageAccess (sem auditoria, igual aos demais grants de acesso).
 *
 * Tabela criada pela migration 20260623120000; tipos do Supabase ainda não
 * regerados → acesso via `as any`.
 */
export interface DashboardAccessRow {
  dashboard_id: string;
  override_cluster_ids: string[];
  override_all_clusters: boolean;
}

/**
 * Todas as linhas de dashboard_access (lido por lider+). Usado na aba Dashboards
 * pra montar a coluna "Acesso" cruzando com a lista de usuários no client.
 */
export interface AllAccessRow {
  dashboard_id: string;
  user_id: string;
  override_all_clusters: boolean;
  override_cluster_ids: string[];
}

export function useAllDashboardAccess() {
  return useQuery({
    queryKey: ['all-dashboard-access'],
    queryFn: async (): Promise<AllAccessRow[]> => {
      const { data, error } = await (supabase.from('dashboard_access' as any) as any)
        .select('dashboard_id, user_id, override_all_clusters, override_cluster_ids');
      if (error) throw error;
      return (data || []) as AllAccessRow[];
    },
  });
}

/** Override por usuário a aplicar junto com o grant (modal do dashboard). */
export interface UserOverride { all: boolean; ids: string[] }

export function useUserDashboardAccess(userId?: string | null) {
  const enabled = userId !== null && userId !== undefined;
  return useQuery({
    queryKey: ['user-dashboard-access', userId ?? 'none'],
    enabled,
    queryFn: async (): Promise<DashboardAccessRow[]> => {
      const { data, error } = await (supabase.from('dashboard_access' as any) as any)
        .select('dashboard_id, override_cluster_ids, override_all_clusters')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []) as DashboardAccessRow[];
    },
  });
}

export function useDashboardAccessMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = (userId: string) => {
    qc.invalidateQueries({ queryKey: ['user-dashboard-access', userId] });
    qc.invalidateQueries({ queryKey: ['accessible-dashboards'] });
  };

  const grant = useMutation({
    mutationFn: async ({
      userId, dashboardId, overrideAllClusters = false,
    }: { userId: string; dashboardId: string; overrideAllClusters?: boolean }) => {
      const { error } = await (supabase.from('dashboard_access' as any) as any).upsert(
        { dashboard_id: dashboardId, user_id: userId, created_by: user?.id, override_all_clusters: overrideAllClusters },
        { onConflict: 'dashboard_id,user_id', ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(v.userId); toast.success('Acesso concedido'); },
    onError: () => toast.error('Erro ao conceder acesso'),
  });

  const revoke = useMutation({
    mutationFn: async ({ userId, dashboardId }: { userId: string; dashboardId: string }) => {
      const { error } = await (supabase.from('dashboard_access' as any) as any)
        .delete().eq('user_id', userId).eq('dashboard_id', dashboardId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(v.userId); toast.success('Acesso revogado'); },
    onError: () => toast.error('Erro ao revogar acesso'),
  });

  const setOverride = useMutation({
    mutationFn: async ({
      userId, dashboardId, overrideClusterIds, overrideAllClusters,
    }: {
      userId: string; dashboardId: string; overrideClusterIds: string[]; overrideAllClusters: boolean;
    }) => {
      const { error } = await (supabase.from('dashboard_access' as any) as any)
        .update({
          override_cluster_ids: overrideClusterIds,
          override_all_clusters: overrideAllClusters,
          updated_by: user?.id,
        })
        .eq('user_id', userId).eq('dashboard_id', dashboardId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(v.userId); toast.success('Override atualizado'); },
    onError: () => toast.error('Erro ao salvar override'),
  });

  return { grant, revoke, setOverride };
}

/**
 * Define (diff) o conjunto de usuários com acesso a UM dashboard — usado no modal
 * de edição (grant pelo dashboard). Sem toast por usuário. Não mexe em override
 * (grant entra com override_all_clusters=false; sócio configura na aba Usuários).
 */
export function useSetDashboardUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      dashboardId, userIds, overrides,
    }: { dashboardId: string; userIds: string[]; overrides?: Record<string, UserOverride> }) => {
      const { data: current, error: e1 } = await (supabase.from('dashboard_access' as any) as any)
        .select('user_id').eq('dashboard_id', dashboardId);
      if (e1) throw e1;
      const currentIds = new Set(((current || []) as { user_id: string }[]).map((r) => r.user_id));
      const target = new Set(userIds);
      const toGrant = userIds.filter((id) => !currentIds.has(id));
      const toRevoke = [...currentIds].filter((id) => !target.has(id));

      if (toGrant.length) {
        const { error } = await (supabase.from('dashboard_access' as any) as any).upsert(
          toGrant.map((uid) => ({ dashboard_id: dashboardId, user_id: uid, created_by: user?.id })),
          { onConflict: 'dashboard_id,user_id', ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      if (toRevoke.length) {
        const { error } = await (supabase.from('dashboard_access' as any) as any)
          .delete().eq('dashboard_id', dashboardId).in('user_id', toRevoke);
        if (error) throw error;
      }

      // overrides de sócio (só p/ quem segue com acesso)
      for (const [uid, o] of Object.entries(overrides ?? {})) {
        if (!target.has(uid)) continue;
        const { error } = await (supabase.from('dashboard_access' as any) as any)
          .update({
            override_all_clusters: o.all,
            override_cluster_ids: o.all ? [] : o.ids,
            updated_by: user?.id,
          })
          .eq('dashboard_id', dashboardId).eq('user_id', uid);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-dashboard-access'] });
      qc.invalidateQueries({ queryKey: ['user-dashboard-access'] });
      qc.invalidateQueries({ queryKey: ['accessible-dashboards'] });
    },
  });
}
