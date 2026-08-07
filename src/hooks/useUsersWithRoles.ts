import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Papéis do enum `app_role`.
 *
 * `admin`, `team_member`, `lider` e `sublider` formam a hierarquia que
 * `has_role_or_higher` usa no banco. `client`, `timecliente` e `marketing` são
 * laterais: não entram nessa escada e só valem onde forem citados por nome.
 */
export type AppRole =
  | 'admin'
  | 'team_member'
  | 'lider'
  | 'sublider'
  | 'client'
  | 'timecliente'
  | 'marketing';

/**
 * Converte um papel para o tipo que o cliente do Supabase espera.
 *
 * `src/integrations/supabase/types.ts` é autogerado e ainda não conhece
 * `marketing`: ele só passa a conhecer no próximo `gen types`. O banco já
 * aceita o valor (o enum foi estendido na migração `20260806190000`), então o
 * descompasso é só do arquivo de tipos, e editá-lo à mão é proibido pelo
 * AGENTS.md.
 *
 * O cast fica concentrado aqui, com nome e motivo, em vez de espalhado como um
 * `as any` solto em cada chamada. Quando os tipos forem regerados, esta função
 * vira identidade e pode sumir.
 */
export const paraRoleDoBanco = (role: AppRole | string) =>
  role as Exclude<AppRole, 'marketing'>;

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
