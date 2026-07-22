import type {
  DailyStandup,
  Process,
  Project,
  Sprint,
  TeamMember,
} from '@/hooks/useDomainEquipeDaily';

export interface DailyFormDraft {
  did_yesterday: string;
  will_do_today: string;
  blockers: string;
  sprint_id: string;
  project_id: string;
  process_id: string;
  // Bloqueio estruturado (T3). has_blocker controla a exibição do mini-form.
  has_blocker: boolean;
  blocked_deliverable_id: string;
  blocker_owner: string;
}

/** Tarefa mínima para os "chips" da daily (evita import circular com o hook). */
export interface DailyTaskChip {
  id: string;
  title: string;
  task_code: string | null;
}

export interface DailyEditDraft {
  did_yesterday: string;
  will_do_today: string;
  blockers: string;
}

export interface DailyFilters {
  startDate: string;
  endDate: string;
  person: string;
  sprint: string;
}

export interface DailyLookups {
  memberName: (userId: string) => string;
  sprintName: (sprintId: string | null) => string;
  projectName: (projectId: string | null) => string;
  processName: (processId: string | null) => string;
}

export function createDailyFormDraft(): DailyFormDraft {
  return {
    did_yesterday: '',
    will_do_today: '',
    blockers: '',
    sprint_id: '',
    project_id: '',
    process_id: '',
    has_blocker: false,
    blocked_deliverable_id: '',
    blocker_owner: '',
  };
}

export function createDailyEditDraft(standup?: DailyStandup): DailyEditDraft {
  return {
    did_yesterday: standup?.did_yesterday || '',
    will_do_today: standup?.will_do_today || '',
    blockers: standup?.blockers || '',
  };
}

export function hydrateDailyForm(standup: DailyStandup): DailyFormDraft {
  return {
    did_yesterday: standup.did_yesterday || '',
    will_do_today: standup.will_do_today || '',
    blockers: standup.blockers || '',
    sprint_id: standup.sprint_id || '',
    project_id: standup.project_id || '',
    process_id: standup.process_id || '',
    has_blocker: Boolean(standup.blockers || standup.blocked_deliverable_id),
    blocked_deliverable_id: standup.blocked_deliverable_id || '',
    blocker_owner: standup.blocker_owner || '',
  };
}

/**
 * Campos do bloqueio para o payload de gravação. Só inclui as colunas novas
 * (blocked_deliverable_id/blocker_owner) quando têm valor — assim uma daily sem
 * bloqueio grava igual a antes (compatível com a base pré-migração no Lovable).
 */
export function buildDailyBlockerFields(form: DailyFormDraft): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    blockers: form.has_blocker ? form.blockers || null : null,
  };
  if (form.has_blocker && form.blocked_deliverable_id) {
    fields.blocked_deliverable_id = form.blocked_deliverable_id;
  }
  if (form.has_blocker && form.blocker_owner) {
    fields.blocker_owner = form.blocker_owner;
  }
  return fields;
}

/** Acrescenta a referência da tarefa (código + título) numa nova linha do texto. */
export function appendTaskReference(text: string, task: DailyTaskChip): string {
  const reference = `- ${task.task_code ? `[${task.task_code}] ` : ''}${task.title}`;
  if (!text.trim()) return reference;
  return text.endsWith('\n') ? `${text}${reference}` : `${text}\n${reference}`;
}

interface GroupableTask {
  id: string;
  title: string;
  task_code: string | null;
  status: string;
  parent_id: string | null;
}

export interface DailyTaskGroup<T> {
  /** Título da tarefa-mãe (código + nome), ou null para tarefas avulsas. */
  header: string | null;
  tasks: T[];
}

/**
 * Agrupa as tarefas por tarefa-mãe: cada mãe (que está na lista e tem filhas) vira um
 * grupo com as filhas; tarefas avulsas (sem mãe na lista e sem filhas) caem num grupo
 * final sem cabeçalho. Concluídas ficam por último dentro de cada grupo. A ordem de
 * entrada (já vem por código) é preservada — sort estável.
 */
export function groupDailyTasksByParent<T extends GroupableTask>(tasks: T[]): DailyTaskGroup<T>[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const childrenByParent = new Map<string, T[]>();
  const roots: T[] = [];
  for (const task of tasks) {
    if (task.parent_id && byId.has(task.parent_id)) {
      const list = childrenByParent.get(task.parent_id) ?? [];
      list.push(task);
      childrenByParent.set(task.parent_id, list);
    } else {
      roots.push(task);
    }
  }
  const completedLast = (list: T[]) =>
    [...list].sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'));

  const groups: DailyTaskGroup<T>[] = [];
  const standalone: T[] = [];
  for (const root of roots) {
    const children = childrenByParent.get(root.id);
    if (children && children.length > 0) {
      const header = `${root.task_code ? `${root.task_code} ` : ''}${root.title}`;
      groups.push({ header, tasks: completedLast(children) });
    } else {
      standalone.push(root);
    }
  }
  if (standalone.length > 0) groups.push({ header: null, tasks: completedLast(standalone) });
  return groups;
}

export function mergeTeamMembers(
  current: TeamMember[],
  roleProfiles?: TeamMember[],
  additionalProfiles?: TeamMember[],
): TeamMember[] {
  const base = roleProfiles ?? current;
  const memberIds = new Set(base.map((member) => member.id));
  return [
    ...base,
    ...(additionalProfiles ?? []).filter((profile) => {
      if (memberIds.has(profile.id)) return false;
      memberIds.add(profile.id);
      return true;
    }),
  ];
}

export function filterProcesses(processes: Process[], projectId: string): Process[] {
  return projectId
    ? processes.filter((process) => process.project_id === projectId)
    : processes;
}

export function createDailyLookups({
  members,
  sprints,
  projects,
  processes,
  authenticatedUserId,
}: {
  members: TeamMember[];
  sprints: Sprint[];
  projects: Project[];
  processes: Process[];
  authenticatedUserId?: string;
}): DailyLookups {
  return {
    memberName: (userId) => {
      const member = members.find((item) => item.id === userId);
      if (member) {
        return `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Sem nome';
      }
      return userId === authenticatedUserId ? 'Você' : 'Membro da equipe';
    },
    sprintName: (sprintId) => {
      if (!sprintId) return 'Sem sprint';
      return sprints.find((sprint) => sprint.id === sprintId)?.name || 'Sprint não encontrada';
    },
    projectName: (projectId) => {
      if (!projectId) return '';
      return projects.find((project) => project.id === projectId)?.name || '';
    },
    processName: (processId) => {
      if (!processId) return '';
      return processes.find((process) => process.id === processId)?.name || '';
    },
  };
}

export function buildDailyExportRows(standups: DailyStandup[], lookups: DailyLookups) {
  return standups.map((standup) => ({
    Data: new Date(standup.date).toLocaleDateString('pt-BR'),
    Membro: lookups.memberName(standup.user_id),
    Sprint: lookups.sprintName(standup.sprint_id),
    Projeto: lookups.projectName(standup.project_id) || '-',
    Processo: lookups.processName(standup.process_id) || '-',
    Horário: new Date(standup.created_at).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    Ontem: standup.did_yesterday || '-',
    Hoje: standup.will_do_today || '-',
    Bloqueios: standup.blockers || '-',
    'Bloqueio (quem destrava)': standup.blocker_owner || '-',
  }));
}
