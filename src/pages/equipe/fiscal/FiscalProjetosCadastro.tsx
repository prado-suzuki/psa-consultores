import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ProjetosCadastroContent } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContent';

const FiscalProjetosCadastro = () => (
  <FiscalLayout title="Projetos Tax" subtitle="Gerencie os projetos da área Tax">
    <ProjetosCadastroContent />
  </FiscalLayout>
);

export default FiscalProjetosCadastro;
export { ProjetosCadastroContent };
