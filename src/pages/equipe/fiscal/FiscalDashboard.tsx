import { AreaDashboardContent } from '@/components/equipe/area-dashboard/AreaDashboardContent';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';

const FiscalDashboard = () => (
  <FiscalLayout title="Dashboard" subtitle="Acompanhe os principais indicadores operacionais da área Tax em tempo real.">
    <AreaDashboardContent area="tax" />
  </FiscalLayout>
);

export default FiscalDashboard;
export { AreaDashboardContent as DashboardContent };
