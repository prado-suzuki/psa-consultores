import { AuditoriaLayout } from '@/components/equipe/auditoria/AuditoriaLayout';
import { DashboardContent } from '@/pages/equipe/fiscal/FiscalDashboard';

const AuditoriaDashboard = () => (
  <AuditoriaLayout tela="dashboard">
    <DashboardContent area="auditoria" />
  </AuditoriaLayout>
);

export default AuditoriaDashboard;
