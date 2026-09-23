import { FeedComentarios } from '@/components/comentarios/feed/FeedComentarios';
import { JuridicoLayout } from '@/components/equipe/juridico/JuridicoLayout';

const JuridicoFeed = () => (
  <JuridicoLayout tela="feed" rolagemNoConteudo>
    <FeedComentarios area="juridico" />
  </JuridicoLayout>
);

export default JuridicoFeed;
