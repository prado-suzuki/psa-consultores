import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TarefaConcluida } from '@/lib/boardExecutivo';

const STALE_TIME = 5 * 60 * 1000;

interface UseDomainBoardDashboardOptions {
  /** Início da janela de análise (ISO). Vem do MESMO range usado nos projetos,
   *  para que gráfico e KPIs falem do período que o filtro selecionou. */
  desdeISO: string;
}

/**
 * Tarefas concluídas na janela selecionada — alimenta a série "entregas por
 * área" e o resumo por área da visão executiva.
 *
 * A janela é parâmetro (antes era fixa em 3 meses, ignorando o filtro de
 * Período da própria tela) e entra na queryKey para não servir o cache de
 * outro período. A economia/ROI mudou de casa: vive em `useDomainMelhoriasRoi`,
 * compartilhada com o painel Operacional.
 */
export function useDomainBoardDashboard({ desdeISO }: UseDomainBoardDashboardOptions) {
  const tarefasConcluidasQuery = useQuery<TarefaConcluida[]>({
    queryKey: ['board-tarefas-concluidas', desdeISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_tasks')
        // `due_date` entra para a pontualidade de ENTREGA (mesma medida que a
        // área Digital usa), não a de projeto.
        .select('updated_at, project_id, due_date')
        .eq('status', 'done')
        .gte('updated_at', desdeISO);

      if (error) throw error;
      return (data ?? []) as TarefaConcluida[];
    },
    enabled: !!desdeISO,
    staleTime: STALE_TIME,
  });

  return { tarefasConcluidasQuery };
}
