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
    <FiscalLayout title="Gestão de Chamados" subtitle="Chamados dos clientes da sua carteira">
      <ChamadosGestaoContent basePath="/equipe/tax/gerencial/chamados" escopo="tax" />
    </FiscalLayout>
  );
};

export default FiscalGerencialChamados;
