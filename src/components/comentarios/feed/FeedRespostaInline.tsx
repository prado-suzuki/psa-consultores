import { useQueryClient } from '@tanstack/react-query';

import { CommentComposer } from '@/components/comentarios/CommentComposer';
import { feedComentariosQueryKey, type FeedComentario } from '@/hooks/useDomainFeedComentarios';
import { useDomainMentionCandidates } from '@/hooks/useDomainMentionCandidates';
import { useDomainOrgComments } from '@/hooks/useDomainOrgComments';
import { parentIdParaResposta, type AreaDeProjetos } from '@/lib/feedComentarios';

interface FeedRespostaInlineProps {
  comentario: FeedComentario;
  area: AreaDeProjetos;
  onCancelar: () => void;
  onRespondeu: () => void;
}

/**
 * Campo de resposta dentro do feed.
 *
 * Existe como componente próprio para ser montado **só** enquanto o item está em
 * modo resposta: é ele que carrega a thread da entidade e a lista de candidatos
 * a menção daquele projeto. Montado em todo item, seriam duas consultas por
 * comentário da página; assim são duas por resposta iniciada.
 *
 * A gravação não é reimplementada aqui — é a mesma mutation da thread
 * (`useDomainOrgComments.createComment`), que já cuida de upload de anexo, RPC
 * transacional, menções e auditoria.
 */
export function FeedRespostaInline({
  comentario,
  area,
  onCancelar,
  onRespondeu,
}: FeedRespostaInlineProps) {
  const queryClient = useQueryClient();
  const { createComment, isCreating } = useDomainOrgComments(
    comentario.entity_type,
    comentario.entity_id,
    area,
    comentario.project_id,
  );
  const { candidates: mentionCandidates } = useDomainMentionCandidates(
    comentario.entity_type,
    comentario.entity_id,
    comentario.project_id,
  );

  return (
    <CommentComposer
      compact
      isPending={isCreating}
      mentionCandidates={mentionCandidates}
      replyingToName={comentario.author_name}
      onCancel={onCancelar}
      onSubmit={async (body, files, mentions) => {
        await createComment.mutateAsync({
          body,
          files,
          mentions,
          parentId: parentIdParaResposta(comentario),
        });
        // A resposta é o comentário mais novo do sistema, então entra no topo do
        // feed. Invalidar refaz as páginas carregadas pelos cursores já
        // conhecidos, sem repetir nem perder item.
        await queryClient.invalidateQueries({ queryKey: feedComentariosQueryKey() });
        onRespondeu();
      }}
    />
  );
}
