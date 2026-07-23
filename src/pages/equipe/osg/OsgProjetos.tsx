import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';

// Projetos da área OSG — espelha o Cadastro de Projetos do Tax usando o MESMO
// conteúdo compartilhado (<ProjetosCadastroContent />), no layout da OSG.
// A prop `area="osg"` filtra a lista por cluster (sem afetar escrita).
const OsgProjetos = () => (
  <OsgLayout title="Projetos e tarefas" subtitle="Acompanhe a execução por ordem de serviço">
    <PainelTarefas area="osg" />
  </OsgLayout>
);

export default OsgProjetos;
