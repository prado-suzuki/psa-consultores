import { useState, useEffect } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { usePerformanceData, useSavePerformancePrefs } from '@/hooks/usePerformanceData';
import { PerformanceKPICards } from '@/components/performance/PerformanceKPICards';
import { ProjectsBlock } from '@/components/performance/ProjectsBlock';
import { AreaComparisonBlock } from '@/components/performance/AreaComparisonBlock';
import { TeamContributionBlock } from '@/components/performance/TeamContributionBlock';
import { AutomationImpactBlock } from '@/components/performance/AutomationImpactBlock';
import { CycleGoalsBlock } from '@/components/performance/CycleGoalsBlock';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

const PERIODS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'ciclo', label: 'Ciclo atual' },
];

const AREAS = [
  { value: 'todas', label: 'Todas as áreas' },
  { value: 'tax', label: 'Tax' },
  { value: 'osg', label: 'OSG' },
  { value: 'dev', label: 'Dev' },
];

const PerformanceDashboard = () => {
  const [periodo, setPeriodo] = useState('30d');
  const [area, setArea] = useState('todas');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const queryClient = useQueryClient();
  const savePrefs = useSavePerformancePrefs();

  const {
    prefsQuery, cicloQuery, projectsQuery, ticketsQuery,
    membersQuery, metasQuery, periodTasksQuery, roiQuery,
    heatmapTasksQuery, last3MonthsTasksQuery,
  } = usePerformanceData(periodo, area);

  // Load saved preferences
  useEffect(() => {
    if (prefsQuery.data) {
      const prefs = prefsQuery.data as any;
      if (prefs.periodo_padrao) setPeriodo(prefs.periodo_padrao);
      if (prefs.area_padrao) setArea(prefs.area_padrao);
    }
  }, [prefsQuery.data]);

  const handlePeriodChange = (v: string) => {
    setPeriodo(v);
    savePrefs.mutate({ periodo_padrao: v });
  };

  const handleAreaChange = (v: string) => {
    setArea(v);
    savePrefs.mutate({ area_padrao: v });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        typeof query.queryKey[0] === 'string' &&
        (query.queryKey[0] as string).startsWith('perf'),
    });
    setLastUpdate(new Date());
  };

  const projects = projectsQuery.data || [];
  const tickets = ticketsQuery.data;
  const members = membersQuery.data?.members || [];
  const profiles = membersQuery.data?.profiles || [];
  const metas = metasQuery.data || [];
  const periodTasks = periodTasksQuery.data || [];
  const heatmapTasks = heatmapTasksQuery.data || [];
  const last3MonthsTasks = last3MonthsTasksQuery.data || [];
  const roiData = roiQuery.data || [];
  const ciclo = cicloQuery.data;

  const isInitialLoading = projectsQuery.isLoading && ticketsQuery.isLoading;

  return (
    <BoardLayout title="Performance" subtitle="Visão executiva consolidada">
      <div className="space-y-8">
        {/* Global controls */}
        <div className="flex flex-wrap items-center gap-3 sticky top-0 z-10 bg-slate-50 py-3 -mx-6 px-6 border-b border-border/40">
          <div className="flex border rounded-lg overflow-hidden">
            {PERIODS.map(p => (
              <Button
                key={p.value}
                variant={periodo === p.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handlePeriodChange(p.value)}
                className="rounded-none text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Select value={area} onValueChange={handleAreaChange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">
              Atualizado: {format(lastUpdate, "HH:mm", { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
          </div>
        </div>

        {/* Block 1 — KPIs */}
        <PerformanceKPICards
          projects={projects}
          tickets={tickets}
          totalMembers={profiles.length}
          activeMembers={members.length}
          metas={metas}
          ciclo={ciclo}
          roiData={roiData}
          periodTasks={periodTasks}
          isLoading={isInitialLoading}
        />

        {/* Block 2 — Projects */}
        <ProjectsBlock projects={projects} isLoading={projectsQuery.isLoading} />

        {/* Block 3 — Area Comparison (uses independent 3-month tasks) */}
        <AreaComparisonBlock projects={projects} periodTasks={last3MonthsTasks} isLoading={projectsQuery.isLoading || last3MonthsTasksQuery.isLoading} />

        {/* Block 4 — Team Contribution (heatmap uses independent 90-day tasks) */}
        <TeamContributionBlock
          members={members}
          profiles={profiles}
          periodTasks={periodTasks}
          heatmapTasks={heatmapTasks}
          metas={metas}
          isLoading={membersQuery.isLoading || periodTasksQuery.isLoading}
        />

        {/* Block 5 — Automation Impact */}
        <AutomationImpactBlock roiData={roiData} isLoading={roiQuery.isLoading} />

        {/* Block 6 — Cycle Goals */}
        <CycleGoalsBlock ciclo={ciclo} metas={metas} profiles={profiles} isLoading={cicloQuery.isLoading} />
      </div>
    </BoardLayout>
  );
};

export default PerformanceDashboard;
