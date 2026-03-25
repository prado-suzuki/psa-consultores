import { useState, useEffect } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { Button } from '@/components/ui/button';
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
  { value: 'todas', label: 'Todas' },
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
    <BoardLayout title="Performance" subtitle="Visao executiva consolidada">
      <div className="space-y-6">
        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3 sticky top-0 z-10 py-3 -mx-6 px-6" style={{ backgroundColor: 'var(--board-bg)', borderBottom: '1px solid var(--board-border)' }}>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--board-border)' }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className="px-3 py-[5px] text-[12px] font-medium transition-all"
                style={{
                  backgroundColor: periodo === p.value ? 'var(--board-indigo)' : 'var(--board-card)',
                  color: periodo === p.value ? '#fff' : 'var(--board-t2)',
                  borderRight: '1px solid var(--board-border)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--board-border)' }}>
            {AREAS.map(a => (
              <button
                key={a.value}
                onClick={() => handleAreaChange(a.value)}
                className="px-3 py-[5px] text-[12px] font-medium transition-all"
                style={{
                  backgroundColor: area === a.value ? 'var(--board-indigo)' : 'var(--board-card)',
                  color: area === a.value ? '#fff' : 'var(--board-t2)',
                  borderRight: '1px solid var(--board-border)',
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px]" style={{ color: 'var(--board-t4)' }}>
              Atualizado: {format(lastUpdate, "HH:mm", { locale: ptBR })}
            </span>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-[6px] px-3 py-[5px] rounded-lg text-[12px] font-medium transition-all"
              style={{ border: '1px solid var(--board-border)', color: 'var(--board-t2)', backgroundColor: 'var(--board-card)' }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          </div>
        </div>

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

        <ProjectsBlock projects={projects} isLoading={projectsQuery.isLoading} />
        <AreaComparisonBlock projects={projects} periodTasks={last3MonthsTasks} isLoading={projectsQuery.isLoading || last3MonthsTasksQuery.isLoading} />
        <TeamContributionBlock
          members={members}
          profiles={profiles}
          periodTasks={periodTasks}
          heatmapTasks={heatmapTasks}
          metas={metas}
          isLoading={membersQuery.isLoading || periodTasksQuery.isLoading}
        />
        <AutomationImpactBlock roiData={roiData} isLoading={roiQuery.isLoading} />
        <CycleGoalsBlock ciclo={ciclo} metas={metas} profiles={profiles} isLoading={cicloQuery.isLoading} />
      </div>
    </BoardLayout>
  );
};

export default PerformanceDashboard;
