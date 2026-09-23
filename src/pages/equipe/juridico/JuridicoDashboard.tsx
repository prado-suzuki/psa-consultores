import { JuridicoLayout } from '@/components/equipe/juridico/JuridicoLayout';
import { DashboardContent } from '@/pages/equipe/fiscal/FiscalDashboard';

const JuridicoDashboard = () => (
  <JuridicoLayout tela="dashboard">
    <DashboardContent area="juridico" />
  </JuridicoLayout>
);

export default JuridicoDashboard;
