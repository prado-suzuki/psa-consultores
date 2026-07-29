import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, Reply } from 'lucide-react';

import { FeedRespostaInline } from '@/components/comentarios/feed/FeedRespostaInline';
import { AttachmentButton } from '@/components/comentarios/OrgCommentAttachments';
import { OrgCommentBody } from '@/components/comentarios/OrgCommentBody';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  abrirAnexoEmNovaAba,
  useDownloadOrgCommentAttachment,
  type OrgCommentAttachment,
} from '@/hooks/useDomainOrgComments';
import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';
import {
  hrefDeOrigem,
  origemDoComentario,
  type AreaDeProjetos,
} from '@/lib/feedComentarios';
import { iniciaisDoNome } from '@/lib/orgCommentMentions';

interface FeedItemComentarioProps {
  comentario: FeedComentario;
  area: AreaDeProjetos;
  respondendo: boolean;
  onResponder: () => void;
  onFecharResposta: () => void;
}

/**
 * Um comentário no feed: quem falou, quando, **de onde veio** e o que disse.
 *
 * A linha de origem é o que diferencia este item da thread — no painel da
 * tarefa o contexto é implícito, aqui ele é a informação principal e o caminho
 * de volta para o item que está sendo conversado.
 */
export function FeedItemComentario({
  comentario,
  area,
  respondendo,
  onResponder,
  onFecharResposta,
}: FeedItemComentarioProps) {
  const downloadAttachment = useDownloadOrgCommentAttachment();
  const origem = origemDoComentario(comentario);

  const abrirAnexo = async (attachment: OrgCommentAttachment) => {
    const resultado = await downloadAttachment.mutateAsync(attachment);
    abrirAnexoEmNovaAba(resultado.url, resultado.fileName);
  };

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 border">
          <AvatarFallback className="text-[10px] font-semibold">
            {iniciaisDoNome(comentario.author_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold">
              {comentario.author_name || 'Usuário removido'}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(comentario.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            {comentario.parent_id && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                resposta
              </span>
            )}
            {comentario.editado_em && (
              <span className="text-[10px] text-muted-foreground">editado</span>
            )}
          </div>

          <Link
            to={hrefDeOrigem(comentario, area)}
            className="group mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <span className="truncate">
              {origem.rotulo} <span className="font-medium">{origem.titulo}</span>
              {origem.projeto && <>, do projeto {origem.projeto}</>}
            </span>
            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <div className="mt-2">
            <OrgCommentBody body={comentario.body} />
          </div>

          {comentario.attachments.length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {comentario.attachments.map((attachment) => (
                <AttachmentButton
                  key={attachment.id}
                  attachment={attachment}
                  onOpen={abrirAnexo}
                />
              ))}
            </div>
          )}

          {respondendo ? (
            <FeedRespostaInline
              comentario={comentario}
              area={area}
              onCancelar={onFecharResposta}
              onRespondeu={onFecharResposta}
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 px-1 text-xs text-muted-foreground"
              onClick={onResponder}
            >
              <Reply className="mr-1 h-3.5 w-3.5" />
              Responder
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
