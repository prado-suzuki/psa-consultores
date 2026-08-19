import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, FolderKanban, ListChecks, MessagesSquare } from 'lucide-react';

import { tomDoAutor } from '@/components/comentarios/feed/avatarDoAutor';
import { FeedItemComentario } from '@/components/comentarios/feed/FeedItemComentario';
import { FeedRespostaInline } from '@/components/comentarios/feed/FeedRespostaInline';
import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';
import {
  autoresDoGrupo,
  hrefDeOrigem,
  montarThreads,
  origemDoComentario,
  type AreaDeProjetos,
  type ThreadDoFeed,
} from '@/lib/feedComentarios';
import { iniciaisDoNome } from '@/lib/orgCommentMentions';
import { cn } from '@/lib/utils';

interface FeedGrupoOrigemProps {
  /** Comentários seguidos da mesma tarefa/projeto, do mais novo ao mais antigo. */
  itens: FeedComentario[];
  /** Chave do bloco no feed — a mesma thread pode reaparecer em outro bloco do dia. */
  chaveDoBloco: string;
  /** Cliente do projeto desta conversa, resolvido por `useDomainFeedClientes`. */
  cliente: string | null;
  area: AreaDeProjetos;
  /** Thread com o campo de resposta aberto, no formato `chaveDoBloco:raizId`. */
  respondendoA: string | null;
  onResponder: (chaveDaThread: string) => void;
  onFecharResposta: () => void;
}

/**
 * Um trecho de conversa no feed: **de onde veio** no cabeçalho, o que foi dito
 * embaixo.
 *
 * É a peça que diferencia o feed da thread. A origem não é mais uma linha
 * repetida em cada comentário: é o cabeçalho do bloco — ícone do tipo, caminho
 * `projeto › tarefa`, quem está na conversa — e o bloco inteiro é o caminho de
 * volta para a tarefa. Embaixo, os comentários se penduram num fio vertical, e
 * falas seguidas da mesma pessoa não repetem avatar nem nome.
 */
export function FeedGrupoOrigem({
  itens,
  chaveDoBloco,
  cliente,
  area,
  respondendoA,
  onResponder,
  onFecharResposta,
}: FeedGrupoOrigemProps) {
  const primeiro = itens[0];
  const origem = origemDoComentario(primeiro, cliente);
  const ehProjeto = primeiro.entity_type === 'org_project';
  const IconeDoTipo = ehProjeto ? FolderKanban : ListChecks;
  const autores = autoresDoGrupo(itens);
  const threads = montarThreads(itens);

  return (
    <article className="group/origem overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <Link
        to={hrefDeOrigem(primeiro, area)}
        /*
          Cabeçalho lavado com o acento da área (teal na Tax, musgo na OSG) em vez
          do `muted`: na OSG o muted é bege e o cabeçalho sumia contra o corpo do
          comentário — a faixa inteira lia como um bloco marrom só.
        */
        className="flex items-center gap-3 border-b border-border/60 bg-primary/10 px-3.5 py-2.5 transition-colors hover:bg-primary/15"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-tool-icon-bg text-tool-icon">
          <IconeDoTipo className="h-[18px] w-[18px]" />
        </span>

        <span className="min-w-0 flex-1">
          {/*
            Caminho de contexto numa linha só: tipo › cliente › projeto. O cliente
            entra como o elo mais forte (tom de texto normal, não o cinza dos
            outros), porque é por ele que se varre o feed — e sai de cena quando o
            nome do projeto já o carrega, para não dobrar a informação.
          */}
          <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {/* O tipo é o que diz "isto é cabeçalho": ganha o acento da área. */}
            <span className="shrink-0 text-primary">{ehProjeto ? 'Projeto' : 'Tarefa'}</span>
            {origem.cliente && (
              <>
                <ChevronRight aria-hidden className="h-3 w-3 shrink-0 opacity-60" />
                <span className="truncate font-semibold normal-case tracking-normal text-foreground/70">
                  {origem.cliente}
                </span>
              </>
            )}
            {origem.projeto && (
              /*
                Em tela estreita os dois nomes juntos ficariam cortados no meio.
                Com cliente na linha, o projeto é o que cede: o cliente é o elo
                que orienta, e o título da tarefa embaixo já dá o resto.
              */
              <span
                className={cn(
                  'min-w-0 items-center gap-1',
                  origem.cliente ? 'hidden sm:flex' : 'flex',
                )}
              >
                <ChevronRight aria-hidden className="h-3 w-3 shrink-0 opacity-60" />
                <span className="truncate font-medium normal-case tracking-normal">
                  {origem.projeto}
                </span>
              </span>
            )}
          </span>
          <span className="block truncate text-sm font-semibold text-foreground">
            {origem.titulo}
          </span>
        </span>

        <PilhaDeAutores autores={autores} />

        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <MessagesSquare aria-hidden className="h-3.5 w-3.5" />
          {itens.length}
        </span>

        <ArrowUpRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover/origem:translate-x-0.5 group-hover/origem:text-primary"
        />
      </Link>

      <div className="px-4 py-1.5">
        {threads.map((thread, indice) => {
          const chaveDaThread = `${chaveDoBloco}:${thread.raizId}`;
          const anterior = threads[indice - 1];
          /**
           * O campo de resposta aberto na thread de cima quebra o bloco de autor:
           * sem isso a fala seguinte da mesma pessoa ficaria sem avatar depois do
           * compositor, lendo como se fosse continuação da resposta.
           */
          const anteriorRespondendo =
            Boolean(anterior) && respondendoA === `${chaveDoBloco}:${anterior.raizId}`;

          return (
            <FeedThread
              key={thread.raizId}
              thread={thread}
              area={area}
              continuaBloco={thread.continuaBloco && !anteriorRespondendo}
              respondendo={respondendoA === chaveDaThread}
              onResponder={() => onResponder(chaveDaThread)}
              onFecharResposta={onFecharResposta}
            />
          );
        })}
      </div>
    </article>
  );
}

interface FeedThreadProps {
  thread: ThreadDoFeed<FeedComentario>;
  area: AreaDeProjetos;
  /** Raiz sem avatar nem nome, por continuar o bloco de autor da thread de cima. */
  continuaBloco: boolean;
  respondendo: boolean;
  onResponder: () => void;
  onFecharResposta: () => void;
}

/**
 * Uma conversa dentro do bloco: raiz, respostas penduradas nela e o campo de
 * resposta no fim — a mesma anatomia da thread do painel da tarefa.
 *
 * Sem raiz na leva (ela ficou em outra página do feed, ou fora da RLS), as
 * respostas se apresentam soltas, com a etiqueta "resposta": melhor do que
 * pendurar um cotovelo em avatar que não está na tela.
 */
function FeedThread({
  thread,
  area,
  continuaBloco,
  respondendo,
  onResponder,
  onFecharResposta,
}: FeedThreadProps) {
  /** A quem a resposta se pendura — a raiz, ou a própria resposta órfã. */
  const alvoDaResposta = thread.raiz ?? thread.respostas[0];
  const abreThread = thread.respostas.length > 0 || respondendo;

  const composer = respondendo && (
    <FeedRespostaInline
      comentario={alvoDaResposta}
      area={area}
      onCancelar={onFecharResposta}
      onRespondeu={onFecharResposta}
    />
  );

  if (!thread.raiz) {
    return (
      <div className="relative">
        {thread.respostas.map((resposta) => (
          <FeedItemComentario
            key={resposta.id}
            comentario={resposta}
            onResponder={respondendo ? undefined : onResponder}
          />
        ))}
        {composer && <div className="pb-2 pl-10">{composer}</div>}
      </div>
    );
  }

  return (
    <div className="relative">
      <FeedItemComentario
        comentario={thread.raiz}
        /* O fio desce do avatar, então quem abre resposta volta a mostrá-lo. */
        continuaBloco={continuaBloco && !respondendo}
        abreThread={abreThread}
        onResponder={respondendo ? undefined : onResponder}
      />

      {abreThread && (
        <div className="relative pb-2 pl-10">
          {thread.respostas.map((resposta, indice) => (
            <FeedItemComentario
              key={resposta.id}
              comentario={resposta}
              nested
              ultima={!respondendo && indice === thread.respostas.length - 1}
            />
          ))}
          {composer}
        </div>
      )}
    </div>
  );
}

/** Quem está na conversa, em avatares sobrepostos. Acima de três, conta o resto. */
function PilhaDeAutores({ autores }: { autores: ReturnType<typeof autoresDoGrupo> }) {
  const visiveis = autores.slice(0, 3);
  const restantes = autores.length - visiveis.length;

  return (
    <span
      className="hidden shrink-0 items-center sm:flex"
      title={autores.map((autor) => autor.nome).join(', ')}
    >
      {visiveis.map((autor, indice) => (
        <span
          key={autor.id ?? autor.nome}
          className={cn(
            'grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold ring-2 ring-muted',
            tomDoAutor(autor.id),
            indice > 0 && '-ml-1.5',
          )}
        >
          {iniciaisDoNome(autor.nome)}
        </span>
      ))}
      {restantes > 0 && (
        <span className="-ml-1.5 grid h-6 w-6 place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-muted">
          +{restantes}
        </span>
      )}
    </span>
  );
}
