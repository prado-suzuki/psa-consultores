import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CornerDownRight, Reply } from 'lucide-react';

import { tomDoAutor } from '@/components/comentarios/feed/avatarDoAutor';
import { AnexosDoComentario } from '@/components/comentarios/AnexosDoComentario';
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
  /** A fala de baixo continua esta: a caixa branca desce colada até ela. */
  seguidaDeContinuacao?: boolean;
  /** Fala recém-publicada: realce breve para o olho achar onde ela caiu. */
  realce?: boolean;
  /** Ainda não lida: chegou depois do carimbo deste cliente, e é de outra pessoa. */
  naoLida?: boolean;
  onResponder?: () => void;
}

/**
 * Kind fora daqui fica com a bolinha neutra. O roxo vem de `tag-c` porque o papel
 * `status-revisao` é verde no tema e se confundiria com o aprovado.
 */
const COR_DO_EVENTO: Partial<Record<OrgCommentEventoKind, string>> = {
  review_submitted: 'bg-tag-c',
  review_approved: 'bg-status-feito',
  review_adjustments: 'bg-status-alerta',
};

/**
 * Uma fala do feed. Comentário humano e evento de sistema moram no mesmo
 * `org_comments` e na mesma thread, mas o evento é histórico: entra como linha
 * compacta, com uma bolinha no lugar do avatar, e nunca oferece Responder.
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
  seguidaDeContinuacao = false,
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

  const anexos = <AnexosDoComentario attachments={comentario.attachments} onBaixar={abrirAnexo} />;

  return (
    <div className="relative">
      {nested && (
        <>
          {/* `-left-6` devolve o traço ao eixo do fio: o `pl-11` do bloco menos o centro do avatar da raiz. */}
          <span
            aria-hidden
            data-thread-connector
            className="absolute -left-6 top-0 h-6 w-6 rounded-bl-md border-b border-l border-border"
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
          !ehEvento && (nested ? 'gap-2.5 pb-2 pt-1.5' : 'gap-3 pb-2 pt-2.5'),
          // Sem folga entre falas do mesmo bloco: as caixas brancas se emendam.
          continuaBloco && 'pt-0',
          seguidaDeContinuacao && 'pb-0',
          // Na fala humana o destaque é da caixa branca; aqui só o evento o carrega.
          ehEvento && 'gap-2 py-1.5 pr-2',
          ehEvento && naoLida && !realce && 'bg-primary/[0.055]',
          ehEvento && realce && 'bg-primary/10 ring-1 ring-primary/40',
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
            seguidaDeContinuacao={seguidaDeContinuacao}
            naoLida={naoLida}
            realce={realce}
            acao={onResponder && <BotaoResponder onResponder={onResponder} />}
          >
            {anexos}
          </FalaHumana>
        )}
      </div>
    </div>
  );
}

function BotaoResponder({ onResponder }: { onResponder: () => void }) {
  return (
    <ButtonTooltip text="Responder">
      <button
        type="button"
        onClick={onResponder}
        aria-label="Responder"
        /* Some só onde há mouse de verdade: tablet largo não tem hover, e o botão
                 é o único caminho para responder. 36px no dedo, 28px no mouse. */
        className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-[opacity,color,background-color] hover:bg-muted hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:fine)]:h-7 [@media(pointer:fine)]:w-7 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/item:opacity-100"
      >
        <Reply
          aria-hidden
          className="h-4 w-4 [@media(pointer:fine)]:h-3.5 [@media(pointer:fine)]:w-3.5"
        />
      </button>
    </ButtonTooltip>
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
  seguidaDeContinuacao,
  naoLida,
  realce,
  acao,
  children,
}: PartesDaFala & {
  continuaBloco: boolean;
  seguidaDeContinuacao: boolean;
  naoLida: boolean;
  realce: boolean;
  /** Responder, no canto da caixa. */
  acao?: ReactNode;
}) {
  const criadoEm = new Date(comentario.created_at);

  return (
    <>
      {abreThread && (
        <span aria-hidden className="absolute bottom-0 left-5 top-[52px] w-px bg-border" />
      )}

      {continuaBloco ? (
        /* A continuação não repete o avatar; a hora aparece na calha, no hover. */
        <time
          dateTime={comentario.created_at}
          className={cn(
            'shrink-0 pt-2 text-right text-[10px] tabular-nums leading-5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100',
            nested ? 'w-9' : 'w-10',
          )}
        >
          {format(criadoEm, 'HH:mm')}
        </time>
      ) : (
        <span
          aria-hidden
          className={cn(
            'relative z-10 grid shrink-0 place-items-center rounded-lg font-semibold',
            nested ? 'h-9 w-9 text-[13px]' : 'h-10 w-10 text-sm',
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

        {/* A caixa é do bloco de autor, não da fala: continuações emendam nela. */}
        <div
          className={cn(
            'relative bg-card px-3 py-2 transition-colors',
            acao && 'pr-11',
            !continuaBloco && 'mt-1 rounded-t-md',
            !seguidaDeContinuacao && 'rounded-b-md',
            // A tinta vem por cima do branco, em imagem, para não trocar a cor da caixa.
            !naoLida && !realce && 'group-hover/item:bg-muted/60',
            naoLida &&
              !realce &&
              'bg-[linear-gradient(hsl(var(--primary)/0.055),hsl(var(--primary)/0.055))]',
            realce &&
              'bg-[linear-gradient(hsl(var(--primary)/0.1),hsl(var(--primary)/0.1))] ring-1 ring-primary/40',
          )}
        >
          {acao}
          <div className="text-sm leading-relaxed text-foreground">
            <OrgCommentBody body={comentario.body} />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * Evento de sistema como linha de histórico. A bolinha ocupa a coluna do avatar
 * para o texto alinhar com as falas; o corpo só aparece quando não é vazio.
 */
function LinhaDeEvento({ comentario, nested, abreThread, children }: PartesDaFala) {
  const criadoEm = new Date(comentario.created_at);
  const corpo = corpoDoEvento(comentario);
  const pessoas = pessoasDoEventoPartes(comentario);
  const cor =
    (ehEventoDeSistema(comentario.kind) && COR_DO_EVENTO[comentario.kind]) ||
    'bg-muted-foreground/50';

  return (
    <>
      {abreThread && <span aria-hidden className="absolute bottom-0 left-5 top-8 w-px bg-border" />}

      {/* Coluna estreita com a bolinha na borda direita: o centro dela fica no eixo
          do avatar e do fio, e o texto encosta nela. */}
      <span
        aria-hidden
        className={cn('relative z-10 flex shrink-0 justify-end', nested ? 'w-[22px]' : 'w-6')}
      >
        <span className={cn('mt-2 h-2 w-2 rounded-full', cor)} />
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
          /* Mesma caixa branca da fala humana: no cartão cinza do feed, o corpo
             do evento é conteúdo e não pode ler como legenda do cartão. */
          <div className="ml-3 mt-1 rounded-md border-l-2 border-primary/30 bg-card px-3 py-2 text-[13px] leading-relaxed text-foreground/85">
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
