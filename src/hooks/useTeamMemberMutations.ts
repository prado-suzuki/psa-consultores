import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AREA_CATEGORIES_MAP, ALL_AREA_CATEGORIES } from '@/config/areaCategories';
import { useSyncUserAreaAccess } from './useUserPageAccess';
import type { AppRole } from './useUsersWithRoles';
import { N8N_WELCOME_WEBHOOK } from '@/lib/webhooks';

export interface CreateTeamMemberInput {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  roles: string[];
  areas: string[];
}

export interface UpdateTeamMemberInput {
  userId: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  areas: string[];
}

/**
 * Criação de team member via edge function `create-team-member` +
 * concessão de acessos de área + webhook de boas-vindas (fire-and-forget).
 *
 * Retorna `user_id` criado (via data da edge function). Chamar
 * diretamente com `.mutateAsync(input)` quando precisar do id no caller.
 */
export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const syncAreaAccess = useSyncUserAreaAccess();

  return useMutation({
    mutationFn: async (input: CreateTeamMemberInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('create-team-member', {
        body: input,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar usuário');
      }
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const newUserId = response.data?.user_id as string | undefined;

      // Grant area access (mesmo fluxo usado por update)
      const hasInternalRole =
        input.roles.includes('team_member') ||
        input.roles.includes('lider') ||
        input.roles.includes('sublider');

      if (hasInternalRole && input.areas.length > 0 && newUserId) {
        try {
          const selectedCategories = input.areas.flatMap(
            area => AREA_CATEGORIES_MAP[area as keyof typeof AREA_CATEGORIES_MAP]?.categories || []
          );
          await syncAreaAccess.mutateAsync({
            userId: newUserId,
            selectedCategories,
            allAreaCategories: ALL_AREA_CATEGORIES,
          });
        } catch (err) {
          console.error('[useCreateTeamMember] Falha ao sincronizar áreas:', err);
        }
      }

      // Webhook de boas-vindas (fire-and-forget — não bloqueia a mutation)
      const adminName =
        user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email || 'Admin';

      fetch(N8N_WELCOME_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'user_created',
          user_data: {
            first_name: input.first_name,
            last_name: input.last_name,
            email: input.email,
            roles: input.roles,
            areas: input.areas,
          },
          credentials: {
            email: input.email,
            temporary_password: 'trocarsenha',
          },
          platform: {
            login_url: 'https://psa-consultores.lovable.app/auth',
            name: 'PSA Consultores',
          },
          created_by: adminName,
          created_at: new Date().toISOString(),
        }),
      }).catch((err) =>
        console.error('[useCreateTeamMember] Webhook boas-vindas falhou:', err)
      );

      return { user_id: newUserId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Edição de team member: atualiza profile + sincroniza roles + sincroniza
 * acessos de área.
 */
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const syncAreaAccess = useSyncUserAreaAccess();

  return useMutation({
    mutationFn: async (input: UpdateTeamMemberInput) => {
      const { userId, first_name, last_name, email, roles, areas } = input;

      // 1. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_name, last_name, email })
        .eq('id', userId);
      if (profileError) throw profileError;

      // 2. Sync roles (diff → add + remove)
      const { data: currentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (rolesError) throw rolesError;

      const currentRoleNames = (currentRoles ?? []).map(r => r.role as string);
      const rolesToAdd = roles.filter(r => !currentRoleNames.includes(r));
      const rolesToRemove = currentRoleNames.filter(r => !roles.includes(r));

      for (const role of rolesToRemove) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role as AppRole);
        if (error) throw error;
      }
      for (const role of rolesToAdd) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: role as AppRole });
        if (error) throw error;
      }

      // 3. Sync area access
      const hasInternalRole =
        roles.includes('team_member') ||
        roles.includes('lider') ||
        roles.includes('sublider');

      if (hasInternalRole) {
        const selectedCategories = areas.flatMap(
          area => AREA_CATEGORIES_MAP[area as keyof typeof AREA_CATEGORIES_MAP]?.categories || []
        );
        await syncAreaAccess.mutateAsync({
          userId,
          selectedCategories,
          allAreaCategories: ALL_AREA_CATEGORIES,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar usuário');
    },
  });
}

/**
 * Exclusão de team member via edge function `delete-team-member`.
 */
export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('delete-team-member', {
        body: { user_id: userId },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Usuário excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    },
  });
}
