import { addDays, differenceInDays, eachDayOfInterval, format } from 'date-fns';
import type { HatchedBarSegment, HeatmapRow } from '@/components/dashboard/momentum';
import type { AreaKey } from '@/config/areaCategories';
import { statusList } from '@/lib/taskStatusColors';
import type { FiscalDashProject, FiscalDashTask } from '@/hooks/useFiscalDashboardData';

export const AREA_DASHBOARD_ALL = '__ALL__';

export type UrgencyFilter = typeof AREA_DASHBOARD_ALL | 'overdue' | 'next_7' | 'next_30' | 'no_due';

export interface AreaDashboardFilters {
  startDate: string;
  endDate: string;
  client: string;
  project: string;
  taskStatus: string;
  projectStatus: string;
  member: string;
  equipe: string;
  urgency: UrgencyFilter;
}

export const emptyAreaDashboardFilters: AreaDashboardFilters = {
  startDate: '', endDate: '', client: AREA_DASHBOARD_ALL, project: AREA_DASHBOARD_ALL,
  taskStatus: AREA_DASHBOARD_ALL, projectStatus: AREA_DASHBOARD_ALL,
  member: AREA_DASHBOARD_ALL, equipe: AREA_DASHBOARD_ALL, urgency: AREA_DASHBOARD_ALL,
};

export type TaskClientResolver = (task: Pick<FiscalDashTask, 'client_id' | 'contribuinte_id' | 'project_id'>) => string | null;

export function scopeProjects(projects: FiscalDashProject[], areaIds: Set<string>, area: AreaKey) {
  return projects.filter(project => project.estrutura_area_id
    ? areaIds.has(project.estrutura_area_id)
    : area === 'tax');
}

export function scopeTasks(tasks: FiscalDashTask[], projectIds: Set<string>) {
  return tasks.filter(task => task.project_id && projectIds.has(task.project_id));
}

export function createTaskClientResolver(
  projectMap: Record<string, FiscalDashProject>,
  contribuinteToClient: Record<string, string>,
): TaskClientResolver {
  return task => {
    if (task.client_id) return task.client_id;
    if (task.contribuinte_id && contribuinteToClient[task.contribuinte_id]) {
      return contribuinteToClient[task.contribuinte_id];
    }
    const project = task.project_id ? projectMap[task.project_id] : null;
    if (project?.external_client_id) return project.external_client_id;
    if (project?.contribuinte_id && contribuinteToClient[project.contribuinte_id]) {
      return contribuinteToClient[project.contribuinte_id];
    }
    return null;
  };
}

export function filterAreaProjects(projects: FiscalDashProject[], filters: AreaDashboardFilters) {
  return projects.filter(project => {
    if (filters.projectStatus !== AREA_DASHBOARD_ALL && project.status !== filters.projectStatus) return false;
    if (filters.project !== AREA_DASHBOARD_ALL && project.id !== filters.project) return false;
    if (filters.equipe !== AREA_DASHBOARD_ALL && project.equipe_id !== filters.equipe) return false;
    return true;
  });
}

export function matchesUrgency(task: FiscalDashTask, urgency: UrgencyFilter, today: Date) {
  if (urgency === AREA_DASHBOARD_ALL) return true;
  if (urgency === 'no_due') return !task.due_date;
  if (!task.due_date) return false;
  const due = new Date(`${task.due_date}T00:00:00`);
  if (urgency === 'overdue') return task.status !== 'done' && due < today;
  if (urgency === 'next_7') return due >= today && due <= addDays(today, 7);
  return due >= today && due <= addDays(today, 30);
}

export function filterAreaTasks(
  tasks: FiscalDashTask[], filters: AreaDashboardFilters, filteredProjectIds: Set<string>,
  resolveClientId: TaskClientResolver, today: Date,
) {
  return tasks.filter(task => {
    if (filters.project !== AREA_DASHBOARD_ALL && task.project_id !== filters.project) return false;
    if (filters.projectStatus !== AREA_DASHBOARD_ALL || filters.equipe !== AREA_DASHBOARD_ALL) {
      if (!task.project_id || !filteredProjectIds.has(task.project_id)) return false;
    }
    if (filters.client !== AREA_DASHBOARD_ALL && resolveClientId(task) !== filters.client) return false;
    if (filters.taskStatus !== AREA_DASHBOARD_ALL && task.status !== filters.taskStatus) return false;
    if (filters.member !== AREA_DASHBOARD_ALL && task.assigned_to !== filters.member) return false;
    if (filters.startDate && task.due_date && task.due_date < filters.startDate) return false;
    if (filters.endDate && task.due_date && task.due_date > filters.endDate) return false;
    return matchesUrgency(task, filters.urgency, today);
  });
}

export function buildStatusSegments(tasks: FiscalDashTask[]): HatchedBarSegment[] {
  return statusList.map((status, index) => ({
    label: status.label,
    value: tasks.filter(task => task.status === status.key).length,
    hatched: index % 2 === 1,
  })).filter(segment => segment.value > 0);
}

export function buildAreaSegments(
  tasks: FiscalDashTask[], projectMap: Record<string, FiscalDashProject>, areaMap: Record<string, string>,
): HatchedBarSegment[] {
  const totals: Record<string, number> = {};
  tasks.forEach(task => {
    const project = projectMap[task.project_id || ''];
    const name = project?.estrutura_area_id ? areaMap[project.estrutura_area_id] || 'Sem área' : 'Sem área';
    totals[name] = (totals[name] || 0) + 1;
  });
  return Object.entries(totals)
    .map(([label, value], index) => ({ label, value, hatched: index % 2 === 1 }))
    .sort((left, right) => right.value - left.value);
}

export function buildHeatmap(tasks: FiscalDashTask[], memberMap: Record<string, string>, today: Date) {
  const days = eachDayOfInterval({ start: today, end: addDays(today, 13) });
  const dayKeys = days.map(day => format(day, 'yyyy-MM-dd'));
  const grid: Record<string, Record<string, number>> = {};
  tasks.forEach(task => {
    if (!task.assigned_to || !task.due_date || task.status === 'done' || !dayKeys.includes(task.due_date)) return;
    grid[task.assigned_to] ||= {};
    grid[task.assigned_to][task.due_date] = (grid[task.assigned_to][task.due_date] || 0) + (task.estimated_hours || 1);
  });
  const rankedMembers = Object.entries(grid).map(([id, values]) => ({
    id, total: Object.values(values).reduce((sum, value) => sum + value, 0),
  })).sort((left, right) => right.total - left.total).slice(0, 6);
  const rows: HeatmapRow[] = rankedMembers.map(({ id }) => {
    const fullName = memberMap[id] || id.slice(0, 4);
    const initials = fullName.split(' ').filter(Boolean).slice(0, 2)
      .map(name => name[0]?.toUpperCase() || '').join('');
    return { label: initials || fullName.slice(0, 3).toUpperCase(), cells: dayKeys.map(day => grid[id][day] || 0) };
  });
  return { rows, columnLabels: days.map(day => format(day, 'dd')) };
}

export function buildOverdueRows(
  tasks: FiscalDashTask[], projectMap: Record<string, FiscalDashProject>, memberMap: Record<string, string>,
  clientMap: Record<string, string>, resolveClientId: TaskClientResolver, today: Date,
) {
  return tasks.filter(task => task.due_date && task.status !== 'done' && new Date(`${task.due_date}T00:00:00`) < today)
    .map(task => {
      const clientId = resolveClientId(task);
      return {
        id: task.id, title: task.title, project: projectMap[task.project_id || '']?.name || '-',
        client: (clientId && clientMap[clientId]) || '-',
        responsible: task.assigned_to_name || (task.assigned_to ? memberMap[task.assigned_to] : null) || '-',
        dueDate: task.due_date!,
        daysOverdue: differenceInDays(today, new Date(`${task.due_date}T00:00:00`)),
      };
    }).sort((left, right) => right.daysOverdue - left.daysOverdue);
}

export function buildMemberRows(tasks: FiscalDashTask[], memberMap: Record<string, string>, today: Date) {
  const totals: Record<string, { active: number; hours: number; overdue: number }> = {};
  tasks.forEach(task => {
    if (!task.assigned_to) return;
    totals[task.assigned_to] ||= { active: 0, hours: 0, overdue: 0 };
    if (task.status === 'done') return;
    totals[task.assigned_to].active++;
    totals[task.assigned_to].hours += task.estimated_hours || 0;
    if (task.due_date && new Date(`${task.due_date}T00:00:00`) < today) totals[task.assigned_to].overdue++;
  });
  return Object.entries(totals).map(([id, stats]) => ({ name: memberMap[id] || id.slice(0, 8), ...stats }))
    .sort((left, right) => right.active - left.active);
}

export function buildTopClients(
  tasks: FiscalDashTask[], clientMap: Record<string, string>, resolveClientId: TaskClientResolver,
) {
  const totals: Record<string, number> = {};
  tasks.forEach(task => {
    if (!task.estimated_hours) return;
    const clientId = resolveClientId(task);
    if (clientId) totals[clientId] = (totals[clientId] || 0) + task.estimated_hours;
  });
  return Object.entries(totals).map(([id, hours]) => ({ name: clientMap[id] || 'Sem cliente', hours }))
    .sort((left, right) => right.hours - left.hours).slice(0, 5);
}
