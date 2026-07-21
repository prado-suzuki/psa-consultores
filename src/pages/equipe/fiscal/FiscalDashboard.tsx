import { AreaDashboardContent } from '@/components/equipe/area-dashboard/AreaDashboardContent';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';

const FiscalDashboard = () => (
  <FiscalLayout title="Dashboard" subtitle="Visão geral da área fiscal — atualizado em tempo real">
    <AreaDashboardContent area="tax" />
  </FiscalLayout>
);

export default FiscalDashboard;
export { AreaDashboardContent as DashboardContent };
