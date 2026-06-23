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
    mutationFn: async ({ userId, dashboardId }: { userId: string; dashboardId: string }) => {
      const { error } = await (supabase.from('dashboard_access' as any) as any).upsert(
        { dashboard_id: dashboardId, user_id: userId, created_by: user?.id },
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
