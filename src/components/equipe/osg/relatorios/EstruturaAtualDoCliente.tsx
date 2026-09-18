import { useRelatorioDP } from '@/hooks/useRelatorioDP';
import { EstruturaAtual } from '@/components/equipe/osg/relatorios/EstruturaAtual';

/**
 * O desenho de quem explora cada imóvel hoje, como relatório de tela próprio.
 *
 * A `EstruturaAtual` sempre soube desenhar sozinha — ela recebe os bens e devolve
 * o SVG. O que faltava era alguém buscar os bens: isso vivia dentro da "Abertura
 * de Demanda", que fazia UMA leitura e desenhava duas coisas. Separadas as duas,
 * cada uma busca o que precisa, e a query é a mesma chave de cache: abrir as
 * duas não lê o banco duas vezes.
 *
 * NÃO É O QUADRO SOCIETÁRIO. As faixas são PRODUTORES e IMÓVEIS — pessoas
 * físicas ligadas às terras que exploram, com a origem da posse. Sócio, quota e
 * participação são a outra peça, que hoje só existe como deck.
 */
export function EstruturaAtualDoCliente({
  clienteId,
  modoPrevia = false,
}: {
  clienteId: string;
  /** Repassado ao diagrama: sem cabeçalho e sem rolagem própria dentro do modal. */
  modoPrevia?: boolean;
}) {
  const { data: bens = [], isLoading } = useRelatorioDP(clienteId);

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando a estrutura atual…</p>;
  }

  return <EstruturaAtual bens={bens} modoPrevia={modoPrevia} />;
}

export default EstruturaAtualDoCliente;
