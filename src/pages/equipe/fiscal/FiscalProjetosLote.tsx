import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { ProjetosLoteContent } from '@/components/equipe/projetos-lote/ProjetosLoteContent';

const FiscalProjetosLote = () => (
  <FiscalLayout tela="projetosEmLote">
    <ProjetosLoteContent area="tax" />
  </FiscalLayout>
);

export default FiscalProjetosLote;
