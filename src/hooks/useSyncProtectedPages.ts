import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PROTECTED_PAGES } from '@/config/protectedPages';
import { toast } from 'sonner';

/**
 * Hook para sincronizar as páginas protegidas definidas no código com a tabela page_permissions.
 * Insere páginas novas e atualiza metadados de páginas existentes quando divergem
 * do config (categoria, nome, descrição, requires_admin, requires_team_member).
 * `is_active` é preservado por ser controlado pela UI, não pelo código.
 */
export function useSyncProtectedPages() {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: existingPages, error: fetchError } = await supabase
        .from('page_permissions')
        .select('id, page_path, page_name, page_description, category, requires_admin, requires_team_member');

      if (fetchError) throw fetchError;

      const existingByPath = new Map(
        (existingPages ?? []).map((p) => [p.page_path, p])
      );

      const pagesToAdd = PROTECTED_PAGES.filter(
        (page) => !existingByPath.has(page.page_path)
      );

      const pagesToUpdate = PROTECTED_PAGES.flatMap((page) => {
        const existing = existingByPath.get(page.page_path);
        if (!existing) return [];
        const drifted =
          existing.page_name !== page.page_name ||
          existing.page_description !== page.page_description ||
          existing.category !== page.category ||
          existing.requires_admin !== page.requires_admin ||
          existing.requires_team_member !== page.requires_team_member;
        return drifted ? [{ id: existing.id, page }] : [];
      });

      if (pagesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('page_permissions')
          .insert(
            pagesToAdd.map((page) => ({
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
      }

      for (const { id, page } of pagesToUpdate) {
        const { error: updateError } = await supabase
          .from('page_permissions')
          .update({
            page_name: page.page_name,
            page_description: page.page_description,
            category: page.category,
            requires_admin: page.requires_admin,
            requires_team_member: page.requires_team_member,
          })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      return { added: pagesToAdd.length, updated: pagesToUpdate.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      queryClient.invalidateQueries({ queryKey: ['page-access'] });

      if (result.added > 0 && result.updated > 0) {
        toast.success(
          `${result.added} nova(s) e ${result.updated} atualizada(s)`
        );
      } else if (result.added > 0) {
        toast.success(`${result.added} nova(s) página(s) adicionada(s)!`);
      } else if (result.updated > 0) {
        toast.success(`${result.updated} página(s) atualizada(s)`);
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
