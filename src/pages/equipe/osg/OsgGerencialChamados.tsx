import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ChamadosGestaoContent } from '@/pages/gestao/GestaoChamados';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

/**
 * Gestão de Chamados dentro da Gerencial da OSG.
 *
 * Espelha a montagem da Tax, com a moldura da OSG. O miolo é o mesmo arquivo.
 *
 * Esta tela nasce vazia, e isso é esperado: não existe nenhum chamado com cluster
 * OSG — os 335 classificados estão todos no TAX (medido em 20/08/2026; eram 329 em
 * 07/08). O vazio agora DIZ o escopo ("Nenhum chamado em OSG"), que é o que
 * distingue "recortou e não achou" de "quebrou".
 *
 * Antes do `escopo`, esta tela mostrava para um admin os 335 chamados do TAX sob a
 * moldura musgo da OSG — cor afirmando um recorte que a lista não tinha.
 */
const OsgGerencialChamados = () => {
  // Tabela de 14 colunas com rolagem horizontal e coluna de ações congelada.
  useTelaDeTrabalhoLargo();

  return (
    <OsgLayout title="Gestão de Chamados" subtitle="Chamados dos clientes do seu cluster">
      <ChamadosGestaoContent basePath="/equipe/osg/gerencial/chamados" escopo="osg" />
    </OsgLayout>
  );
};

export default OsgGerencialChamados;
