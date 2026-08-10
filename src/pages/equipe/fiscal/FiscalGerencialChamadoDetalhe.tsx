import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ChamadoDetalheContent } from '@/pages/gestao/GestaoDetalhesChamado';

/**
 * Detalhe do chamado dentro da Gerencial da Tax.
 *
 * Existe para o "Ver" da lista não jogar o líder para fora da área. Sem esta
 * rota, abrir um chamado a partir da Tax levava para `/gestao/chamados/:id` e a
 * barra lateral trocava para a do Marketing no meio do fluxo.
 */
const FiscalGerencialChamadoDetalhe = () => (
  <FiscalLayout title="Detalhes do Chamado" subtitle="Chamado do cliente">
    <ChamadoDetalheContent listaPath="/equipe/tax/gerencial/chamados" />
  </FiscalLayout>
);

export default FiscalGerencialChamadoDetalhe;
