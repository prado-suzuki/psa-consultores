import { FeedComentarios } from '@/components/comentarios/feed/FeedComentarios';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';

// Página de Feed da área TAX. O conteúdo vive no componente compartilhado
// <FeedComentarios /> (fonte única), aqui apenas envolvido pelo layout do Tax —
// mesmo espelhamento do <PainelTarefas />. O stream é único: lista comentários
// de projetos das duas áreas, e o `area` só define a moldura e a base dos links.
const FiscalFeed = () => {
  return (
    <FiscalLayout
      title="Feed"
      subtitle="O que está sendo conversado nos seus projetos e tarefas"
    >
      <FeedComentarios area="tax" />
    </FiscalLayout>
  );
};

export default FiscalFeed;
