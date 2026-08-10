import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ChamadosDashboardContent } from '@/pages/gestao/GestaoChamadosDashboard';

/** Dashboard de Chamados dentro da Gerencial da OSG. Ver a versão da Tax. */
const OsgGerencialChamadosDashboard = () => (
  <OsgLayout title="Dashboard de Chamados" subtitle="Panorama operacional, prazos e responsáveis">
    <ChamadosDashboardContent listaPath="/equipe/osg/gerencial/chamados" />
  </OsgLayout>
);

export default OsgGerencialChamadosDashboard;
