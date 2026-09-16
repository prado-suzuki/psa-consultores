import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ChamadosDashboardContent } from '@/pages/gestao/GestaoChamadosDashboard';

/**
 * Os indicadores de chamados dentro da Gerencial da Tax.
 *
 * CHAMAVA-SE "Dashboard de Chamados" até 15/09/2026. É a visão ANALÍTICA dos
 * mesmos chamados que a lista ao lado exibe; o par "Lista de Chamados" /
 * "Indicadores de Chamados" diferencia consulta operacional de análise. A OSG
 * exibe o mesmo par, e sem que ninguém tenha que lembrar: o texto sai de
 * `@/config/textosDasTelas`, e o invólucro só nomeia a tela.
 *
 * Até esta mudança a tela vivia em `/gestao/chamados/dashboard` e, por nunca ter
 * sido cadastrada em `page_permissions`, era tratada como página livre: qualquer
 * pessoa autenticada que digitasse o endereço a abria. Aqui ela nasce fechada,
 * porque a rota é de líder+ pelo `LiderRoute`.
 */
const FiscalGerencialChamadosDashboard = () => (
  <FiscalLayout tela="chamadosIndicadores">
    <ChamadosDashboardContent listaPath="/equipe/tax/gerencial/chamados" />
  </FiscalLayout>
);

export default FiscalGerencialChamadosDashboard;
