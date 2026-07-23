import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { DashboardClientesOsContent } from '@/pages/equipe/board/BoardDashboardClientesOs';

/**
 * Área "Gerencial" da Tax (restrita a líder+ pela LiderRoute).
 *
 * Reaproveita o dashboard nativo de Clientes e OS (mesmo componente do Board),
 * agora dentro do layout da Tax. O escopo por cluster é herdado da RLS das
 * tabelas consumidas pelo dashboard; o ajuste/estudo de RLS por cluster é a
 * etapa seguinte desta frente.
 */
const FiscalGerencial = () => (
  <FiscalLayout title="Gerencial" subtitle="Clientes e OS do seu cluster">
    <DashboardClientesOsContent />
  </FiscalLayout>
);

export default FiscalGerencial;
