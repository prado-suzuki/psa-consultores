import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { DashboardContent } from '@/pages/equipe/fiscal/FiscalDashboard';

// Dashboard da área OSG — espelha o Dashboard do Tax usando o MESMO conteúdo
// compartilhado (<DashboardContent />), apenas envolvido pelo layout da OSG.
const OsgDashboard = () => (
  <OsgLayout title="Dashboard" subtitle="Visão geral da área OSG">
    <DashboardContent area="osg" />
  </OsgLayout>
);

export default OsgDashboard;
