import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user has access to a specific page.
 *
 * Visibilidade por rota — separada da operação (RLS):
 * - Admin sempre tem acesso.
 * - Página não cadastrada em `page_permissions` → acesso livre (rota pública).
 * - Caso contrário, exige registro explícito em `user_page_access`.
 *
 * Não há mais bypass por categoria/papel: para conceder visibilidade,
 * crie a entrada em `user_page_access` (manualmente ou via fluxo de
 * provisionamento de membros).
 */
export function usePageAccess(pagePath: string) {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['page-access', user?.id, pagePath, isAdmin],
    queryFn: async () => {
      if (!user) return false;
      if (isAdmin) return true;

      // Check if page exists in permissions table
      const { data: page } = await supabase
        .from('page_permissions')
        .select('id')
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

      return !!access;
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  return { hasAccess: hasAccess ?? false, isLoading: authLoading || isLoading };
}
