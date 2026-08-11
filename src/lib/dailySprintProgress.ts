import type { TeamMember } from '@/hooks/useDomainEquipeDaily';

export type SprintProgressTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface SprintProgressTask {
  id: string;
  title: string;
  task_code: string | null;
  status: SprintProgressTaskStatus;
  parent_id: string | null;
  assigned_to: string | null;
}

export interface SprintProgressPerson {
  id: string;
  name: string;
  initials: string;
  tasks: SprintProgressTask[];
  total: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

export interface DailySprintProgress {
  people: SprintProgressPerson[];
  tasks: SprintProgressTask[];
  total: number;
  completed: number;
  inProgress: number;
  percentage: number;
  nextMilestone: number | null;
}

const UNASSIGNED_ID = '__unassigned__';
const MILESTONES = [25, 50, 75, 100];

function memberName(member: TeamMember | undefined, memberId: string): string {
  const name = member
    ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
    : '';
  if (name) return name;
  return memberId === UNASSIGNED_ID ? 'Não atribuído' : 'Membro da equipe';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('pt-BR') ?? '')
    .join('');
}

/**
 * Resume o avanço da sprint por quantidade de tarefas acionáveis. Tarefas-pai que
 * possuem filhas não entram na conta, evitando contar o mesmo escopo duas vezes.
 */
export function buildDailySprintProgress(
  tasks: SprintProgressTask[],
  members: TeamMember[],
): DailySprintProgress {
  const parentIds = new Set(tasks.map((task) => task.parent_id).filter((id): id is string => Boolean(id)));
  const actionableTasks = tasks.filter((task) => !parentIds.has(task.id));
  const membersById = new Map(members.map((member) => [member.id, member]));
  const grouped = new Map<string, SprintProgressTask[]>();

  actionableTasks.forEach((task) => {
    const personId = task.assigned_to || UNASSIGNED_ID;
    grouped.set(personId, [...(grouped.get(personId) ?? []), task]);
  });

  const people = [...grouped.entries()]
    .map(([id, personTasks]): SprintProgressPerson => {
      const completed = personTasks.filter((task) => task.status === 'completed').length;
      const inProgress = personTasks.filter((task) => task.status === 'in_progress').length;
      const name = memberName(membersById.get(id), id);
      return {
        id,
        name,
        initials: initials(name),
        tasks: personTasks,
        total: personTasks.length,
        completed,
        inProgress,
        percentage: personTasks.length > 0 ? Math.round((completed / personTasks.length) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (a.id === UNASSIGNED_ID) return 1;
      if (b.id === UNASSIGNED_ID) return -1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const completed = actionableTasks.filter((task) => task.status === 'completed').length;
  const inProgress = actionableTasks.filter((task) => task.status === 'in_progress').length;
  const percentage = actionableTasks.length > 0
    ? Math.round((completed / actionableTasks.length) * 100)
    : 0;

  return {
    people,
    tasks: actionableTasks,
    total: actionableTasks.length,
    completed,
    inProgress,
    percentage,
    nextMilestone: MILESTONES.find((milestone) => milestone > percentage) ?? null,
  };
}
