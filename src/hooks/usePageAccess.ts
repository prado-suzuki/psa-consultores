import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user has access to a specific page.
 * Returns true if:
 * - User is admin (always has access)
 * - Page is not registered in page_permissions (free access)
 * - User has explicit access in user_page_access table
 */
export function usePageAccess(pagePath: string) {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['page-access', user?.id, pagePath],
    queryFn: async () => {
      if (!user) return false;
      if (isAdmin) return true; // Admins always have access

      // Check if page exists in permissions table
      const { data: page } = await supabase
        .from('page_permissions')
        .select('id')
        .eq('page_path', pagePath)
        .maybeSingle();

      if (!page) return true; // Page not registered = free access

      // Check if user has access
      const { data: access } = await supabase
        .from('user_page_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_permission_id', page.id)
        .maybeSingle();

      return !!access;
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return { hasAccess: hasAccess ?? false, isLoading: authLoading || isLoading };
}
