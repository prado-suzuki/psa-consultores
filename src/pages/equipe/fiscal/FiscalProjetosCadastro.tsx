import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ProjetosCadastroContent } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContent';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';

const FiscalProjetosCadastro = () => (
  <FiscalLayout title="Projetos e tarefas" subtitle="Acompanhe a execução por ordem de serviço">
    <PainelTarefas area="tax" />
  </FiscalLayout>
);

export default FiscalProjetosCadastro;
export { ProjetosCadastroContent };
