import type { AreaKey } from '@/config/areaCategories';
import { useAreaDashboardController } from '@/hooks/useAreaDashboardController';
import { AreaDashboardFilters } from '@/components/equipe/area-dashboard/AreaDashboardFilters';
import { AreaDashboardInsights } from '@/components/equipe/area-dashboard/AreaDashboardInsights';
import { AreaDashboardOverview } from '@/components/equipe/area-dashboard/AreaDashboardOverview';

export function AreaDashboardContent({ area = 'tax' }: { area?: AreaKey }) {
  const dashboard = useAreaDashboardController(area);
  return <div className="space-y-6">
    <AreaDashboardFilters dashboard={dashboard} />
    <AreaDashboardOverview dashboard={dashboard} />
    <AreaDashboardInsights dashboard={dashboard} />
  </div>;
}
