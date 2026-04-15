import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'team_member' | 'lider' | 'sublider' | 'client' | 'timecliente';

export interface UserWithRoles {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: AppRole[];
}

/**
 * Hook que retorna todos os usuários (via RPC get_profiles_with_email)
 * com suas roles (de user_roles).
 *
 * Usado em:
 * - /administracao/acessos (read-only)
 * - /gestao/acessos (read-only)
 * - /equipe/acessos (gestão completa)
 *
 * Mantém uma queryKey única para permitir invalidação compartilhada.
 */
export function useUsersWithRoles() {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      const [profilesResult, rolesResult] = await Promise.all([
        supabase.rpc('get_profiles_with_email'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;

      const profiles = profilesResult.data ?? [];
      const roles = rolesResult.data ?? [];

      return profiles.map((profile) => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        roles: roles
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole),
      }));
    },
    staleTime: 60 * 1000,
  });
}
