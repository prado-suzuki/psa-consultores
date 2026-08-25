import { useMemo } from 'react';
import { useAreaDashboardController } from '@/hooks/useAreaDashboardController';
import type { AreaDashboardScope } from '@/lib/areaDashboardData';
import { AreaDashboardFilters } from '@/components/equipe/area-dashboard/AreaDashboardFilters';
import { AreaDashboardInsights } from '@/components/equipe/area-dashboard/AreaDashboardInsights';
import { AreaDashboardOverview } from '@/components/equipe/area-dashboard/AreaDashboardOverview';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardCapacidade } from '@/lib/agenteContextoCapacidade';

/**
 * Miolo do dashboard de área — montado pelo Tax, pela OSG e, com `area="todas"`,
 * pelo Board, que soma as duas.
 *
 * `escopoAgente` vem VAZIO por padrão: este miolo roda em três lugares, e
 * publicar o escopo do Board no Tax faria o agente responder como se a pessoa
 * estivesse no Board — mesmo número, tela errada. Cada área liga o seu.
 */
export function AreaDashboardContent({
  area = 'tax',
  escopoAgente = '',
}: {
  area?: AreaDashboardScope;
  escopoAgente?: string;
}) {
  const dashboard = useAreaDashboardController(area);

  const contextoAgente = useMemo(() => (escopoAgente ? contextoBoardCapacidade({
    escopoArea: area,
    filtrosAtivos: dashboard.activeFiltersCount,
    metrics: dashboard.metrics,
    atrasadas: dashboard.overdueRows,
    membros: dashboard.memberRows,
    topClientes: dashboard.topClients,
    carregando: dashboard.isLoading,
  }) : null), [
    escopoAgente, area, dashboard.activeFiltersCount, dashboard.metrics,
    dashboard.overdueRows, dashboard.memberRows, dashboard.topClients, dashboard.isLoading,
  ]);
  useRegistrarContextoAgente(escopoAgente, contextoAgente, dashboard.isLoading);

  return <div className="space-y-6">
    <AreaDashboardFilters dashboard={dashboard} />
    <AreaDashboardOverview dashboard={dashboard} />
    <AreaDashboardInsights dashboard={dashboard} />
  </div>;
}
