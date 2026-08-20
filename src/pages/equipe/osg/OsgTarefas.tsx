import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

// Página de Tarefas da área OSG. Usa o MESMO componente compartilhado da área TAX
// (<PainelTarefas />), apenas envolvido pelo layout da OSG. Espelhamento total:
// qualquer mudança no painel vale para Tax e OSG. A estilização por área (futuro)
// será feita parametrizando o painel — sem duplicar o componente.
const OsgTarefas = () => {
  // Lista de 1200px, Kanban de altura cheia e Gantt: a barra recolhe sozinha.
  useTelaDeTrabalhoLargo();

  return (
    <OsgLayout title="Projetos e tarefas" subtitle="Acompanhe a execução por ordem de serviço">
      <PainelTarefas area="osg" />
    </OsgLayout>
  );
};

export default OsgTarefas;
