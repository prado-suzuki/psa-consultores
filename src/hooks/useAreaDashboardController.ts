import { useMemo, useState } from 'react';
import { startOfDay } from 'date-fns';
import type { AreaKey } from '@/config/areaCategories';
import { useEstruturaAreas } from '@/hooks/useEstruturaAreas';
import { useEstruturaEquipesByCategory } from '@/hooks/useEstruturaEquipes';
import {
  useFiscalDashClientNames, useFiscalDashContribuintes, useFiscalDashProjects, useFiscalDashTasks,
} from '@/hooks/useFiscalDashboardData';
import { useFiscalClientsList } from '@/hooks/useFiscalClients';
import { useTeamProfilesSafe } from '@/hooks/useTaxReferenceData';
import {
  AREA_DASHBOARD_ALL, buildAreaSegments, buildHeatmap, buildMemberRows, buildOverdueRows,
  buildStatusSegments, buildTopClients, createTaskClientResolver, emptyAreaDashboardFilters,
  filterAreaProjects, filterAreaTasks, scopeProjects, scopeTasks, type AreaDashboardFilters,
} from '@/lib/areaDashboardData';

export function useAreaDashboardController(area: AreaKey) {
  const [filters, setFilters] = useState<AreaDashboardFilters>(emptyAreaDashboardFilters);
  const { data: allProjects = [], isLoading: loadingProjects } = useFiscalDashProjects();
  const { data: allTasks = [], isLoading: loadingTasks } = useFiscalDashTasks();
  const { data: clients = [] } = useFiscalClientsList();
  const { data: contribuintes = [] } = useFiscalDashContribuintes();
  const { data: clientNames = [] } = useFiscalDashClientNames();
  const { data: areas = [], isLoading: loadingAreas } = useEstruturaAreas(area);
  const { data: equipes = [] } = useEstruturaEquipesByCategory(area);
  const { data: members = [] } = useTeamProfilesSafe();
  const today = useMemo(() => startOfDay(new Date()), []);

  const projects = useMemo(() => scopeProjects(allProjects, new Set(areas.map(item => item.id)), area), [allProjects, areas, area]);
  const scopedTasks = useMemo(() => scopeTasks(allTasks, new Set(projects.map(item => item.id))), [allTasks, projects]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map(item => [item.id, item])), [projects]);
  const clientMap = useMemo(() => Object.fromEntries([
    ...clientNames.map(item => [item.id, item.nome]), ...clients.map(item => [item.id, item.nome]),
  ]), [clientNames, clients]);
  const areaMap = useMemo(() => Object.fromEntries(areas.map(item => [item.id, item.name])), [areas]);
  const memberMap = useMemo(() => Object.fromEntries(members.map(item => [item.id, `${item.first_name} ${item.last_name}`.trim()])), [members]);
  const contribuinteMap = useMemo(() => Object.fromEntries(contribuintes.map(item => [item.id, item.cliente_id])), [contribuintes]);
  const resolveClientId = useMemo(() => createTaskClientResolver(projectMap, contribuinteMap), [projectMap, contribuinteMap]);
  const filteredProjects = useMemo(() => filterAreaProjects(projects, filters), [projects, filters]);
  const filteredTasks = useMemo(() => filterAreaTasks(
    scopedTasks, filters, new Set(filteredProjects.map(item => item.id)), resolveClientId, today,
  ), [scopedTasks, filters, filteredProjects, resolveClientId, today]);

  const totalTasks = filteredTasks.length;
  const doneTasks = filteredTasks.filter(task => task.status === 'done').length;
  const totalEstHours = filteredTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const overdueRows = useMemo(() => buildOverdueRows(
    filteredTasks, projectMap, memberMap, clientMap, resolveClientId, today,
  ), [filteredTasks, projectMap, memberMap, clientMap, resolveClientId, today]);
  const activeFiltersCount = Object.values(filters).filter(value => value && value !== AREA_DASHBOARD_ALL).length;

  return {
    area,
    areaBase: area === 'osg' ? '/equipe/osg' : '/equipe/tax',
    isLoading: loadingProjects || loadingTasks || loadingAreas,
    filters,
    setFilter: <Key extends keyof AreaDashboardFilters>(key: Key, value: AreaDashboardFilters[Key]) =>
      setFilters(current => ({ ...current, [key]: value })),
    clearFilters: () => setFilters(emptyAreaDashboardFilters),
    applyPreset: (preset: Partial<AreaDashboardFilters>) => setFilters({ ...emptyAreaDashboardFilters, ...preset }),
    activeFiltersCount,
    options: {
      clients: [...clients].sort((left, right) => (left.nome || '').localeCompare(right.nome || '')),
      projects: [...projects].sort((left, right) => left.name.localeCompare(right.name)),
      members: [...members].sort((left, right) => `${left.first_name || ''}`.localeCompare(`${right.first_name || ''}`)),
      equipes: [...equipes].sort((left, right) => left.name.localeCompare(right.name)),
    },
    metrics: {
      totalProjects: filteredProjects.length,
      activeProjects: filteredProjects.filter(project => project.status === 'active').length,
      completedProjects: filteredProjects.filter(project => project.status === 'completed').length,
      onHoldProjects: filteredProjects.filter(project => project.status === 'on_hold').length,
      totalTasks,
      doneTasks,
      completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      totalEstHours,
      overdueCount: overdueRows.length,
    },
    statusSegments: buildStatusSegments(filteredTasks),
    areaSegments: buildAreaSegments(filteredTasks, projectMap, areaMap),
    heatmap: buildHeatmap(filteredTasks, memberMap, today),
    overdueRows,
    memberRows: buildMemberRows(filteredTasks, memberMap, today),
    topClients: buildTopClients(filteredTasks, clientMap, resolveClientId),
  };
}

export type AreaDashboardController = ReturnType<typeof useAreaDashboardController>;
