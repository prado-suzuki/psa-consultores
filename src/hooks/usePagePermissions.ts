import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PagePermission {
  id: string;
  page_path: string;
  page_name: string;
  page_description: string | null;
  category: string;
  is_active: boolean;
  requires_admin: boolean;
  requires_team_member: boolean;
}

/**
 * Lista todas as páginas permissionadas, ordenadas por categoria.
 */
export function usePagePermissions() {
  return useQuery({
    queryKey: ['page-permissions'],
    queryFn: async (): Promise<PagePermission[]> => {
      const { data, error } = await supabase
        .from('page_permissions')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return (data ?? []) as PagePermission[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Ativa/desativa uma página no sistema de permissões.
 */
export function useTogglePagePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('page_permissions')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      toast.success('Permissão atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão');
    },
  });
}
