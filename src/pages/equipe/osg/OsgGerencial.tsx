import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { DashboardClientesOsContent } from '@/pages/equipe/board/BoardDashboardClientesOs';
import { DashboardEmbedView } from '@/components/dashboards/DashboardEmbedView';

/**
 * Área "Gerencial" do OSG Projects (restrita a líder+ pela LiderRoute).
 *
 * Espelha a Gerencial da Tax: um seletor só, com o dashboard nativo de Clientes
 * e OS como primeira opção e os relatórios do Looker cadastrados com
 * target_page = "osg_gerencial" em /equipe/acessos.
 *
 * Clientes e OS já vêm escopados por cluster pela RLS; a aba de projetos é
 * restrita aos clientes visíveis via scopeProjetosAClientesVisiveis (mesma prop
 * usada na Tax). Os relatórios do Looker devem ser cadastrados com
 * filter_type = "cluster", senão a tela mostra dado de fora do cluster.
 */
const OsgGerencial = () => (
  <OsgLayout title="Gerencial" subtitle="Clientes e OS do seu cluster">
    <DashboardEmbedView
      targetPage="osg_gerencial"
      loadingOverlay
      nativo={{
        nome: 'Clientes e OS',
        conteudo: <DashboardClientesOsContent scopeProjetosAClientesVisiveis />,
      }}
    />
  </OsgLayout>
);

export default OsgGerencial;
