import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { DashboardClientesOsContent } from '@/pages/equipe/board/BoardDashboardClientesOs';

/**
 * Área "Gerencial" da Tax (restrita a líder+ pela LiderRoute).
 *
 * Reaproveita o dashboard nativo de Clientes e OS (mesmo componente do Board),
 * agora dentro do layout da Tax. Clientes e OS já vêm escopados por cluster pela
 * RLS; a aba de projetos (org_projects, cuja RLS segue a regra de projetos, não
 * o cluster) é restrita aos clientes visíveis via scopeProjetosAClientesVisiveis.
 */
const FiscalGerencial = () => (
  <FiscalLayout title="Gerencial" subtitle="Clientes e OS do seu cluster">
    <DashboardClientesOsContent scopeProjetosAClientesVisiveis />
  </FiscalLayout>
);

export default FiscalGerencial;
