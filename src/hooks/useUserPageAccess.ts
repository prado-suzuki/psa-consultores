import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserPageAccessRecord {
  id: string;
  user_id: string;
  page_permission_id: string;
  granted_at: string;
}

/**
 * Lista todos os registros de user_page_access (todos os usuários).
 * Usado no painel de administração para exibir quem tem acesso a quê.
 */
export function useUserPageAccess() {
  return useQuery({
    queryKey: ['user-page-access'],
    queryFn: async (): Promise<UserPageAccessRecord[]> => {
      const { data, error } = await supabase
        .from('user_page_access')
        .select('*');

      if (error) throw error;
      return (data ?? []) as UserPageAccessRecord[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Concede acesso a uma página para um usuário.
 */
export function useGrantPageAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, pageId }: { userId: string; pageId: string }) => {
      const { error } = await supabase
        .from('user_page_access')
        .insert({
          user_id: userId,
          page_permission_id: pageId,
          granted_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Acesso concedido');
    },
    onError: () => {
      toast.error('Erro ao conceder acesso');
    },
  });
}

/**
 * Revoga acesso de uma página para um usuário.
 */
export function useRevokePageAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, pageId }: { userId: string; pageId: string }) => {
      const { error } = await supabase
        .from('user_page_access')
        .delete()
        .eq('user_id', userId)
        .eq('page_permission_id', pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Acesso revogado');
    },
    onError: () => {
      toast.error('Erro ao revogar acesso');
    },
  });
}

/**
 * Sincroniza o conjunto de acessos de um usuário com base nas áreas selecionadas.
 *
 * Comportamento:
 * - Concede acesso a todas as páginas das categorias marcadas.
 * - Revoga acesso das páginas de categorias DE ÁREAS que foram desmarcadas.
 * - Não mexe em páginas fora do universo de áreas (ex: páginas `geral`, `fixos`).
 *
 * Usado ao criar/editar um usuário no form de controle de acessos.
 */
export function useSyncUserAreaAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      selectedCategories,
      allAreaCategories,
    }: {
      userId: string;
      selectedCategories: string[];
      allAreaCategories: string[];
    }) => {
      const { data: allPagePerms, error: pagesError } = await supabase
        .from('page_permissions')
        .select('id, category');

      if (pagesError) throw pagesError;
      if (!allPagePerms) return;

      const shouldHaveAccess = new Set(
        allPagePerms.filter(p => selectedCategories.includes(p.category)).map(p => p.id)
      );

      const allAreaPageIds = new Set(
        allPagePerms.filter(p => allAreaCategories.includes(p.category)).map(p => p.id)
      );

      const { data: currentAccess, error: accessError } = await supabase
        .from('user_page_access')
        .select('page_permission_id')
        .eq('user_id', userId);

      if (accessError) throw accessError;

      const currentAccessIds = new Set((currentAccess ?? []).map(a => a.page_permission_id));

      const toGrant = [...shouldHaveAccess].filter(id => !currentAccessIds.has(id));
      if (toGrant.length > 0) {
        const { error: insertError } = await supabase.from('user_page_access').insert(
          toGrant.map(pageId => ({
            user_id: userId,
            page_permission_id: pageId,
            granted_by: user?.id,
          }))
        );
        if (insertError) throw insertError;
      }

      const toRevoke = [...allAreaPageIds].filter(
        id => !shouldHaveAccess.has(id) && currentAccessIds.has(id)
      );
      if (toRevoke.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_page_access')
          .delete()
          .eq('user_id', userId)
          .in('page_permission_id', toRevoke);
        if (deleteError) throw deleteError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
    },
  });
}
