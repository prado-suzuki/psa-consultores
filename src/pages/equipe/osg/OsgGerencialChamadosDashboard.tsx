import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ChamadosDashboardContent } from '@/pages/gestao/GestaoChamadosDashboard';

/** Dashboard de Chamados dentro da Gerencial da OSG. Ver a versão da Tax. */
const OsgGerencialChamadosDashboard = () => (
  <OsgLayout tela="chamadosIndicadores">
    <ChamadosDashboardContent listaPath="/equipe/osg/gerencial/chamados" />
  </OsgLayout>
);

export default OsgGerencialChamadosDashboard;
