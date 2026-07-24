import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ProjetosLoteContent } from '@/components/equipe/projetos-lote/ProjetosLoteContent';

const FiscalProjetosLote = () => (
  <FiscalLayout title="Criar projetos em lote" subtitle="Um projeto por produto da Ordem de Serviço">
    <ProjetosLoteContent />
  </FiscalLayout>
);

export default FiscalProjetosLote;
