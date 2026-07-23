import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseDomainBoardLayoutOptions {
  canDesempenho: boolean;
  userId?: string;
}

export function useDomainBoardLayout({
  canDesempenho,
  userId,
}: UseDomainBoardLayoutOptions) {
  const pendingDecisionsQuery = useQuery({
    queryKey: ['pending-decisions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('metas')
        .select('*', { count: 'exact', head: true })
        .eq('nivel', 'individual')
        .is('recomendacao_decisao', null)
        .eq('status', 'ativa');

      return count ?? 0;
    },
    enabled: canDesempenho === true,
    staleTime: 5 * 60 * 1000,
  });

  const evolutionBadgeQuery = useQuery({
    queryKey: ['minha-evolucao-badge', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data: unread } = await supabase
        .from('comentarios_avaliacao')
        .select('id')
        .eq('destinatario_id', userId)
        .eq('tipo', 'lider_para_membro')
        .eq('lido', false)
        .limit(1);

      if (unread?.length) return true;

      const { data: overdue } = await supabase
        .from('metas')
        .select('id')
        .eq('responsavel_id', userId)
        .eq('nivel', 'individual')
        .eq('status', 'ativa')
        .lt('prazo', new Date().toISOString().split('T')[0])
        .lt('progresso_atual', 100)
        .limit(1);

      return (overdue?.length ?? 0) > 0;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    pendingDecisions: pendingDecisionsQuery.data ?? 0,
    hasUnreadOrOverdue: evolutionBadgeQuery.data ?? false,
  };
}
