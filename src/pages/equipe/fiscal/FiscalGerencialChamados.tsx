import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ChamadosGestaoContent } from '@/pages/gestao/GestaoChamados';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

/**
 * Gestão de Chamados dentro da Gerencial da Tax.
 *
 * Mesma tela da área de Gestão, montada aqui dentro do `FiscalLayout`. O miolo
 * é o mesmo componente: não há cópia de arquivo, no padrão que a Gerencial já
 * usa com o dashboard de Clientes e OS.
 *
 * O escopo do que aparece NÃO é decidido aqui. A RLS de `tickets` já entrega só
 * o que a pessoa alcança (cluster dela, cliente visível, aberto por ela ou
 * atribuído a ela), e a rota é fechada a líder+ pelo `LiderRoute`.
 */
const FiscalGerencialChamados = () => {
  // Tabela de 14 colunas com rolagem horizontal e coluna de ações congelada.
  useTelaDeTrabalhoLargo();

  return (
    <FiscalLayout title="Gestão de Chamados" subtitle="Chamados dos clientes da sua carteira">
      <ChamadosGestaoContent basePath="/equipe/tax/gerencial/chamados" />
    </FiscalLayout>
  );
};

export default FiscalGerencialChamados;
