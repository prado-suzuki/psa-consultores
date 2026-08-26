import { useState } from 'react';

import type { OrgTask } from '@/hooks/useOrgTasks';
import { precisaApontarHoras } from '@/lib/orgTaskHours';

/**
 * Estado do diálogo de apontamento, para as telas que concluem por atalho —
 * arrastar no kanban, checkbox de subtarefa e os selects de status da tabela, da
 * visão Hoje e da árvore de Projetos & Tarefas.
 *
 * `pedirHoras` devolve `true` quando a tarefa já tem apontamento e o chamador
 * pode seguir com a troca de status direto; `false` quando o diálogo assumiu o
 * fluxo. Renderize o `TaskCompletionHoursDialog` com `taskPendente`/`fechar`.
 */
export function useTaskCompletionHours() {
  const [taskPendente, setTaskPendente] = useState<OrgTask | null>(null);

  return {
    taskPendente,
    pedirHoras: (task: OrgTask) => {
      if (!precisaApontarHoras(task)) return true;
      setTaskPendente(task);
      return false;
    },
    fechar: () => setTaskPendente(null),
  };
}
