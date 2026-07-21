import { STATUS_CHART_COLORS } from '@/constants/brandColors';

export const ANALISE_INTELIGENTE_ALL = '__ALL__';

export interface AnaliseInteligenteSprint {
  id: string;
  name: string;
  project_id: string | null;
  start_date: string;
  end_date: string;
  status: string | null;
}

export interface AnaliseInteligenteProject {
  id: string;
  name: string;
}

export interface AnaliseInteligenteProcess {
  id: string;
  name: string;
  area: string | null;
  project_id: string | null;
}

export interface AnaliseInteligenteDeliverable {
  id: string;
  sprint_id: string | null;
  project_id: string | null;
  process_id: string | null;
  status: string | null;
  due_date: string;
  estimated_hours: number | null;
  completed_at: string | null;
  created_at: string | null;
  assigned_to: string | null;
}

export interface AnaliseInteligenteDaily {
  id: string;
  date: string;
  sprint_id: string | null;
  project_id: string | null;
  process_id: string | null;
  blockers: string | null;
  user_id: string;
}

export interface AnaliseInteligenteImprovement {
  sprint_deliverable_id: string | null;
  cost_saved_monthly: number | null;
  time_saved_hours: number | null;
  evaluation_status: string | null;
}

export interface AnaliseInteligenteAnalysis {
  sintese_executiva: string;
  evolucao_entregas: string;
  tempo_vs_resultado: string;
  saudabilidade_sprint: string;
  aderencia_escopo: string;
  gastos_extras: string;
  riscos: string[];
  oportunidades: string[];
  recomendacoes: string[];
  nivel_risco: 'baixo' | 'medio' | 'alto';
  score_saude: number;
}

export interface AnaliseInteligenteFilters {
  startDate: string;
  endDate: string;
  sprintFilter: string;
  projectFilter: string;
  processFilter: string;
}

export interface AnaliseInteligenteData {
  sprints: AnaliseInteligenteSprint[];
  projects: AnaliseInteligenteProject[];
  processes: AnaliseInteligenteProcess[];
  deliverables: AnaliseInteligenteDeliverable[];
  dailys: AnaliseInteligenteDaily[];
  improvements: AnaliseInteligenteImprovement[];
}

export interface AnaliseInteligenteFilteredData {
  sprintsF: AnaliseInteligenteSprint[];
  deliverablesF: AnaliseInteligenteDeliverable[];
  dailysF: AnaliseInteligenteDaily[];
}

export interface AnaliseInteligenteKpis {
  totalSprints: number;
  activeSprints: number;
  completedSprints: number;
  totalDel: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  rate: number;
  hours: number;
  totalDailys: number;
  blockers: number;
  savings: number;
  timeSaved: number;
  extraCost: number;
  scopeCreep: number;
  score: number;
}

export interface AnaliseInteligenteRequestPayload {
  start_date: string | null;
  end_date: string | null;
  sprint_id: string | null;
  project_id: string | null;
  process_id: string | null;
  category: string | null;
}

export function buildAnaliseInteligenteRequestPayload(
  filters: AnaliseInteligenteFilters,
): AnaliseInteligenteRequestPayload {
  return {
    start_date: filters.startDate || null,
    end_date: filters.endDate || null,
    sprint_id: filters.sprintFilter !== ANALISE_INTELIGENTE_ALL ? filters.sprintFilter : null,
    project_id: filters.projectFilter !== ANALISE_INTELIGENTE_ALL ? filters.projectFilter : null,
    process_id: filters.processFilter !== ANALISE_INTELIGENTE_ALL ? filters.processFilter : null,
    category: null,
  };
}

export function filterAnaliseInteligenteData(
  data: AnaliseInteligenteData,
  filters: AnaliseInteligenteFilters,
): AnaliseInteligenteFilteredData {
  const { startDate, endDate, sprintFilter, projectFilter, processFilter } = filters;
  const inDateRange = (date: string | null) => {
    if (!date) return true;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  };

  const sprintsF = data.sprints.filter((sprint) => {
    if (sprintFilter !== ANALISE_INTELIGENTE_ALL && sprint.id !== sprintFilter) return false;
    if (projectFilter !== ANALISE_INTELIGENTE_ALL && sprint.project_id !== projectFilter)
      return false;
    if (startDate && sprint.end_date < startDate) return false;
    if (endDate && sprint.start_date > endDate) return false;
    return true;
  });
  const sprintIds = new Set(sprintsF.map((sprint) => sprint.id));

  const deliverablesF = data.deliverables.filter((deliverable) => {
    if (sprintFilter !== ANALISE_INTELIGENTE_ALL && deliverable.sprint_id !== sprintFilter)
      return false;
    if (projectFilter !== ANALISE_INTELIGENTE_ALL && deliverable.project_id !== projectFilter)
      return false;
    if (processFilter !== ANALISE_INTELIGENTE_ALL && deliverable.process_id !== processFilter)
      return false;
    if (
      sprintFilter === ANALISE_INTELIGENTE_ALL &&
      deliverable.sprint_id &&
      !sprintIds.has(deliverable.sprint_id) &&
      (startDate || endDate || projectFilter !== ANALISE_INTELIGENTE_ALL)
    )
      return false;
    if (!inDateRange(deliverable.due_date)) return false;
    return true;
  });

  const dailysF = data.dailys.filter((daily) => {
    if (!inDateRange(daily.date)) return false;
    if (sprintFilter !== ANALISE_INTELIGENTE_ALL && daily.sprint_id !== sprintFilter) return false;
    if (projectFilter !== ANALISE_INTELIGENTE_ALL && daily.project_id !== projectFilter)
      return false;
    if (processFilter !== ANALISE_INTELIGENTE_ALL && daily.process_id !== processFilter)
      return false;
    return true;
  });

  return { sprintsF, deliverablesF, dailysF };
}

export function buildAnaliseInteligenteKpis(
  filtered: AnaliseInteligenteFilteredData,
  improvements: AnaliseInteligenteImprovement[],
  today = new Date().toISOString().split('T')[0],
): AnaliseInteligenteKpis {
  const { sprintsF, deliverablesF, dailysF } = filtered;
  const totalDel = deliverablesF.length;
  const completed = deliverablesF.filter((item) => item.status === 'completed').length;
  const inProgress = deliverablesF.filter((item) => item.status === 'in_progress').length;
  const pending = deliverablesF.filter((item) => item.status === 'pending').length;
  const overdue = deliverablesF.filter(
    (item) => item.due_date && item.due_date < today && item.status !== 'completed',
  ).length;
  const rate = totalDel > 0 ? Math.round((completed / totalDel) * 100) : 0;
  const hours = deliverablesF.reduce((sum, item) => sum + (Number(item.estimated_hours) || 0), 0);
  const blockers = dailysF.filter(
    (item) => item.blockers && item.blockers.trim().length > 0,
  ).length;
  const deliverableIds = new Set(deliverablesF.map((item) => item.id));
  const linkedImprovements = improvements.filter(
    (item) => item.sprint_deliverable_id && deliverableIds.has(item.sprint_deliverable_id),
  );
  const savings = linkedImprovements.reduce(
    (sum, item) => sum + (Number(item.cost_saved_monthly) || 0),
    0,
  );
  const timeSaved = linkedImprovements.reduce(
    (sum, item) => sum + (Number(item.time_saved_hours) || 0),
    0,
  );
  const extraCost = overdue * 150 * 4;
  const scopeCreep = deliverablesF.filter((deliverable) => {
    if (!deliverable.sprint_id || !deliverable.created_at) return false;
    const sprint = sprintsF.find((item) => item.id === deliverable.sprint_id);
    if (!sprint) return false;
    return (
      new Date(deliverable.created_at).getTime() - new Date(sprint.start_date).getTime() > 86400000
    );
  }).length;
  const blockerComp = Math.max(0, 100 - (blockers / Math.max(sprintsF.length, 1)) * 20);
  const scopeComp = Math.max(0, 100 - (scopeCreep / Math.max(totalDel, 1)) * 100);
  const overdueComp = Math.max(0, 100 - (overdue / Math.max(totalDel, 1)) * 100);
  const score = Math.round((rate + blockerComp + scopeComp + overdueComp) / 4);

  return {
    totalSprints: sprintsF.length,
    activeSprints: sprintsF.filter((item) => item.status === 'active').length,
    completedSprints: sprintsF.filter((item) => item.status === 'completed').length,
    totalDel,
    completed,
    inProgress,
    pending,
    overdue,
    rate,
    hours,
    totalDailys: dailysF.length,
    blockers,
    savings,
    timeSaved,
    extraCost,
    scopeCreep,
    score,
  };
}

function weekKey(date: string): string {
  const value = new Date(date);
  const year = value.getFullYear();
  const onejan = new Date(year, 0, 1);
  const week = Math.ceil(
    ((value.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7,
  );
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function buildEntregasPorSemana(deliverables: AnaliseInteligenteDeliverable[]) {
  const map = new Map<string, { semana: string; concluidas: number; total: number }>();
  deliverables.forEach((item) => {
    const date = item.completed_at ? item.completed_at.split('T')[0] : item.due_date;
    if (!date) return;
    const key = weekKey(date);
    if (!map.has(key)) map.set(key, { semana: key, concluidas: 0, total: 0 });
    const bucket = map.get(key)!;
    bucket.total += 1;
    if (item.status === 'completed') bucket.concluidas += 1;
  });
  return Array.from(map.values())
    .sort((a, b) => a.semana.localeCompare(b.semana))
    .slice(-12);
}

export function buildStatusData(kpis: AnaliseInteligenteKpis) {
  return [
    { name: 'Concluído', value: kpis.completed, color: STATUS_CHART_COLORS.completed },
    { name: 'Em Progresso', value: kpis.inProgress, color: STATUS_CHART_COLORS.in_progress },
    { name: 'Pendente', value: kpis.pending, color: STATUS_CHART_COLORS.pending },
    { name: 'Atrasado', value: kpis.overdue, color: '#ef4444' },
  ].filter((item) => item.value > 0);
}

export function buildHorasPorSprint(filtered: AnaliseInteligenteFilteredData) {
  return filtered.sprintsF.slice(0, 8).map((sprint) => {
    const hours = filtered.deliverablesF
      .filter((item) => item.sprint_id === sprint.id)
      .reduce((sum, item) => sum + (Number(item.estimated_hours) || 0), 0);
    return {
      sprint: sprint.name.length > 18 ? `${sprint.name.substring(0, 18)}…` : sprint.name,
      horas: Math.round(hours),
    };
  });
}

export function buildDailysPorSemana(dailys: AnaliseInteligenteDaily[]) {
  const map = new Map<string, { semana: string; dailys: number; bloqueios: number }>();
  dailys.forEach((item) => {
    const key = weekKey(item.date);
    if (!map.has(key)) map.set(key, { semana: key, dailys: 0, bloqueios: 0 });
    const bucket = map.get(key)!;
    bucket.dailys += 1;
    if (item.blockers && item.blockers.trim()) bucket.bloqueios += 1;
  });
  return Array.from(map.values())
    .sort((a, b) => a.semana.localeCompare(b.semana))
    .slice(-12);
}
