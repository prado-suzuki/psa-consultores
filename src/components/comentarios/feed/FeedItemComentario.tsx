import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CornerDownRight, Reply } from 'lucide-react';

import { tomDoAutor } from '@/components/comentarios/feed/avatarDoAutor';
import { AttachmentButton } from '@/components/comentarios/OrgCommentAttachments';
import { OrgCommentBody } from '@/components/comentarios/OrgCommentBody';
import {
  abrirAnexoEmNovaAba,
  useDownloadOrgCommentAttachment,
  type OrgCommentAttachment,
} from '@/hooks/useDomainOrgComments';
import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';
import {
  AUTOR_DO_EVENTO,
  corpoDoEvento,
  ehEventoDeSistema,
  rotuloDoEvento,
} from '@/lib/orgCommentEventos';
import { iniciaisDoNome } from '@/lib/orgCommentMentions';
import { cn } from '@/lib/utils';

interface FeedItemComentarioProps {
  comentario: FeedComentario;
  /** Resposta dentro da thread: avatar menor e cotovelo entrando nele. */
  nested?: boolean;
  /** Última resposta da thread — encerra o fio no próprio cotovelo. */
  ultima?: boolean;
  /** A raiz tem respostas (ou campo de resposta aberto): o fio desce do avatar. */
  abreThread?: boolean;
  /** Continuação da fala de cima (mesma pessoa, poucos minutos): sem avatar nem nome. */
  continuaBloco?: boolean;
  onResponder?: () => void;
}

/**
 * Uma fala do feed: quem falou, a que hora e o quê.
 *
 * O desenho da thread é o **mesmo do painel da tarefa** (`OrgCommentsPanel`): fio
 * contínuo descendo do avatar da raiz e cotovelo entrando no avatar de cada
 * resposta. Só a moldura é diferente — aqui a conversa mora dentro do bloco de
 * origem, e a origem quem mostra é o cabeçalho dele.
 *
 * A data também não aparece aqui: vem do rótulo do dia, então basta a hora.
 */
export function FeedItemComentario({
  comentario,
  nested = false,
  ultima = false,
  abreThread = false,
  continuaBloco = false,
  onResponder,
}: FeedItemComentarioProps) {
  const downloadAttachment = useDownloadOrgCommentAttachment();
  const criadoEm = new Date(comentario.created_at);
  /*
   * Evento de sistema usa o MESMO desenho do painel da tarefa: avatar "PSA",
   * título do evento no lugar do nome, corpo em caixa com barra lateral e sem
   * Responder. É o mesmo `org_comments` nas duas telas, e ler diferente em cada
   * uma só confundiria. Os textos vem de `@/lib/orgCommentEventos`, um lugar só.
   */
  const ehEvento = ehEventoDeSistema(comentario.kind);
  const corpo = ehEvento ? corpoDoEvento(comentario) : comentario.body;

  const abrirAnexo = async (attachment: OrgCommentAttachment) => {
    const resultado = await downloadAttachment.mutateAsync(attachment);
    abrirAnexoEmNovaAba(resultado.url, resultado.fileName);
  };

  return (
    <div className="relative">
      {nested && (
        <>
          {/*
            Cotovelo que entra no avatar da resposta, saindo do fio da raiz:
            `-left-6` devolve o traço ao eixo do fio, que corre 24px à esquerda
            da resposta (o `pl-10` do bloco menos o centro do avatar da raiz).
          */}
          <span
            aria-hidden
            data-thread-connector
            className="absolute -left-6 top-0 h-[22px] w-6 rounded-bl-lg border-b border-l border-border"
          />
          {/* Enquanto houver resposta abaixo, o fio segue descendo. */}
          {!ultima && (
            <span aria-hidden className="absolute -left-6 top-0 h-full w-px bg-border" />
          )}
        </>
      )}

      <div
        className={cn(
          'group/item relative flex rounded-lg pr-10 transition-colors hover:bg-muted/40',
          nested ? 'gap-2.5 pb-2 pt-1.5' : 'gap-3 pb-2 pt-2.5',
          continuaBloco && 'pt-0.5',
        )}
      >
        {/* Trecho do fio que desce do avatar da raiz até o começo das respostas. */}
        {abreThread && (
          <span aria-hidden className="absolute bottom-0 left-4 top-11 w-px bg-border" />
        )}

        {continuaBloco ? (
          /* Continuação não repete o avatar; a hora aparece na calha, no hover. */
          <time
            dateTime={comentario.created_at}
            className="w-8 shrink-0 pt-0.5 text-right text-[10px] tabular-nums leading-5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100"
          >
            {format(criadoEm, 'HH:mm')}
          </time>
        ) : (
          <span
            aria-hidden
            className={cn(
              'relative z-10 grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-card',
              nested ? 'h-7 w-7 text-[9px]' : 'h-8 w-8 text-[10px]',
              ehEvento ? 'bg-primary/10 text-primary' : tomDoAutor(comentario.author_id),
            )}
          >
            {ehEvento ? AUTOR_DO_EVENTO : iniciaisDoNome(comentario.author_name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          {!continuaBloco && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  'truncate font-semibold leading-tight',
                  nested ? 'text-[13px]' : 'text-sm',
                )}
              >
                {ehEvento
                  ? rotuloDoEvento(comentario.kind)
                  : comentario.author_name || 'Usuário removido'}
              </span>
              <time
                dateTime={comentario.created_at}
                title={format(criadoEm, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
              >
                {format(criadoEm, 'HH:mm')}
              </time>
              {/*
                A etiqueta só aparece na resposta cuja raiz ficou fora da leva —
                dentro da thread o cotovelo já diz que é resposta.
              */}
              {!nested && comentario.parent_id && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <CornerDownRight aria-hidden className="h-3 w-3" />
                  resposta
                </span>
              )}
              {comentario.editado_em && (
                <span className="text-[11px] italic text-muted-foreground">editado</span>
              )}
            </div>
          )}

          {/*
            Evento sem corpo próprio ("Tarefa aprovada" é só o título) não desenha
            caixa vazia: `corpoDoEvento` devolve string vazia e a linha some.
          */}
          {(!ehEvento || corpo) && (
            <div
              className={cn(
                'text-sm',
                continuaBloco ? 'mt-0' : 'mt-1',
                ehEvento && 'rounded-lg border-l-2 border-primary/40 bg-muted/35 px-3 py-2',
              )}
            >
              <OrgCommentBody body={corpo} />
            </div>
          )}

          {comentario.attachments.length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {comentario.attachments.map((attachment) => (
                <AttachmentButton key={attachment.id} attachment={attachment} onOpen={abrirAnexo} />
              ))}
            </div>
          )}
        </div>

        {/**
         * Responder sai do fluxo do texto e vira ação de canto: assim não sobra
         * um "Responder" embaixo de cada fala nem um buraco reservado para ele.
         * No dedo fica sempre visível; no mouse aparece ao passar pela fala.
         */}
        {onResponder && !ehEvento && (
          <button
            type="button"
            onClick={onResponder}
            title="Responder"
            aria-label="Responder"
            className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg border border-border/70 bg-card text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:opacity-0 sm:group-hover/item:opacity-100"
          >
            <Reply aria-hidden className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
