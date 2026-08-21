/**
 * Horas realizadas na conclusão de uma tarefa (`org_tasks.actual_hours`).
 *
 * A regra é uma só, e vale para todos os caminhos que marcam `done` — modal,
 * arrastar no kanban, checkbox de subtarefa e os selects de status da tabela,
 * da visão Hoje e da árvore de Projetos & Tarefas: concluir sem hora não passa.
 * Por isso ela mora aqui e é aplicada em `useUpdateOrgTask`, o único ponto por
 * onde todos eles passam. Antes disso a obrigatoriedade existia só no zod do
 * TaskModal, e metade das conclusões entrava pelos atalhos sem hora nenhuma.
 *
 * Zero e nulo são a mesma coisa: "não apontado". O formulário grava 0 quando o
 * campo fica vazio (`z.coerce.number()` sobre '' — ver `orgTaskForm.ts`), então
 * olhar só para o nulo deixaria metade dos casos escapar.
 */

export const MENSAGEM_HORAS_OBRIGATORIAS =
  'Informe as horas realizadas para concluir a tarefa.';

/**
 * Horas válidas, ou `null`. Aceita número e string com ponto ou vírgula, porque
 * o valor chega do input digitado à mão.
 */
export function horasApontadas(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export function temHorasApontadas(valor: unknown): boolean {
  return horasApontadas(valor) !== null;
}

/**
 * A tarefa precisa passar pelo campo de horas antes de virar `done`?
 *
 * Falso para quem já tem apontamento: nesse caso o atalho conclui direto, sem
 * abrir diálogo. Falso também para quem já está concluída — mudar o status de
 * uma tarefa já concluída não é concluir de novo.
 */
export function precisaApontarHoras(task: {
  status: string;
  actual_hours?: number | null;
}): boolean {
  return task.status !== 'done' && !temHorasApontadas(task.actual_hours);
}
