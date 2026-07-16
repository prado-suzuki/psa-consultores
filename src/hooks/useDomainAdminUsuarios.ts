import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export type AdminUsuariosRole = 'admin' | 'client' | 'team_member' | 'lider';

export interface AdminUsuarioWithRoles {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  roles: string[];
}

export interface CreateAdminUsuarioInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

interface AdminUsuarioRoleInput {
  userId: string;
  role: AdminUsuariosRole;
}

interface UseDomainAdminUsuariosOptions {
  onCreateUserSuccess: () => void;
  onCreateUserError: (error: Error) => void;
  onAddRoleSuccess: () => void;
  onAddRoleError: (error: Error) => void;
  onRemoveRoleSuccess: () => void;
  onRemoveRoleError: (error: Error) => void;
}

const adminUsuariosQueryKey = ['admin-all-users'] as const;

export function useDomainAdminUsuarios({
  onCreateUserSuccess,
  onCreateUserError,
  onAddRoleSuccess,
  onAddRoleError,
  onRemoveRoleSuccess,
  onRemoveRoleError,
}: UseDomainAdminUsuariosOptions) {
  const queryClient = useQueryClient();

  const usersWithRolesQuery = useQuery({
    queryKey: adminUsuariosQueryKey,
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id).map(r => r.role),
      })) as AdminUsuarioWithRoles[];
    },
  });

  const createUser = useMutation({
    mutationFn: async (newUser: CreateAdminUsuarioInput) => {
      const { data, error } = await supabase.functions.invoke('create-team-member', {
        body: {
          email: newUser.email,
          password: newUser.password,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          roles: newUser.roles,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsuariosQueryKey });
      onCreateUserSuccess();
    },
    onError: onCreateUserError,
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: AdminUsuarioRoleInput) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsuariosQueryKey });
      onAddRoleSuccess();
    },
    onError: onAddRoleError,
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: AdminUsuarioRoleInput) => {
      // UNIQUE(user_id, role) garante 0 ou 1 linha — sample acha o id real pro precheck.
      const { data: sample } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();
      if (sample?.id) {
        await assertCanPerform('user_roles', 'delete', sample.id);
      }
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsuariosQueryKey });
      onRemoveRoleSuccess();
    },
    onError: onRemoveRoleError,
  });

  return {
    usersWithRolesQuery,
    createUser,
    addRole,
    removeRole,
  };
}
