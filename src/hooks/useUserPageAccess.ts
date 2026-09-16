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

/** Teto de linhas por resposta do PostgREST. Ver `useUserPageAccess`. */
const PAGINA_POSTGREST = 1000;

/**
 * Lista registros de user_page_access.
 *
 * - Sem argumento: traz tudo, PAGINANDO (ver abaixo).
 * - Com `userId` (string): filtra server-side e devolve só as linhas daquele usuário.
 * - Com `null`: query desabilitada (útil quando nenhum usuário está selecionado).
 *
 * ## Por que o `while`, e não um `select` só
 *
 * O PostgREST corta a resposta em 1000 linhas e **não avisa**: vem um array de
 * 1000, sem erro, sem flag. Em 14/09/2026 produção tinha **1494** linhas nesta
 * tabela, e a busca global devolvia 1000 — o card"Permissões Customizadas" do
 * Controle de Acessos exibia, com toda a confiança, o TETO DA PÁGINA como se
 * fosse a contagem. Um terço dos vínculos era invisível para qualquer tela que
 * lesse daqui sem `userId`.
 *
 * A assinatura da função sempre prometeu"traz tudo"; o docstring anterior
 * apenas registrava o corte como"atenção". Agora ela cumpre a promessa: pede de
 * mil em mil até a página vir curta. Duas viagens hoje, três quando passar de
 * 2000 — e nenhuma tela precisa saber disso.
 *
 * Quem lê de um usuário só continua vindo por `.eq('user_id', ...)`, numa
 * viagem, porque ninguém tem mil páginas.
 */
export function useUserPageAccess(userId?: string | null) {
  const enabled = userId !== null;
  return useQuery({
    queryKey: ['user-page-access', userId ?? 'all'],
    queryFn: async (): Promise<UserPageAccessRecord[]> => {
      const linhas: UserPageAccessRecord[] = [];
      for (let inicio = 0; ; inicio += PAGINA_POSTGREST) {
        let query = supabase
          .from('user_page_access')
          .select('*')
          .order('id')
          .range(inicio, inicio + PAGINA_POSTGREST - 1);
        if (typeof userId === 'string') query = query.eq('user_id', userId);

        const { data, error } = await query;
        if (error) throw error;

        const pagina = (data ?? []) as UserPageAccessRecord[];
        linhas.push(...pagina);
        // Página curta é a última. `order('id')` está aqui para o recorte ser
        // estável entre as viagens — sem ordem explícita o Postgres não promete
        // a mesma sequência, e uma linha poderia vir duas vezes ou nenhuma.
        if (pagina.length < PAGINA_POSTGREST) break;
      }
      return linhas;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

/*
 * `useGrantPageAccess` e `useRevokePageAccess` saíram em 14/09/2026: conceder e
 * revogar UMA página de cada vez não tinha chamador nenhum, e não é assim que a
 * tela funciona — a árvore de permissões marca um nó e escreve a subárvore
 * inteira mais os ancestrais, que é o que `useBulkUpdatePageAccess`, logo
 * abaixo, faz numa ida só. Os dois eram o desenho anterior, mantido exportado.
 *
 * Quem precisar de uma página só: `useBulkUpdatePageAccess` com uma lista de um
 * item. Um par novo de mutações repetiria as quatro invalidações de cache que o
 * de lote já faz — e duas listas de invalidação para a mesma escrita é o tipo
 * de coisa que diverge sem ninguém notar.
 */

/**
 * Aplica concessões e revogações em lote para um único usuário em uma só transação.
 *
 * Usado pela árvore hierárquica de permissões para propagar o clique em um nó
 * (concede/revoga vários page_permission_ids de uma vez) sem disparar N toasts.
 */
export function useBulkUpdatePageAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      grantIds,
      revokeIds,
    }: {
      userId: string;
      grantIds: string[];
      revokeIds: string[];
    }) => {
      if (revokeIds.length > 0) {
        const { error } = await supabase
          .from('user_page_access')
          .delete()
          .eq('user_id', userId)
          .in('page_permission_id', revokeIds);
        if (error) throw error;
      }

      if (grantIds.length > 0) {
        const { error } = await supabase.from('user_page_access').upsert(
          grantIds.map((pageId) => ({
            user_id: userId,
            page_permission_id: pageId,
            granted_by: user?.id,
          })),
          { onConflict: 'user_id,page_permission_id', ignoreDuplicates: true }
        );
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      queryClient.invalidateQueries({ queryKey: ['page-access'] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-categories'] });
      queryClient.invalidateQueries({ queryKey: ['can-assign-tickets'] });
      const granted = variables.grantIds.length;
      const revoked = variables.revokeIds.length;
      if (granted > 0 && revoked === 0) toast.success(granted === 1 ? 'Acesso concedido' : `${granted} acessos concedidos`);
      else if (revoked > 0 && granted === 0) toast.success(revoked === 1 ? 'Acesso revogado' : `${revoked} acessos revogados`);
      else toast.success('Acessos atualizados');
    },
    onError: () => {
      toast.error('Erro ao atualizar acessos');
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
      queryClient.invalidateQueries({ queryKey: ['page-access'] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-categories'] });
      queryClient.invalidateQueries({ queryKey: ['can-assign-tickets'] });
    },
  });
}
