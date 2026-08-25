import { useState } from 'react';

import type { OrgTask, OrgTaskStatus } from '@/hooks/useOrgTasks';

/** Status cuja entrada exige detalhamento (e revisor, no caso de 'review'). */
export type TaskTransitionStatus = 'review' | 'em_ajuste';

export const exigeDetalheDeTransicao = (
  status: OrgTaskStatus,
): status is TaskTransitionStatus => status === 'review' || status === 'em_ajuste';

/**
 * Estado do diálogo de transição de revisão, para as telas que trocam o status
 * por atalho — arrastar no quadro e os selects da tabela e da árvore de
 * Projetos & Tarefas.
 *
 * Mandar para revisão exige revisor e o que revisar; devolver para ajuste exige
 * o que ajustar. Sem isso a tarefa chegava à coluna de revisão sem revisor e sem
 * uma linha sequer dizendo o que revisar — só o quadro pedia.
 *
 * `pedirDetalhes` devolve `true` quando o status não precisa de detalhamento e o
 * chamador segue com a troca direto; `false` quando o diálogo assumiu o fluxo
 * (é ele quem grava). Renderize o `TaskStatusTransitionDialog` com
 * `transicaoPendente`/`fechar`.
 */
export function useTaskStatusTransition() {
  const [transicaoPendente, setTransicaoPendente] = useState<{
    task: OrgTask;
    status: TaskTransitionStatus;
  } | null>(null);

  return {
    transicaoPendente,
    pedirDetalhes: (task: OrgTask, status: OrgTaskStatus) => {
      if (!exigeDetalheDeTransicao(status)) return true;
      setTransicaoPendente({ task, status });
      return false;
    },
    fechar: () => setTransicaoPendente(null),
  };
}
