import { FeedComentarios } from '@/components/comentarios/feed/FeedComentarios';
import { AuditoriaLayout } from '@/components/equipe/auditoria/AuditoriaLayout';

const AuditoriaFeed = () => (
  <AuditoriaLayout tela="feed" rolagemNoConteudo>
    <FeedComentarios area="auditoria" />
  </AuditoriaLayout>
);

export default AuditoriaFeed;
