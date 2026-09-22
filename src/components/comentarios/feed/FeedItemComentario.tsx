import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  CircleCheck,
  CircleDot,
  CornerDownRight,
  FileCheck2,
  FileClock,
  FileSpreadsheet,
  FileText,
  Reply,
  Send,
  Undo2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

import { tomDoAutor } from '@/components/comentarios/feed/avatarDoAutor';
import { AttachmentButton } from '@/components/comentarios/OrgCommentAttachments';
import { OrgCommentBody } from '@/components/comentarios/OrgCommentBody';
import {
  abrirAnexoEmNovaAba,
  useDownloadOrgCommentAttachment,
  type OrgCommentAttachment,
} from '@/hooks/useDomainOrgComments';
import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';
import { dataHoraCurta } from '@/lib/dateUtils';
import {
  corpoDoEvento,
  ehEventoDeSistema,
  pessoasDoEventoPartes,
  rotuloDoEvento,
  type OrgCommentEventoKind,
} from '@/lib/orgCommentEventos';
import { iniciaisDoNome } from '@/lib/orgCommentMentions';
import { cn } from '@/lib/utils';
import { ButtonTooltip } from '@/components/ui/button-tooltip';

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
  /** Fala recém-publicada: realce breve para o olho achar onde ela caiu. */
  realce?: boolean;
  /** Ainda não lida: chegou depois do carimbo deste cliente, e é de outra pessoa. */
  naoLida?: boolean;
  onResponder?: () => void;
}

/** Kind sem ícone aqui cai no genérico, como o rótulo cai em "Atualização do sistema". */
const ICONE_DO_EVENTO: Partial<Record<OrgCommentEventoKind, LucideIcon>> = {
  assignment_changed: UserRound,
  review_submitted: Send,
  review_approved: CircleCheck,
  review_adjustments: Undo2,
  status_changed: CircleDot,
  documentos_solicitados: FileText,
  documentos_cobrados: FileClock,
  documentos_conferidos: FileCheck2,
  papel_de_trabalho_importado: FileSpreadsheet,
  papel_de_trabalho_revisado: FileSpreadsheet,
};

/**
 * Uma fala do feed. Comentário humano e evento de sistema moram no mesmo
 * `org_comments` e na mesma thread, mas o evento é histórico: entra como linha
 * compacta, com ícone no lugar do avatar, e nunca oferece Responder.
 *
 * A thread segue o desenho do `OrgCommentsPanel`: fio descendo do avatar da raiz
 * e cotovelo entrando em cada resposta.
 */
export function FeedItemComentario({
  comentario,
  nested = false,
  ultima = false,
  abreThread = false,
  continuaBloco = false,
  realce = false,
  naoLida = false,
  onResponder,
}: FeedItemComentarioProps) {
  const downloadAttachment = useDownloadOrgCommentAttachment();
  const ehEvento = ehEventoDeSistema(comentario.kind);

  const abrirAnexo = async (attachment: OrgCommentAttachment) => {
    const resultado = await downloadAttachment.mutateAsync(attachment);
    abrirAnexoEmNovaAba(resultado.url, resultado.fileName);
  };

  const anexos = comentario.attachments.length > 0 && (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {comentario.attachments.map((attachment) => (
        <AttachmentButton key={attachment.id} attachment={attachment} onOpen={abrirAnexo} />
      ))}
    </div>
  );

  return (
    <div className="relative">
      {nested && (
        <>
          {/* `-left-6` devolve o traço ao eixo do fio: o `pl-10` do bloco menos o centro do avatar da raiz. */}
          <span
            aria-hidden
            data-thread-connector
            className="absolute -left-6 top-0 h-[22px] w-6 rounded-bl-md border-b border-l border-border"
          />
          {!ultima && <span aria-hidden className="absolute -left-6 top-0 h-full w-px bg-border" />}
        </>
      )}

      {/* `data-comentario` é a âncora da rolagem do "Ver no topo" do toast. */}
      <div
        data-comentario={comentario.id}
        data-nao-lida={naoLida || undefined}
        data-realce={realce || undefined}
        className={cn(
          'group/item relative flex rounded-md transition-colors',
          ehEvento && 'gap-3 py-1.5 pr-2',
          !ehEvento && 'pr-10 hover:bg-muted/40',
          !ehEvento && (nested ? 'gap-2.5 pb-2 pt-1.5' : 'gap-3 pb-2 pt-2.5'),
          continuaBloco && 'pt-0.5',
          // Fundo, e não anel: o anel é do realce, e os dois podem cair na mesma fala.
          naoLida && !realce && 'bg-primary/[0.055]',
          realce && 'bg-primary/10 ring-1 ring-primary/40 hover:bg-primary/10',
        )}
      >
        {naoLida && (
          <>
            <span className="sr-only">Não lida.</span>
            {/* Mora na calha do bloco, então não empurra nada. */}
            <span
              aria-hidden
              className="absolute inset-y-1 -left-2 w-0.5 rounded-full bg-primary/70"
            />
          </>
        )}

        {ehEvento ? (
          <LinhaDeEvento comentario={comentario} nested={nested} abreThread={abreThread}>
            {anexos}
          </LinhaDeEvento>
        ) : (
          <FalaHumana
            comentario={comentario}
            nested={nested}
            abreThread={abreThread}
            continuaBloco={continuaBloco}
          >
            {anexos}
          </FalaHumana>
        )}

        {onResponder && !ehEvento && (
          <ButtonTooltip text="Responder">
            <button
              type="button"
              onClick={onResponder}
              aria-label="Responder"
              /* Some só onde há mouse de verdade: tablet largo não tem hover, e o botão
                 é o único caminho para responder. 36px no dedo, 28px no mouse. */
              className="absolute right-1 top-1.5 grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-[opacity,color,background-color] hover:bg-background hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:fine)]:h-7 [@media(pointer:fine)]:w-7 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/item:opacity-100"
            >
              <Reply
                aria-hidden
                className="h-4 w-4 [@media(pointer:fine)]:h-3.5 [@media(pointer:fine)]:w-3.5"
              />
            </button>
          </ButtonTooltip>
        )}
      </div>
    </div>
  );
}

interface PartesDaFala {
  comentario: FeedComentario;
  nested: boolean;
  abreThread: boolean;
  /** Anexos, no pé da coluna de texto. */
  children?: ReactNode;
}

function FalaHumana({
  comentario,
  nested,
  abreThread,
  continuaBloco,
  children,
}: PartesDaFala & { continuaBloco: boolean }) {
  const criadoEm = new Date(comentario.created_at);

  return (
    <>
      {abreThread && (
        <span aria-hidden className="absolute bottom-0 left-4 top-11 w-px bg-border" />
      )}

      {continuaBloco ? (
        /* A continuação não repete o avatar; a hora aparece na calha, no hover. */
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
            tomDoAutor(comentario.author_id),
          )}
        >
          {iniciaisDoNome(comentario.author_name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        {!continuaBloco && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={cn(
                'truncate font-semibold leading-tight text-foreground',
                nested ? 'text-[13px]' : 'text-sm',
              )}
            >
              {comentario.author_name || 'Usuário removido'}
            </span>
            <Horario criadoEm={criadoEm} iso={comentario.created_at} />
            {/* Dentro da thread o cotovelo já diz que é resposta; a etiqueta é da resposta solta. */}
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

        <div className={cn('text-sm leading-relaxed text-foreground', !continuaBloco && 'mt-0.5')}>
          <OrgCommentBody body={comentario.body} />
        </div>
        {children}
      </div>
    </>
  );
}

/**
 * Evento de sistema como linha de histórico. O ícone ocupa a coluna do avatar
 * para o texto alinhar com as falas; o corpo só aparece quando não é vazio.
 */
function LinhaDeEvento({ comentario, nested, abreThread, children }: PartesDaFala) {
  const criadoEm = new Date(comentario.created_at);
  const corpo = corpoDoEvento(comentario);
  const pessoas = pessoasDoEventoPartes(comentario);
  const Icone =
    (ehEventoDeSistema(comentario.kind) && ICONE_DO_EVENTO[comentario.kind]) || Activity;

  return (
    <>
      {abreThread && <span aria-hidden className="absolute bottom-0 left-4 top-8 w-px bg-border" />}

      <span
        aria-hidden
        className={cn('relative z-10 flex shrink-0 justify-center', nested ? 'w-7' : 'w-8')}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-background text-primary/80 ring-1 ring-border/70">
          <Icone className="h-3 w-3" />
        </span>
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        {/* Texto corrido, e não flex: em tela estreita a frase quebra entre palavras. */}
        <p className="text-[13px] leading-5 text-muted-foreground">
          <span className="sr-only">Registro automático: </span>
          <span className="font-medium text-foreground/85">{rotuloDoEvento(comentario.kind)}</span>
          {pessoas.autor && (
            <>
              <span aria-hidden> · </span>
              <span className="font-medium text-foreground/80">{pessoas.autor}</span>
              {pessoas.destinatario && (
                <>
                  {' para '}
                  <span className="font-medium text-foreground/80">{pessoas.destinatario}</span>
                </>
              )}
            </>
          )}{' '}
          <Horario criadoEm={criadoEm} iso={comentario.created_at} />
        </p>

        {corpo && (
          <div className="mt-1 border-l-2 border-primary/30 pl-3 text-[13px] leading-relaxed text-foreground/85">
            <OrgCommentBody body={corpo} />
          </div>
        )}
        {children}
      </div>
    </>
  );
}

/** Data e hora na própria fala: a linha se explica sem subir até o rótulo do dia. */
function Horario({ criadoEm, iso }: { criadoEm: Date; iso: string }) {
  return (
    <time
      dateTime={iso}
      title={format(criadoEm, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
      className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
    >
      {dataHoraCurta(criadoEm)}
    </time>
  );
}
