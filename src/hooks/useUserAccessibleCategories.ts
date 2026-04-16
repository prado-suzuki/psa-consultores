import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the set of page_permissions.category values the current user
 * has at least one explicit access record for.
 * Admin users skip the query — they see everything.
 */
export function useUserAccessibleCategories() {
  const { user, isAdmin } = useAuth();

  const query = useQuery({
    queryKey: ['user-accessible-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_page_access')
        .select('page_permission_id, page_permissions(category)')
        .eq('user_id', user!.id);

      if (error) throw error;

      const categories = (data ?? [])
        .map((d: any) => d.page_permissions?.category as string | undefined)
        .filter(Boolean) as string[];

      return [...new Set(categories)];
    },
    enabled: !!user && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return {
    categories: isAdmin ? null : (query.data ?? []),
    isLoading: isAdmin ? false : query.isLoading,
    isAdmin,
  };
}
