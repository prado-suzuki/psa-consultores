import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ChamadosGestaoContent } from '@/pages/gestao/GestaoChamados';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

/**
 * A lista de chamados dentro da Gerencial da Tax.
 *
 * CHAMAVA-SE "Gestão de Chamados" até 15/09/2026. Esta é a visão em LISTA do
 * mesmo conjunto de dados que o painel analítico ao lado mostra, e o par "Lista
 * de Chamados" / "Indicadores de Chamados" é o que torna essa relação evidente.
 *
 * O TEXTO NÃO ESTÁ AQUI, e é de propósito: o invólucro nomeia a TELA e o texto
 * sai de `@/config/textosDasTelas`, um lugar só para as duas áreas. A OSG monta
 * esta mesma tela e lê a mesma entrada — renomear é uma linha lá, e as duas
 * mudam juntas. Foi assim que a divergência de 15/09/2026 acabou: por um dia, a
 * Tax dizia "Lista de Chamados" e a OSG seguia em "Gestão de Chamados", porque
 * o título era escrito à mão em cada arquivo.
 *
 * O BOARD monta o mesmo miolo e NÃO entra no espelho: ele tem registro próprio
 * ("Chamados", "Projetos", "Logs") e cabeçalho que nem usa o `TituloDaPagina`.
 * O motivo está escrito no cabeçalho do `textosDasTelas`.
 *
 * Mesma tela da área de Gestão, montada aqui dentro do `FiscalLayout`. O miolo
 * é o mesmo componente: não há cópia de arquivo, no padrão que a Gerencial já
 * usa com o dashboard de Clientes e OS.
 *
 * O escopo AGORA é decidido aqui, pelo `escopo` passado ao miolo. Antes vinha só
 * da RLS de `tickets`, que filtra pelos clusters DA PESSOA — para quem tem um
 * cluster só coincidia com a área da rota, mas por acidente: os cinco admins, que
 * a RLS não recorta, viam os 354 nesta tela. A RLS continua valendo por baixo (é
 * ela que garante o acesso); o `escopo` é o que faz a tela mostrar o que o
 * subtítulo promete. A rota segue fechada a líder+ pelo `LiderRoute`.
 */
const FiscalGerencialChamados = () => {
  // Tabela de 14 colunas com rolagem horizontal e coluna de ações congelada.
  useTelaDeTrabalhoLargo();

  return (
    <FiscalLayout tela="chamadosLista">
      <ChamadosGestaoContent basePath="/equipe/tax/gerencial/chamados" escopo="tax" />
    </FiscalLayout>
  );
};

export default FiscalGerencialChamados;
