import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { paraRoleDoBanco, type AppRole } from './useUsersWithRoles';

/**
 * Adiciona uma role para um usuário em `user_roles`.
 *
 * Usado em páginas de gestão rápida de roles (ex: `/equipe/usuarios`).
 * Para sincronização em lote (criar/editar usuário com múltiplas roles +
 * áreas) preferir o fluxo em `useUserPageAccess.useSyncUserAreaAccess`.
 */
export function useAddUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole | string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: paraRoleDoBanco(role) });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Acesso concedido!');
    },
    onError: () => {
      toast.error('Erro ao conceder acesso');
    },
  });
}

/**
 * Remove uma role de um usuário em `user_roles`.
 */
export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole | string }) => {
      const { data: sample } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', paraRoleDoBanco(role))
        .maybeSingle();
      if (sample?.id) {
        await assertCanPerform('user_roles', 'delete', sample.id);
      }
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', paraRoleDoBanco(role));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Acesso removido!');
    },
    onError: () => {
      toast.error('Erro ao remover acesso');
    },
  });
}
