import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardFilterType } from '@/hooks/useDashboards';

/**
 * Dashboards que o usuário logado pode ver numa página (target_page).
 *
 * Vai pela RPC SECURITY DEFINER `get_accessible_dashboards` — o gate de acesso
 * (dashboard_access) roda no servidor, então funciona inclusive para `client`
 * (papel abaixo de team_member, que não lê a tabela `dashboards` direto).
 */
export interface AccessibleDashboard {
  id: string;
  name: string;
  filter_type: DashboardFilterType;
  target_page: string | null;
}

export function useAccessibleDashboards(targetPage: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['accessible-dashboards', targetPage, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AccessibleDashboard[]> => {
      const { data, error } = await (supabase.rpc as any)('get_accessible_dashboards', {
        _target_page: targetPage,
      });
      if (error) throw error;
      return (data || []) as AccessibleDashboard[];
    },
  });
}
