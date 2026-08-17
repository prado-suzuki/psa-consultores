import { useAreaDashboardController } from '@/hooks/useAreaDashboardController';
import type { AreaDashboardScope } from '@/lib/areaDashboardData';
import { AreaDashboardFilters } from '@/components/equipe/area-dashboard/AreaDashboardFilters';
import { AreaDashboardInsights } from '@/components/equipe/area-dashboard/AreaDashboardInsights';
import { AreaDashboardOverview } from '@/components/equipe/area-dashboard/AreaDashboardOverview';

/**
 * Miolo do dashboard de área — montado pelo Tax, pela OSG e, com `area="todas"`,
 * pelo Board, que soma as duas.
 */
export function AreaDashboardContent({ area = 'tax' }: { area?: AreaDashboardScope }) {
  const dashboard = useAreaDashboardController(area);
  return <div className="space-y-6">
    <AreaDashboardFilters dashboard={dashboard} />
    <AreaDashboardOverview dashboard={dashboard} />
    <AreaDashboardInsights dashboard={dashboard} />
  </div>;
}
