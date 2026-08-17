import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { ChamadoDetalheContent } from '@/pages/gestao/GestaoDetalhesChamado';

/**
 * Detalhe do chamado dentro do Board.
 *
 * Existe pelo mesmo motivo da versão da Tax: sem esta rota, o "Ver" da lista
 * levava para `/gestao/chamados/:id` e a barra lateral trocava para a do
 * Marketing no meio do fluxo.
 */
const BoardChamadoDetalhe = () => (
  <BoardLayout title="Detalhes do Chamado" subtitle="Chamado do cliente">
    <ChamadoDetalheContent listaPath="/equipe/board/chamados" />
  </BoardLayout>
);

export default BoardChamadoDetalhe;
