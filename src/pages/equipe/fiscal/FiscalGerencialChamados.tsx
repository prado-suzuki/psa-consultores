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
 * A DIVERGÊNCIA COM AS OUTRAS ÁREAS É DELIBERADA. O miolo é compartilhado, mas o
 * título é escrito à mão em cada arquivo — então renomear aqui NÃO renomeia a OSG,
 * o Board nem a Gestão, que seguem com o nome antigo. Isso foi autorizado: só a
 * Tax tem tarefa de revisão de conteúdo nesta sprint, a OSG não tem um único
 * chamado classificado, e o Board já se chamava "Chamados". Se a coordenação
 * decidir que as outras acompanham, são 6 títulos, os 2 rótulos de menu da OSG
 * (no `OsgLayout`) e 3 `page_name` — a Gestão não entra na conta, porque
 * `/gestao/chamados` e `/gestao/chamados/dashboard` já são redirecionamentos
 * para cá.
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
    <FiscalLayout title="Lista de Chamados" subtitle="Consulte e gerencie os chamados dos clientes da sua carteira.">
      <ChamadosGestaoContent basePath="/equipe/tax/gerencial/chamados" escopo="tax" />
    </FiscalLayout>
  );
};

export default FiscalGerencialChamados;
