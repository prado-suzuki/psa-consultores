import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

// Página de Tarefas da área TAX. O conteúdo vive no componente compartilhado
// <PainelTarefas /> (fonte única), aqui apenas envolvido pelo layout do Tax.
// A mesma ferramenta é renderizada na OSG (OsgDashboard) — alterações no painel
// refletem automaticamente nas duas áreas.
const FiscalDemandasTarefas = () => {
  // Lista de 1200px, Kanban de altura cheia e Gantt: a barra recolhe sozinha.
  useTelaDeTrabalhoLargo();

  return (
    <FiscalLayout title="Projetos e tarefas" subtitle="Acompanhe a execução por ordem de serviço">
      <PainelTarefas area="tax" />
    </FiscalLayout>
  );
};

export default FiscalDemandasTarefas;
