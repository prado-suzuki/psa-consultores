import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import ProdutosServicosTab from '@/components/equipe/ProdutosServicosTab';
import { useDomainClusterPorCategoria } from '@/hooks/useDomainClusterPorCategoria';

/**
 * Produtos & Serviços dentro da Gerencial da Tax (restrita a líder+ pela
 * `LiderRoute`).
 *
 * É a MESMA bancada de `/equipe/acessos`, o componente e não uma cópia: o que
 * se marca aqui decide se um projeto NOVO daquele produto nasce com aquela
 * tarefa, e duas telas divergindo sobre isso seria pior do que uma só.
 *
 * POR QUE GERENCIAL E NÃO PROJETOS. O grupo Gerencial inteiro já é líder+, no
 * menu (`requiresLider`) e na rota (`LiderRoute`); Projetos é aberto ao
 * consultor. Pendurada em Projetos, a tela apareceria acesa para quem a rota
 * vai barrar — e o `children` do menu nem tem campo de papel para esconder um
 * item só. E o conteúdo casa: isto não é trabalho do dia, é a curadoria do
 * catálogo, a mesma família de Gestão de Chamados e Logs de Uso ao lado.
 *
 * O CLUSTER VEM DA CATEGORIA, nunca do nome nem de uuid no código — ver
 * `clusterPorCategoria.ts`. Enquanto ele não resolve, `clusterId` é `null` e a
 * bancada abre em "Todos": aqui isso mostra produto A MAIS, nunca a menos, que
 * é o lado seguro de errar numa tela de curadoria.
 */
const FiscalProdutosServicos = () => {
  const { clusterId } = useDomainClusterPorCategoria('tax');

  return (
    <FiscalLayout
      tela="produtosServicos"
    >
      <ProdutosServicosTab clusterInicial={clusterId} />
    </FiscalLayout>
  );
};

export default FiscalProdutosServicos;
