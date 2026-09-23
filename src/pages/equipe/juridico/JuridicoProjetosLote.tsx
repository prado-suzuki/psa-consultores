import { JuridicoLayout } from '@/components/equipe/juridico/JuridicoLayout';
import { ProjetosLoteContent } from '@/components/equipe/projetos-lote/ProjetosLoteContent';

const JuridicoProjetosLote = () => (
  <JuridicoLayout tela="projetosEmLote">
    <ProjetosLoteContent area="juridico" />
  </JuridicoLayout>
);

export default JuridicoProjetosLote;
