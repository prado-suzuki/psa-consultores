import { AuditoriaLayout } from '@/components/equipe/auditoria/AuditoriaLayout';
import { ProjetosLoteContent } from '@/components/equipe/projetos-lote/ProjetosLoteContent';

const AuditoriaProjetosLote = () => (
  <AuditoriaLayout tela="projetosEmLote">
    <ProjetosLoteContent area="auditoria" />
  </AuditoriaLayout>
);

export default AuditoriaProjetosLote;
