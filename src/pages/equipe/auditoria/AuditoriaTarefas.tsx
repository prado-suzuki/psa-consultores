import { AuditoriaLayout } from '@/components/equipe/auditoria/AuditoriaLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

const AuditoriaTarefas = () => {
  useTelaDeTrabalhoLargo();

  return (
    <AuditoriaLayout tela="projetosETarefas">
      <PainelTarefas area="auditoria" />
    </AuditoriaLayout>
  );
};

export default AuditoriaTarefas;
