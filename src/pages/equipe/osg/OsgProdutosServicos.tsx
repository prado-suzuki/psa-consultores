import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import ProdutosServicosTab from '@/components/equipe/ProdutosServicosTab';
import { useDomainClusterPorCategoria } from '@/hooks/useDomainClusterPorCategoria';

/**
 * Produtos & Serviços dentro da Gerencial do OSG (restrita a líder+ pela
 * `LiderRoute`), espelho da versão Tax — e as duas são a MESMA bancada de
 * `/equipe/acessos`, o componente e não uma cópia.
 *
 * Isso é o que impede a divergência que três telas convidariam: o que se marca
 * aqui decide se um projeto NOVO daquele produto nasce com aquela tarefa, e a
 * resposta tem de ser uma só, venha de qual endereço vier. O único ajuste por
 * área é onde a bancada ABRE — aqui, no cluster do OSG.
 *
 * O cluster vem da CATEGORIA e nunca do nome nem de uuid no código: 'osg' é
 * categoria fechada em `protectedPages.ts` e está em `estrutura_areas`. O nome
 * seria armadilha aqui em especial — existe uma área chamada "Trabalhos
 * compartilhados OSG" cuja categoria é 'tax' (ver `clusterPorCategoria.ts`).
 *
 * Enquanto o id não resolve, `clusterId` é `null` e a bancada abre em "Todos":
 * mostra produto a mais, nunca a menos, que é o lado seguro de errar numa tela
 * de curadoria.
 */
const OsgProdutosServicos = () => {
  const { clusterId } = useDomainClusterPorCategoria('osg');

  return (
    <OsgLayout
      title="Produtos & Serviços"
      subtitle="Os serviços que cada produto gera em projeto novo"
    >
      <ProdutosServicosTab clusterInicial={clusterId} />
    </OsgLayout>
  );
};

export default OsgProdutosServicos;
