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
        .select('id, page_path, page_name, page_description');

      if (fetchError) throw fetchError;

      const existingPagesMap = new Map(
        existingPages?.map(p => [p.page_path, p]) || []
      );

      // Find pages that need to be added
      const pagesToAdd = PROTECTED_PAGES.filter(
        page => !existingPagesMap.has(page.page_path)
      );

      // Find pages that need to be updated (name or description changed)
      const pagesToUpdate = PROTECTED_PAGES.filter(page => {
        const existing = existingPagesMap.get(page.page_path);
        return existing && (
          existing.page_name !== page.page_name ||
          existing.page_description !== page.page_description
        );
      });

      let added = 0;
      let updated = 0;

      // Insert new pages
      if (pagesToAdd.length > 0) {
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
        added = pagesToAdd.length;
      }

      // Update existing pages with changed names/descriptions
      for (const page of pagesToUpdate) {
        const existing = existingPagesMap.get(page.page_path);
        if (existing) {
          const { error: updateError } = await supabase
            .from('page_permissions')
            .update({
              page_name: page.page_name,
              page_description: page.page_description,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          updated++;
        }
      }

      return { added, updated };
    },
    onSuccess: (result) => {
      // Invalidate all permission-related caches
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      queryClient.invalidateQueries({ queryKey: ['page-access'] });

      if (result.added > 0 && result.updated > 0) {
        toast.success(`${result.added} página(s) adicionada(s), ${result.updated} atualizada(s)!`);
      } else if (result.added > 0) {
        toast.success(`${result.added} nova(s) página(s) adicionada(s)!`);
      } else if (result.updated > 0) {
        toast.success(`${result.updated} página(s) atualizada(s)!`);
      } else {
        toast.success('Lista de páginas já está atualizada');
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
