import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const equipeAuthRolesQueryKey = (userId: string) =>
  ['domain-equipe-auth', 'user-roles', userId] as const;

export function useDomainEquipeAuth() {
  const queryClient = useQueryClient();

  const fetchUserRoles = (userId: string) =>
    queryClient.fetchQuery({
      queryKey: equipeAuthRolesQueryKey(userId),
      queryFn: async () => {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        return roles;
      },
      staleTime: 0,
      gcTime: 0,
      retry: false,
    });

  return { fetchUserRoles };
}
