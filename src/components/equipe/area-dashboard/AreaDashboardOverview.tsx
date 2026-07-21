import { AlertCircle, AlertTriangle, CheckCircle, Clock, FolderKanban, ListChecks, Sparkles } from 'lucide-react';
import { HeroBanner, KpiHero } from '@/components/dashboard/momentum';
import type { AreaDashboardController } from '@/hooks/useAreaDashboardController';

export function AreaDashboardOverview({ dashboard }: { dashboard: AreaDashboardController }) {
  const { area, isLoading, activeFiltersCount, metrics } = dashboard;
  const { totalProjects, activeProjects, completedProjects, onHoldProjects, totalTasks, doneTasks,
    completionRate, totalEstHours, overdueCount } = metrics;
  return <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiHero label="Projetos Ativos" value={activeProjects} icon={<FolderKanban className="h-3.5 w-3.5" />}
        variation={totalProjects > 0 ? { label: `${Math.round((activeProjects / totalProjects) * 100)}% do portfólio` } : { label: 'sem projetos cadastrados' }} loading={isLoading} />
      <KpiHero label="Taxa de Conclusão" value={`${completionRate}%`} icon={<CheckCircle className="h-3.5 w-3.5" />}
        variation={{ label: `${doneTasks} de ${totalTasks} tarefas concluídas` }} loading={isLoading} />
      <KpiHero label="Tarefas Atrasadas" value={overdueCount} icon={<AlertCircle className="h-3.5 w-3.5" />}
        variation={{ label: overdueCount > 0 ? 'requerem ação imediata' : 'nenhuma pendência' }} loading={isLoading} />
      <KpiHero label="Horas Planejadas" value={`${totalEstHours.toFixed(0)}h`} icon={<Clock className="h-3.5 w-3.5" />}
        variation={{ label: totalTasks > 0 ? `${Math.round(totalEstHours / totalTasks)}h em média por tarefa` : 'sem tarefas planejadas' }} variant="solid" loading={isLoading} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <HeroBanner area={area} className="lg:col-span-2" eyebrow={area === 'osg' ? 'PSA OSG' : 'PSA Tax'}
        title={overdueCount === 0 ? 'Operação sem atrasos — momentum alto' : `${overdueCount} tarefas precisam de atenção`}
        description={activeFiltersCount > 0
          ? `Visão com ${activeFiltersCount} filtro(s) aplicado(s). ${totalTasks} tarefas no recorte atual.`
          : overdueCount === 0
            ? 'Todas as tarefas estão dentro do prazo. Mantenha o ritmo da execução e a aderência à agenda planejada.'
            : 'Identifique as tarefas com maior atraso e re-priorize. A tabela abaixo mostra o ranking por dias de atraso.'}
        icon={<Sparkles className="h-6 w-6 text-white" />} />
      <div className="grid grid-cols-2 gap-4">
        <KpiHero label="Total Projetos" value={totalProjects} icon={<FolderKanban className="h-3.5 w-3.5" />} loading={isLoading} />
        <KpiHero label="Concluídos" value={completedProjects} icon={<CheckCircle className="h-3.5 w-3.5" />} loading={isLoading} />
        <KpiHero label="Pausados" value={onHoldProjects} icon={<AlertTriangle className="h-3.5 w-3.5" />} loading={isLoading} />
        <KpiHero label="Total Tarefas" value={totalTasks} icon={<ListChecks className="h-3.5 w-3.5" />} loading={isLoading} />
      </div>
    </div>
  </>;
}
