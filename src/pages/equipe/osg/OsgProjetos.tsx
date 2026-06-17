import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ProjetosCadastroContent } from '@/pages/equipe/fiscal/FiscalProjetosCadastro';

// Projetos da área OSG — espelha o Cadastro de Projetos do Tax usando o MESMO
// conteúdo compartilhado (<ProjetosCadastroContent />), no layout da OSG.
const OsgProjetos = () => (
  <OsgLayout title="Cadastro de Projetos" subtitle="Gerencie os projetos da área OSG">
    <ProjetosCadastroContent />
  </OsgLayout>
);

export default OsgProjetos;
