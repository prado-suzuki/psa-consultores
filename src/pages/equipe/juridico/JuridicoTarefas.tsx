import { JuridicoLayout } from '@/components/equipe/juridico/JuridicoLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

const JuridicoTarefas = () => {
  useTelaDeTrabalhoLargo();

  return (
    <JuridicoLayout tela="projetosETarefas">
      <PainelTarefas area="juridico" />
    </JuridicoLayout>
  );
};

export default JuridicoTarefas;
