import { AreaDashboardContent } from '@/components/equipe/area-dashboard/AreaDashboardContent';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';

const FiscalDashboard = () => (
  <FiscalLayout tela="dashboard">
    <AreaDashboardContent area="tax" />
  </FiscalLayout>
);

export default FiscalDashboard;
export { AreaDashboardContent as DashboardContent };
