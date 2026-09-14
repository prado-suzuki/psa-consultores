import { useState } from 'react';

import type { TarefaEmConclusao } from '@/components/equipe/ConclusaoComHorasDialog';

interface ConclusaoPendente extends TarefaEmConclusao {
  aplicar: (horas: number) => Promise<void>;
}

/**
 * Estado do diálogo que cobra as horas antes de concluir uma tarefa.
 *
 * Fica num hook porque o Kanban e o detalhe da sprint chamam o mesmo fluxo por
 * caminhos diferentes (botão do cartão, checkbox de subtarefa, select da lista):
 * cada tela guarda o que fazer depois em `aplicar` e o diálogo só devolve o número.
 */
export function useConclusaoComHoras() {
  const [pendente, setPendente] = useState<ConclusaoPendente | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pedirHoras = (tarefa: TarefaEmConclusao, aplicar: (horas: number) => Promise<void>) => {
    setPendente({ ...tarefa, aplicar });
  };

  const cancelar = () => setPendente(null);

  const confirmar = async (horas: number) => {
    if (!pendente) return;
    setSalvando(true);
    try {
      await pendente.aplicar(horas);
      setPendente(null);
    } finally {
      setSalvando(false);
    }
  };

  return { pendente, salvando, pedirHoras, cancelar, confirmar };
}
