import { FeedComentarios } from '@/components/comentarios/feed/FeedComentarios';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';

// Página de Feed da área OSG. Usa o MESMO componente compartilhado da área
// TAX (<FeedComentarios />), apenas envolvido pelo layout da OSG — espelhamento
// idêntico ao do <PainelTarefas />.
const OsgFeed = () => {
  return (
    <OsgLayout
      tela="feed"
      // Mesmo motivo da Tax: só a lista do feed rola.
      rolagemNoConteudo
    >
      <FeedComentarios area="osg" />
    </OsgLayout>
  );
};

export default OsgFeed;
