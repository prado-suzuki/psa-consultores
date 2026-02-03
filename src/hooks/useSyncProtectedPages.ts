import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PROTECTED_PAGES } from '@/config/protectedPages';
import { toast } from 'sonner';

/**
 * Hook para sincronizar as páginas protegidas definidas no código com a tabela page_permissions.
 * Adiciona páginas novas que ainda não existem no banco.
 */
export function useSyncProtectedPages() {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      // Get existing pages from database
      const { data: existingPages, error: fetchError } = await supabase
        .from('page_permissions')
        .select('page_path');

      if (fetchError) throw fetchError;

      const existingPaths = new Set(existingPages?.map(p => p.page_path) || []);

      // Find pages that need to be added
      const pagesToAdd = PROTECTED_PAGES.filter(
        page => !existingPaths.has(page.page_path)
      );

      if (pagesToAdd.length === 0) {
        return { added: 0 };
      }

      // Insert new pages
      const { error: insertError } = await supabase
        .from('page_permissions')
        .insert(
          pagesToAdd.map(page => ({
            page_path: page.page_path,
            page_name: page.page_name,
            page_description: page.page_description,
            category: page.category,
            requires_admin: page.requires_admin,
            requires_team_member: page.requires_team_member,
            is_active: true,
          }))
        );

      if (insertError) throw insertError;

      return { added: pagesToAdd.length };
    },
    onSuccess: (result) => {
      // Invalidate all permission-related caches
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      queryClient.invalidateQueries({ queryKey: ['page-access'] });

      if (result.added > 0) {
        toast.success(`${result.added} nova(s) página(s) adicionada(s)!`);
      } else {
        toast.success('Lista de páginas atualizada');
      }
    },
    onError: (error) => {
      console.error('Error syncing pages:', error);
      toast.error('Erro ao sincronizar páginas');
    },
  });

  return {
    syncPages: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
