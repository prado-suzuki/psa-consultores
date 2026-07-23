import { differenceInDays, eachDayOfInterval, format } from 'date-fns';
import type {
  SprintDetalhesDeliverable as Deliverable,
  SprintDetalhesMetric as Metric,
  SprintDetalhesProcess as Process,
  SprintDetalhesProfile as Profile,
  SprintDetalhesProject as Project,
  SprintDetalhesSprint as Sprint,
} from '@/hooks/useDomainEquipeSprintDetalhes';
import { isPastBrazil, isTodayBrazil, isTomorrowBrazil, parseDate } from '@/lib/dateUtils';

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
  return deliverables
    .filter((item) => !item.parent_id)
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

export function buildGanttData(sprint: Sprint | null, deliverables: Deliverable[]) {
  if (!sprint) return { days: [] as Date[], deliverables: [], totalDays: 0 };
  const sprintStart = parseDate(sprint.start_date);
  const days = eachDayOfInterval({ start: sprintStart, end: parseDate(sprint.end_date) });
  return {
    days,
    totalDays: days.length,
    deliverables: deliverables.map((item) => {
      const startDate = item.start_date ? parseDate(item.start_date) : sprintStart;
      const endDate = parseDate(item.due_date);
      const startOffset = Math.max(0, differenceInDays(startDate, sprintStart));
      const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
      return {
        ...item,
        startDate,
        endDate,
        startOffset,
        duration,
        barLeft: (startOffset / days.length) * 100,
        barWidth: (duration / days.length) * 100,
      };
    }),
  };
}

export type GanttData = ReturnType<typeof buildGanttData>;

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
  const sprintStart = parseDate(sprint.start_date);
  const sprintEnd = parseDate(sprint.end_date);
  return Object.entries(grouped)
    .map(([personId, items]) => {
      let minStart = sprintEnd;
      let maxEnd = sprintStart;
      items.forEach((item) => {
        if (item.startDate < minStart) minStart = item.startDate;
        if (item.endDate > maxEnd) maxEnd = item.endDate;
      });
      return {
        personId,
        personName: getProfileName(personId),
        deliverables: items,
        totalHours: items.reduce((sum, item) => sum + (item.estimated_hours ?? 0), 0),
        completedCount: items.filter((item) => item.status === 'completed').length,
        count: items.length,
        minStart,
        maxEnd,
        consolidatedBarLeft:
          (Math.max(0, differenceInDays(minStart, sprintStart)) / data.totalDays) * 100,
        consolidatedBarWidth:
          (Math.max(1, differenceInDays(maxEnd, minStart) + 1) / data.totalDays) * 100,
      };
    })
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
      Descrição: item.description ?? '',
      'Estimativa (h)': item.estimated_hours || '',
      'Data de Entrega': format(parseDate(item.due_date), 'dd/MM/yyyy'),
      Projeto: projects.find((project) => project.id === item.project_id)?.name ?? '',
      Processo: processes.find((process) => process.id === item.process_id)?.name ?? '',
    };
  });
}
