import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';

// Página de Tarefas da área TAX. O conteúdo vive no componente compartilhado
// <PainelTarefas /> (fonte única), aqui apenas envolvido pelo layout do Tax.
// A mesma ferramenta é renderizada na OSG (OsgDashboard) — alterações no painel
// refletem automaticamente nas duas áreas.
const FiscalDemandasTarefas = () => {
  return (
    <FiscalLayout title="Tarefas" subtitle="Gestão de tarefas e eventos">
      <PainelTarefas area="tax" />
    </FiscalLayout>
  );
};

export default FiscalDemandasTarefas;
