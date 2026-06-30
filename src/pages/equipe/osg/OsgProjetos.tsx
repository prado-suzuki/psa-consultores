import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ProjetosCadastroContent } from '@/pages/equipe/fiscal/FiscalProjetosCadastro';

// Projetos da área OSG — espelha o Cadastro de Projetos do Tax usando o MESMO
// conteúdo compartilhado (<ProjetosCadastroContent />), no layout da OSG.
// A prop `area="osg"` filtra a lista por cluster (sem afetar escrita).
const OsgProjetos = () => (
  <OsgLayout title="Projetos OSG" subtitle="Gerencie os projetos da área OSG">
    <ProjetosCadastroContent area="osg" />
  </OsgLayout>
);

export default OsgProjetos;
