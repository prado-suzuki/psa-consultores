import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { DashboardClientesOsContent } from '@/pages/equipe/board/BoardDashboardClientesOs';

/**
 * Área "Gerencial" do OSG Projects (restrita a líder+ pela LiderRoute).
 *
 * Espelha a Gerencial da Tax: reaproveita o dashboard nativo de Clientes e OS,
 * agora dentro do layout da OSG (paleta osg-*). Clientes e OS já vêm escopados
 * por cluster pela RLS; a aba de projetos é restrita aos clientes visíveis via
 * scopeProjetosAClientesVisiveis (mesma prop usada na Tax).
 */
const OsgGerencial = () => (
  <OsgLayout title="Gerencial" subtitle="Clientes e OS do seu cluster">
    <DashboardClientesOsContent scopeProjetosAClientesVisiveis />
  </OsgLayout>
);

export default OsgGerencial;
