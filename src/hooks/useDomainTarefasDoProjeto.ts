import { useQuery } from '@tanstack/react-query';

import type { OrgTaskStatus } from '@/hooks/useOrgTasks';
import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/queryClient';

/**
 * As tarefas de um projeto, no formato de quem só precisa ESCOLHER uma.
 *
 * Existe separado do `useOrgTasks` de propósito: aquele traz a linha inteira
 * mais projeto, cliente e contribuinte embutidos, porque alimenta o quadro e o
 * modal da tarefa. Aqui só se quer o rótulo de uma lista — três colunas, uma ida
 * ao banco, cache próprio que não briga com o do quadro.
 *
 * O recorte de quem vê o quê é RLS (`rls_org_tasks_select`): tarefa fora do
 * alcance da pessoa não volta, e por isso não aparece como destino possível.
 *
 * Tarefa concluída CONTINUA na lista: comentar depois de entregue é o caso
 * normal de "chegou a resposta do cliente sobre aquilo que a gente fechou".
 */

export const tarefasDoProjetoQueryKey = (projetoId: string | null) =>
  ['tarefas-do-projeto', projetoId] as const;

export interface TarefaParaEscolha {
  id: string;
  title: string;
  status: OrgTaskStatus;
}

export function useDomainTarefasDoProjeto(projetoId: string | null) {
  const query = useQuery<TarefaParaEscolha[]>({
    queryKey: tarefasDoProjetoQueryKey(projetoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_tasks')
        .select('id, title, status')
        .eq('project_id', projetoId!)
        // Mais recente primeiro: a conversa nova quase sempre é sobre o que
        // acabou de entrar, e a busca da lista resolve o resto.
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projetoId,
    // A lista de tarefas de um projeto muda bem mais devagar do que se escolhe
    // destino de comentário.
    staleTime: STALE_TIMES.SHORT,
  });

  return {
    tarefas: query.data ?? [],
    isLoading: query.isLoading,
  };
}
