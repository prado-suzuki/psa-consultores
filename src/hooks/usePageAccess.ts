import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user has access to a specific page.
 * Returns true if:
 * - User is admin (always has access)
 * - Page is not registered in page_permissions (free access)
 * - User has explicit access in user_page_access table
 * - NEW: Page category is 'geral' and user is team_member
 * - NEW: User belongs to a team whose area's page_categories includes the page's category
 */
export function usePageAccess(pagePath: string) {
  const { user, isAdmin, isTeamMember, isLider, isSublider, loading: authLoading } = useAuth();
  const isInternalUser = isTeamMember || isLider || isSublider;

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['page-access', user?.id, pagePath, isAdmin, isInternalUser],
    queryFn: async () => {
      if (!user) return false;
      if (isAdmin) return true;

      // Check if page exists in permissions table
      const { data: page } = await supabase
        .from('page_permissions')
        .select('id, category')
        .eq('page_path', pagePath)
        .maybeSingle();

      if (!page) return true; // Page not registered = free access

      // Check explicit user_page_access
      const { data: access } = await supabase
        .from('user_page_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_permission_id', page.id)
        .maybeSingle();

      if (access) return true;

      // NEW: Category 'geral' → any team_member gets access
      if (page.category === 'geral' && isInternalUser) return true;


      return false;
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  return { hasAccess: hasAccess ?? false, isLoading: authLoading || isLoading };
}
