import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ProjetosLoteContent } from '@/components/equipe/projetos-lote/ProjetosLoteContent';

// Criação de projetos em lote da OSG — mesmo conteúdo compartilhado do Tax
// (<ProjetosLoteContent />), no layout da OSG. A prop `area="osg"` faz a tela
// oferecer as equipes da OSG e voltar para as rotas da própria área.
const OsgProjetosLote = () => (
  <OsgLayout title="Criar projetos em lote" subtitle="Um projeto por produto da Ordem de Serviço">
    <ProjetosLoteContent area="osg" />
  </OsgLayout>
);

export default OsgProjetosLote;
