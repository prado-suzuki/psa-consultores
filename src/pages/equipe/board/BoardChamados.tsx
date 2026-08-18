import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { ChamadosGestaoContent } from '@/pages/gestao/GestaoChamados';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

/**
 * Gestão de Chamados no Board.
 *
 * Mesmo miolo da Gerencial da Tax e da OSG (`ChamadosGestaoContent`), montado no
 * `BoardLayout`. Não há cópia: mexer na lista de chamados no módulo muda também
 * esta tela.
 *
 * O escopo NÃO é decidido aqui. A RLS de `tickets` entrega o que a pessoa
 * alcança — para o sócio/admin isso é a empresa inteira, que é justamente o
 * consolidado que o Board existe para mostrar. Na Tax e na OSG a mesma tela
 * aparece recortada pelo cluster de quem olha.
 */
const BoardChamados = () => {
  // Tabela de 14 colunas com rolagem horizontal e coluna de ações congelada.
  // A declaração fica aqui, e não no `ChamadosGestaoContent`, porque as três
  // telas que o montam podem divergir quanto a isso sem se atrapalhar.
  useTelaDeTrabalhoLargo();

  return (
    <BoardLayout title="Chamados" subtitle="Chamados de todas as áreas">
      <ChamadosGestaoContent basePath="/equipe/board/chamados" />
    </BoardLayout>
  );
};

export default BoardChamados;
