import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { DashboardClientesOsContent } from '@/pages/equipe/board/BoardDashboardClientesOs';
import { DashboardEmbedView } from '@/components/dashboards/DashboardEmbedView';

/**
 * Área "Gerencial" da Tax (restrita a líder+ pela LiderRoute).
 *
 * Um seletor só, no formato do Board → Relatórios: a primeira opção é o
 * dashboard nativo de Clientes e OS, as demais são os relatórios do Looker
 * cadastrados com target_page = "tax_gerencial" em /equipe/acessos.
 *
 * Clientes e OS já vêm escopados por cluster pela RLS; a aba de projetos
 * (org_projects, cuja RLS segue a regra de projetos, não o cluster) é restrita
 * aos clientes visíveis via scopeProjetosAClientesVisiveis. Os relatórios do
 * Looker devem ser cadastrados com filter_type = "cluster", senão a tela mostra
 * dado de fora do cluster e desmente o subtítulo.
 */
const FiscalGerencial = () => (
  <FiscalLayout title="Gerencial" subtitle="Clientes e OS do seu cluster">
    <DashboardEmbedView
      targetPage="tax_gerencial"
      loadingOverlay
      nativo={{
        nome: 'Clientes e OS',
        conteudo: <DashboardClientesOsContent scopeProjetosAClientesVisiveis />,
      }}
    />
  </FiscalLayout>
);

export default FiscalGerencial;
