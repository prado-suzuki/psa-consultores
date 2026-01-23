import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user has permission to assign tickets.
 * Returns true if user is admin OR has access to /gestao/chamados page.
 */
export function useCanAssignTickets() {
  const { user, isAdmin } = useAuth();

  const { data: canAssign = false } = useQuery({
    queryKey: ['can-assign-tickets', user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return false;
      if (isAdmin) return true;

      // Check if user has access to chamados management page
      const { data: chamadosPage } = await supabase
        .from('page_permissions')
        .select('id')
        .eq('page_path', '/gestao/chamados')
        .single();

      if (!chamadosPage) return false;

      const { data: access } = await supabase
        .from('user_page_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_permission_id', chamadosPage.id)
        .maybeSingle();

      return !!access;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return canAssign;
}
