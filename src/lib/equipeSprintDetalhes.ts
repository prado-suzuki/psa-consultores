import {
  addDays,
  differenceInCalendarDays,
  differenceInDays,
  format,
} from 'date-fns';
import type {
  SprintDetalhesDeliverable as Deliverable,
  SprintDetalhesMetric as Metric,
  SprintDetalhesProcess as Process,
  SprintDetalhesProfile as Profile,
  SprintDetalhesProject as Project,
  SprintDetalhesSprint as Sprint,
} from '@/hooks/useDomainEquipeSprintDetalhes';
import { isPastBrazil, isTodayBrazil, isTomorrowBrazil, parseDate } from '@/lib/dateUtils';
import { tarefaRichTextToPlain } from '@/lib/tarefaRichText';

export interface SprintFilters {
  responsible: string;
  status: string;
  date: string;
}

export function matchesSprintFilter(deliverable: Deliverable, filters: SprintFilters) {
  if (filters.responsible !== 'all' && deliverable.assigned_to !== filters.responsible)
    return false;
  if (filters.status !== 'all' && deliverable.status !== filters.status) return false;
  if (filters.date === 'today')
    return isTodayBrazil(parseDate(deliverable.due_date)) && deliverable.status !== 'completed';
  if (filters.date === 'tomorrow')
    return isTomorrowBrazil(parseDate(deliverable.due_date)) && deliverable.status !== 'completed';
  if (filters.date === 'overdue') {
    const dueDate = parseDate(deliverable.due_date);
    return isPastBrazil(dueDate) && !isTodayBrazil(dueDate) && deliverable.status !== 'completed';
  }
  return true;
}

export function filterDeliverables(deliverables: Deliverable[], filters: SprintFilters) {
  const directMatches = new Set(
    deliverables.filter((item) => matchesSprintFilter(item, filters)).map((item) => item.id),
  );
  const visibleParents = new Set(
    deliverables
      .filter((item) => item.parent_id && directMatches.has(item.id))
      .map((item) => item.parent_id as string),
  );
  return deliverables.filter((item) => directMatches.has(item.id) || visibleParents.has(item.id));
}

export function buildTaskHierarchy(deliverables: Deliverable[]) {
  const children: Record<string, Deliverable[]> = {};
  deliverables
    .filter((item) => item.parent_id)
    .forEach((item) => {
      const parentId = item.parent_id as string;
      (children[parentId] ??= []).push(item);
    });
  Object.values(children).forEach((items) =>
    items.sort((a, b) =>
      a.task_code && b.task_code
        ? a.task_code.localeCompare(b.task_code, undefined, { numeric: true })
        : 0,
    ),
  );
  // Raiz = sem mãe OU cuja mãe não está na lista. Sem o segundo caso, uma subtarefa cuja mãe ficou
  // fora da sprint não é raiz e não tem onde ser pendurada: desaparece da tela mesmo existindo no
  // banco. O Kanban já trata assim (buildEquipeKanbanHierarchy) e o move entre sprints torna o
  // caso alcançável, então as duas telas passam a concordar.
  const presentIds = new Set(deliverables.map((item) => item.id));
  return deliverables
    .filter((item) => !item.parent_id || !presentIds.has(item.parent_id))
    .map((parent) => ({
      ...parent,
      subtasks: children[parent.id] ?? [],
      subtaskCount: children[parent.id]?.length ?? 0,
      completedSubtasks:
        children[parent.id]?.filter((item) => item.status === 'completed').length ?? 0,
      totalHours:
        (parent.estimated_hours ?? 0) +
        (children[parent.id]?.reduce((sum, item) => sum + (item.estimated_hours ?? 0), 0) ?? 0),
    }));
}

// ---------------------------------------------------------------------------
// Move de tarefa entre sprints
// ---------------------------------------------------------------------------

export interface DeliverableSubtree {
  rootId: string;
  descendantIds: string[];
}

/**
 * Ids da raiz e de todos os descendentes dela, em largura.
 *
 * O move grava em duas instruções: primeiro a raiz (com `parent_id` já resolvido) e depois os
 * descendentes de uma vez. Por isso a raiz vem separada dos filhos, e não em uma lista só: trocar
 * a ordem cria, na janela entre as duas gravações, filho na sprint nova apontando para mãe na
 * sprint antiga, que é o estado em que excluir a sprint antiga apaga a tarefa da nova.
 *
 * `visited` protege contra ciclo de `parent_id`. O banco não impede ciclo, e sem isso a fila
 * rodaria para sempre.
 */
export function collectDeliverableSubtree(
  deliverables: Pick<Deliverable, 'id' | 'parent_id'>[],
  rootId: string,
): DeliverableSubtree {
  const childrenByParent = new Map<string, string[]>();
  for (const item of deliverables) {
    if (!item.parent_id) continue;
    const list = childrenByParent.get(item.parent_id) ?? [];
    list.push(item.id);
    childrenByParent.set(item.parent_id, list);
  }

  const descendantIds: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (visited.has(childId)) continue;
      visited.add(childId);
      descendantIds.push(childId);
      queue.push(childId);
    }
  }

  return { rootId, descendantIds };
}

export interface SprintDateWindow {
  start_date: string;
  end_date: string;
}

/**
 * Encaixa as datas da tarefa na janela da sprint de destino, preservando a duração quando ela cabe.
 *
 * Sem isso a tarefa movida para uma sprint futura nasce vencida em vermelho, e movida para uma
 * sprint passada nasce fora do gráfico. Datas ISO (YYYY-MM-DD) comparam corretamente como string,
 * então aqui não há conversão de fuso: só aritmética de dias, via `parseDate`, que já monta a data
 * na meia-noite local.
 */
export function clampDatesToSprint(
  task: Pick<Deliverable, 'start_date' | 'due_date'>,
  sprint: SprintDateWindow,
): { start_date: string | null; due_date: string } {
  const windowStart = sprint.start_date;
  const windowEnd = sprint.end_date;
  const start = task.start_date;
  const due = task.due_date;

  // Janela inconsistente (fim antes do início): não inventa data, devolve o que já existia.
  if (windowEnd < windowStart) return { start_date: start, due_date: due };

  const insideWindow = (iso: string) => iso >= windowStart && iso <= windowEnd;
  if (insideWindow(due) && (!start || insideWindow(start))) {
    return { start_date: start, due_date: due };
  }

  // differenceInCalendarDays, não differenceInDays: aqui só existe data, sem hora. Contar períodos
  // de 24h daria um dia de erro em fuso com horário de verão.
  const durationDays =
    start && start <= due ? differenceInCalendarDays(parseDate(due), parseDate(start)) : 0;
  const shiftDays = (iso: string, days: number) =>
    format(addDays(parseDate(iso), days), 'yyyy-MM-dd');

  let nextDue = due;
  if (due < windowStart) {
    const keepingDuration = shiftDays(windowStart, durationDays);
    nextDue = keepingDuration > windowEnd ? windowEnd : keepingDuration;
  } else if (due > windowEnd) {
    nextDue = windowEnd;
  }

  let nextStart = start;
  if (nextStart) {
    const candidate = durationDays > 0 ? shiftDays(nextDue, -durationDays) : nextDue;
    nextStart = candidate < windowStart ? windowStart : candidate;
    if (nextStart > nextDue) nextStart = nextDue;
  }

  return { start_date: nextStart, due_date: nextDue };
}

export interface MoveEffectInput {
  targetSprintName: string;
  /** Título da mãe atual, apenas quando a tarefa vai se desprender dela. */
  detachingFromParentTitle: string | null;
  descendantCount: number;
  currentDates: { start_date: string | null; due_date: string };
  nextDates: { start_date: string | null; due_date: string };
  crossProject: boolean;
  /** Alguma subtarefa que vai junto tem data fora da janela da sprint de destino. */
  adjustsSubtaskDates?: boolean;
}

/**
 * Frases do diálogo de confirmação, uma por efeito. O usuário precisa ler o que vai acontecer
 * antes de gravar, porque o move muda a natureza da tarefa (subtarefa vira tarefa principal) e
 * pode mexer em datas.
 */
export function describeMoveEffect(input: MoveEffectInput): string[] {
  const human = (iso: string) => format(parseDate(iso), 'dd/MM/yyyy');
  const lines: string[] = [`A tarefa passa para a sprint "${input.targetSprintName}".`];

  if (input.detachingFromParentTitle) {
    lines.push(
      `Esta subtarefa deixa de ser subtarefa de "${input.detachingFromParentTitle}" e passa a ser tarefa principal na sprint de destino.`,
    );
  }

  if (input.descendantCount === 1) {
    lines.push('1 subtarefa será movida junto.');
  } else if (input.descendantCount > 1) {
    lines.push(`${input.descendantCount} subtarefas serão movidas junto.`);
  }

  if (input.adjustsSubtaskDates) {
    lines.push('As datas das subtarefas também são encaixadas na janela da sprint de destino.');
  }

  if (input.nextDates.due_date !== input.currentDates.due_date) {
    lines.push(
      `O prazo passa de ${human(input.currentDates.due_date)} para ${human(input.nextDates.due_date)}.`,
    );
  }

  if (
    input.currentDates.start_date &&
    input.nextDates.start_date &&
    input.nextDates.start_date !== input.currentDates.start_date
  ) {
    lines.push(
      `O início passa de ${human(input.currentDates.start_date)} para ${human(input.nextDates.start_date)}.`,
    );
  }

  if (input.crossProject) {
    lines.push(
      'A sprint de destino é de outro projeto. Quem não tem acesso a esse projeto deixa de ver a tarefa.',
    );
  }

  return lines;
}

export function calculateSprintRisks(
  deliverables: Deliverable[],
  metrics: Metric[],
  sprint: Sprint | null,
  today = new Date(),
) {
  const incomplete = deliverables.filter((item) => item.status !== 'completed');
  const overdue = incomplete.filter(
    (item) => isPastBrazil(parseDate(item.due_date)) && !isTodayBrazil(parseDate(item.due_date)),
  );
  const dueToday = incomplete.filter((item) => isTodayBrazil(parseDate(item.due_date)));
  const dueTomorrow = incomplete.filter((item) => isTomorrowBrazil(parseDate(item.due_date)));
  let sprintProgress = 0;
  if (sprint) {
    const totalDays =
      differenceInDays(parseDate(sprint.end_date), parseDate(sprint.start_date)) + 1;
    const daysPassed = Math.max(0, differenceInDays(today, parseDate(sprint.start_date)) + 1);
    sprintProgress = Math.min(100, (daysPassed / totalDays) * 100);
  }
  const metricsAtRisk = metrics.filter(
    (metric) =>
      metric.target_value &&
      sprintProgress > 50 &&
      ((metric.current_value ?? 0) / metric.target_value) * 100 < 50,
  );
  return { overdue, dueToday, dueTomorrow, metricsAtRisk, sprintProgress };
}

/**
 * As datas resolvidas de cada entregável — o início cai no começo da sprint
 * quando o entregável não tem um próprio.
 *
 * Aqui não mora mais geometria. A janela, as colunas e a posição da barra
 * passaram para `src/lib/ganttTimeline.ts` quando o Gantt virou um componente
 * só: `days`, `totalDays`, `startOffset`, `duration`, `barLeft` e `barWidth`
 * descreviam um eixo que ia do começo ao fim da sprint, e o eixo agora é um
 * período navegável que a sprint não controla.
 */
export function buildGanttData(sprint: Sprint | null, deliverables: Deliverable[]) {
  if (!sprint) return { deliverables: [] };
  const sprintStart = parseDate(sprint.start_date);
  return {
    deliverables: deliverables.map((item) => ({
      ...item,
      startDate: item.start_date ? parseDate(item.start_date) : sprintStart,
      endDate: parseDate(item.due_date),
    })),
  };
}

export type GanttData = ReturnType<typeof buildGanttData>;

/** Entregáveis por responsável, com os totais que o resumo da linha escreve. */
export function groupGanttByPerson(
  data: GanttData,
  sprint: Sprint | null,
  getProfileName: (id: string | null) => string,
) {
  if (!sprint) return [];
  const grouped: Record<string, GanttData['deliverables']> = {};
  data.deliverables.forEach((item) =>
    (grouped[item.assigned_to ?? 'unassigned'] ??= []).push(item),
  );
  return Object.entries(grouped)
    .map(([personId, items]) => ({
      personId,
      personName: getProfileName(personId),
      deliverables: items,
      totalHours: items.reduce((sum, item) => sum + (item.estimated_hours ?? 0), 0),
      completedCount: items.filter((item) => item.status === 'completed').length,
      count: items.length,
    }))
    .sort((a, b) => a.personName.localeCompare(b.personName));
}

export function suggestNextTaskCode(deliverables: Deliverable[], parentId: string) {
  const prefix = deliverables.find((item) => item.id === parentId)?.task_code ?? '';
  const suffixes = deliverables
    .filter((item) => item.parent_id === parentId && item.task_code)
    .map((item) => Number(item.task_code?.split('.').at(-1)))
    .filter(Number.isFinite);
  const next = Math.max(...suffixes, 0) + 1;
  return prefix ? `${prefix}.${next}` : `${next}`;
}

export function siblingShifts(
  deliverables: Deliverable[],
  parentId: string,
  newCode: string,
  excludeId?: string,
) {
  const prefix = deliverables.find((item) => item.id === parentId)?.task_code;
  const suffix = (code: string) => Number.parseInt(code.split('.').at(-1) ?? '', 10);
  const newSuffix = suffix(newCode);
  return deliverables
    .filter(
      (item) =>
        item.parent_id === parentId &&
        item.id !== excludeId &&
        item.task_code &&
        suffix(item.task_code) >= newSuffix,
    )
    .sort((a, b) => suffix(b.task_code as string) - suffix(a.task_code as string))
    .map((item) => ({
      deliverableId: item.id,
      taskCode: `${prefix ? `${prefix}.` : ''}${suffix(item.task_code as string) + 1}`,
    }));
}

export function buildExportRows(
  sprint: Sprint,
  deliverables: Deliverable[],
  profiles: Profile[],
  projects: Project[],
  processes: Process[],
) {
  return deliverables.map((item) => {
    const isSubtask = Boolean(item.parent_id);
    const parent = isSubtask
      ? deliverables.find((candidate) => candidate.id === item.parent_id)
      : null;
    return {
      Sprint: sprint.name,
      ID: item.task_code ?? '',
      Título: isSubtask ? parent?.title || '' : item.title,
      Subtarefa: isSubtask ? item.title : '',
      Responsável: profiles.find((profile) => profile.id === item.assigned_to)?.first_name ?? '',
      Descrição: tarefaRichTextToPlain(item.description),
      'Estimativa (h)': item.estimated_hours || '',
      'Data de Entrega': format(parseDate(item.due_date), 'dd/MM/yyyy'),
      Projeto: projects.find((project) => project.id === item.project_id)?.name ?? '',
      Processo: processes.find((process) => process.id === item.process_id)?.name ?? '',
    };
  });
}
