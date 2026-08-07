import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ChamadosDashboardContent } from '@/pages/gestao/GestaoChamadosDashboard';

/**
 * Dashboard de Chamados dentro da Gerencial da Tax.
 *
 * Até esta mudança a tela vivia em `/gestao/chamados/dashboard` e, por nunca ter
 * sido cadastrada em `page_permissions`, era tratada como página livre: qualquer
 * pessoa autenticada que digitasse o endereço a abria. Aqui ela nasce fechada,
 * porque a rota é de líder+ pelo `LiderRoute`.
 */
const FiscalGerencialChamadosDashboard = () => (
  <FiscalLayout title="Dashboard de Chamados" subtitle="Panorama operacional, prazos e responsáveis">
    <ChamadosDashboardContent listaPath="/equipe/tax/gerencial/chamados" />
  </FiscalLayout>
);

export default FiscalGerencialChamadosDashboard;
