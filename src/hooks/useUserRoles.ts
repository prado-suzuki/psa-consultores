import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppRole } from './useUsersWithRoles';

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
        .insert({ user_id: userId, role: role as AppRole });
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
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as AppRole);
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
