import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

// Projetos da área OSG — espelha o Cadastro de Projetos do Tax usando o MESMO
// conteúdo compartilhado (<ProjetosCadastroContent />), no layout da OSG.
// A prop `area="osg"` filtra a lista por cluster (sem afetar escrita).
const OsgProjetos = () => {
  // Lista de 1200px, Kanban de altura cheia e Gantt: a barra recolhe sozinha.
  useTelaDeTrabalhoLargo();

  return (
    <OsgLayout title="Projetos e tarefas" subtitle="Acompanhe a execução por ordem de serviço">
      <PainelTarefas area="osg" />
    </OsgLayout>
  );
};

export default OsgProjetos;
