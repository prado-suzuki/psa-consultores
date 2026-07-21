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
  };
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
  }));
}
