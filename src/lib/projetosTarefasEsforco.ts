/**
 * Estado do esforço (horas) de uma tarefa para a coluna "Esforço" da árvore de
 * Projetos & Tarefas.
 *
 * O caso que a coluna existe para revelar: tarefa marcada como **concluída sem
 * horas realizadas**. Hoje isso só aparece semanas depois, quando a auditoria de
 * produtividade soma zero para quem entregou o trabalho. Na lista, a tarefa
 * concluída sem apontamento fica visível ao lado do responsável.
 */

import type { OrgTask } from '@/hooks/useOrgTasks';
import { formatarHoras } from '@/lib/horasApontamento';

export type EsforcoTarefaEstado =
  /** Concluída, mas sem horas realizadas — o alerta da coluna. */
  | 'sem_apontamento'
  /** Tem horas realizadas apontadas. */
  | 'apontado'
  /** Só tem estimativa; ainda não foi apontado (e ainda não concluiu). */
  | 'estimado'
  /** Nenhuma hora registrada e nada a cobrar ainda. */
  | 'vazio';

export interface EsforcoTarefa {
  estado: EsforcoTarefaEstado;
  /** Texto curto da célula. */
  label: string;
  /** Frase completa para o `title` (a célula é estreita e trunca). */
  descricao: string;
}

/** Só o que o cálculo de esforço precisa — facilita testar e reusar. */
export type TarefaComEsforco = Pick<OrgTask, 'status' | 'estimated_hours' | 'actual_hours'>;

export interface EsforcoAgregado {
  /** Tarefas com status `done` e sem horas realizadas. */
  concluidasSemHoras: number;
  /** Soma das horas realizadas apontadas. */
  horasRealizadas: number;
}

/** Horas válidas para exibição: `null`, zero e lixo contam como "não apontado". */
function horasPositivas(valor: number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export function esforcoDaTarefa(task: TarefaComEsforco): EsforcoTarefa {
  const realizadas = horasPositivas(task.actual_hours);
  const estimadas = horasPositivas(task.estimated_hours);

  if (task.status === 'done' && realizadas === null) {
    return {
      estado: 'sem_apontamento',
      label: 'Sem horas',
      descricao: 'Tarefa concluída sem horas realizadas — peça o apontamento ao responsável.',
    };
  }

  if (realizadas !== null) {
    return estimadas !== null
      ? {
          estado: 'apontado',
          label: `${formatarHoras(realizadas)}h / ${formatarHoras(estimadas)}h`,
          descricao: `${formatarHoras(realizadas)}h realizadas de ${formatarHoras(estimadas)}h estimadas`,
        }
      : {
          estado: 'apontado',
          label: `${formatarHoras(realizadas)}h`,
          descricao: `${formatarHoras(realizadas)}h realizadas (sem estimativa)`,
        };
  }

  if (estimadas !== null) {
    return {
      estado: 'estimado',
      label: `${formatarHoras(estimadas)}h est.`,
      descricao: `${formatarHoras(estimadas)}h estimadas, nenhuma hora apontada`,
    };
  }

  return { estado: 'vazio', label: '—', descricao: 'Sem horas estimadas ou realizadas' };
}

export function agregarEsforco(tasks: TarefaComEsforco[]): EsforcoAgregado {
  return tasks.reduce<EsforcoAgregado>(
    (total, task) => {
      const realizadas = horasPositivas(task.actual_hours);
      if (task.status === 'done' && realizadas === null) total.concluidasSemHoras += 1;
      if (realizadas !== null) total.horasRealizadas += realizadas;
      return total;
    },
    { concluidasSemHoras: 0, horasRealizadas: 0 },
  );
}

export function somarEsforco(partes: EsforcoAgregado[]): EsforcoAgregado {
  return partes.reduce<EsforcoAgregado>(
    (total, parte) => ({
      concluidasSemHoras: total.concluidasSemHoras + parte.concluidasSemHoras,
      horasRealizadas: total.horasRealizadas + parte.horasRealizadas,
    }),
    { concluidasSemHoras: 0, horasRealizadas: 0 },
  );
}

/**
 * Resumo das linhas agregadas (OS e projeto). A pendência tem precedência sobre
 * o total de horas: o objetivo da coluna é apontar onde falta apontamento, sem
 * precisar expandir a árvore inteira para descobrir.
 */
export function resumoEsforco(esforco: EsforcoAgregado): EsforcoTarefa {
  if (esforco.concluidasSemHoras > 0) {
    const plural = esforco.concluidasSemHoras === 1 ? 'concluída sem horas' : 'concluídas sem horas';
    return {
      estado: 'sem_apontamento',
      label: `${esforco.concluidasSemHoras} sem horas`,
      descricao: `${esforco.concluidasSemHoras} tarefa(s) ${plural} realizadas apontadas`,
    };
  }
  if (esforco.horasRealizadas > 0) {
    return {
      estado: 'apontado',
      label: `${formatarHoras(esforco.horasRealizadas)}h`,
      descricao: `${formatarHoras(esforco.horasRealizadas)}h realizadas no total`,
    };
  }
  return { estado: 'vazio', label: '—', descricao: 'Nenhuma hora realizada apontada' };
}
