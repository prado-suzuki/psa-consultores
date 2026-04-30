import { useAuth } from '@/contexts/AuthContext';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current user has access to a specific page.
 *
 * Visibilidade por rota — separada da operação (RLS):
 * - Admin sempre tem acesso.
 * - Página não cadastrada em `page_permissions` → acesso livre (rota pública).
 * - Caso contrário, exige registro explícito em `user_page_access`.
 *
 * Não há mais bypass por categoria/papel: para conceder visibilidade,
 * crie a entrada em `user_page_access` (manualmente ou via fluxo de
 * provisionamento de membros).
 */
export function usePageAccess(pagePath: string) {
  const { user, isAdmin, loading: authLoading } = useAuth();

  // ATENÇÃO: a queryKey NÃO inclui `isAdmin` de propósito.
  // Quando supabase-js dispara TOKEN_REFRESHED em rajada (ex.: salvar muitas
  // linhas em loop nas abas F120/F130), o AuthContext re-emite estado e o
  // valor de `isAdmin` pode oscilar por uma fração de segundo. Se isAdmin
  // estiver na chave, cada oscilação cria uma nova entrada de cache vazia
  // (data === undefined), o gate cai no fallback `?? false` e mostra
  // "Acesso Negado" mesmo com o usuário autenticado e autorizado.
  // A checagem de admin acontece dentro do queryFn, não na chave.
  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['page-access', user?.id, pagePath],
    queryFn: async () => {
      if (!user) return false;
      if (isAdmin) return true;

      // Check if page exists in permissions table
      const { data: page } = await supabase
        .from('page_permissions')
        .select('id')
        .eq('page_path', pagePath)
        .maybeSingle();

      if (!page) return true; // Page not registered = free access

      // Check explicit user_page_access
      const { data: access } = await supabase
        .from('user_page_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_permission_id', page.id)
        .maybeSingle();

      return !!access;
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
    // Mantém o último valor durante refetch para evitar flash de "Acesso
    // Negado" quando o React Query recalcula em meio a re-renders disparados
    // por eventos de auth (TOKEN_REFRESHED, USER_UPDATED).
    placeholderData: keepPreviousData,
  });

  // Enquanto não temos resposta definitiva (data === undefined) mas o usuário
  // está autenticado, tratamos como "carregando" em vez de negar acesso.
  // Isso evita o falso negativo durante a janela entre `enabled` virar true
  // e o queryFn resolver.
  const stillResolving = !!user && hasAccess === undefined;

  return {
    hasAccess: hasAccess ?? false,
    isLoading: authLoading || isLoading || stillResolving,
  };
}
