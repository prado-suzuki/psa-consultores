import { ChevronRight, Maximize2, MessagesSquare } from 'lucide-react';

import { tomDoAutor } from '@/components/comentarios/feed/avatarDoAutor';
import { FeedItemComentario } from '@/components/comentarios/feed/FeedItemComentario';
import type { OrigemAberta } from '@/components/comentarios/feed/FeedOrigemAberta';
import { FeedRespostaInline } from '@/components/comentarios/feed/FeedRespostaInline';
import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';
import { ehNaoLida, rotuloDeNovas } from '@/lib/feedAtividade';
import {
  autoresDoGrupo,
  montarThreads,
  origemDoComentario,
  type AreaDeProjetos,
  type ThreadDoFeed,
} from '@/lib/feedComentarios';
import { iniciaisDoNome } from '@/lib/orgCommentMentions';
import { cn } from '@/lib/utils';
import { ElementTooltip } from '@/components/ui/button-tooltip';

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
  /** Fala recém-publicada, realçada por alguns segundos depois de encontrada. */
  idEmRealce: string | null;
  onResponder: (chaveDaThread: string) => void;
  onFecharResposta: () => void;
  /** Recebe o id da resposta publicada, para o feed levar a pessoa até ela. */
  onRespondeu: (id: string) => void;
  /** Até onde a leitura chegou neste cliente. `null` = fora da janela da barra. */
  vistoAte?: string | null;
  /** A minha própria fala nunca é novidade para mim. */
  meuId?: string | null;
  /** `ref` de callback que carimba a leitura quando o bloco fica na tela. */
  registrarLeitura?: (elemento: HTMLElement | null) => void;
  /** Abre a tarefa ou o projeto por cima do feed, sem sair dele. */
  onAbrirOrigem: (origem: OrigemAberta) => void;
}

/**
 * Um trecho de conversa no feed: de onde veio no cabeçalho, o que foi dito
 * embaixo. Só o cabeçalho é link, para não aninhar alvo com Responder e anexos.
 */
export function FeedGrupoOrigem({
  itens,
  chaveDoBloco,
  cliente,
  area,
  respondendoA,
  idEmRealce,
  onResponder,
  onFecharResposta,
  onRespondeu,
  vistoAte = null,
  meuId = null,
  registrarLeitura,
  onAbrirOrigem,
}: FeedGrupoOrigemProps) {
  const primeiro = itens[0];
  const origem = origemDoComentario(primeiro, cliente);
  const ehProjeto = primeiro.entity_type === 'org_project';
  const autores = autoresDoGrupo(itens);
  const threads = montarThreads(itens);
  const naoLidas = itens.filter((item) => ehNaoLida(item, vistoAte ?? undefined, meuId)).length;
  const caminhoCompleto = [origem.cliente, origem.projeto, origem.titulo]
    .filter(Boolean)
    .join(' › ');

  return (
    <article
      // `data-leitura` carimba até a fala mais nova do bloco (os itens vêm em
      // ordem decrescente), nunca até o relógio de agora.
      ref={registrarLeitura}
      data-leitura={`${primeiro.project_id}|${primeiro.created_at}`}
      className="group/origem rounded-lg border border-border/60 bg-superficie-cartao transition-colors hover:border-border"
    >
      <button
        type="button"
        onClick={() => onAbrirOrigem({ tipo: primeiro.entity_type, id: primeiro.entity_id })}
        className="flex w-full items-start text-left gap-3 rounded-t-lg px-4 pb-2.5 pt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {/* O balão devolve o caminho inteiro que o truncamento cortou. */}
        <ElementTooltip text={caminhoCompleto}>
          <span className="min-w-0 flex-1">
            {/* O cliente é o elo de varredura; com os dois nomes na linha, o projeto cede primeiro. */}
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
              <span
                className={cn(
                  'shrink-0 rounded border px-1.5 py-px font-medium',
                  ehProjeto
                    ? 'border-emerald-600/25 bg-emerald-500/10 text-emerald-700'
                    : 'border-indigo-600/25 bg-indigo-500/10 text-indigo-700',
                )}
              >
                {ehProjeto ? 'Projeto' : 'Tarefa'}
              </span>
              {origem.cliente && (
                <>
                  <span aria-hidden className="shrink-0 opacity-50">
                    •
                  </span>
                  <span className="min-w-0 truncate">
                    Cliente: <span className="font-medium text-foreground/85">{origem.cliente}</span>
                  </span>
                </>
              )}
              {origem.projeto && (
                <span
                  className={cn(
                    'min-w-0 items-center gap-1.5',
                    origem.cliente ? 'hidden sm:flex' : 'flex',
                  )}
                >
                  <ChevronRight aria-hidden className="h-3 w-3 shrink-0 opacity-60" />
                  <span className="min-w-0 truncate rounded bg-muted px-1.5 py-px">
                    Projeto: <span className="font-medium text-foreground/85">{origem.projeto}</span>
                  </span>
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold leading-5 text-foreground transition-colors group-hover/origem:text-primary">
              {origem.titulo}
            </span>
          </span>
        </ElementTooltip>

        <span className="flex shrink-0 items-center gap-2.5 pt-0.5">
          <PilhaDeAutores autores={autores} />

          {/* Contornada e fixa: marca onde a leitura parou, enquanto a lateral zera cheia. */}
          {naoLidas > 0 && (
            <ElementTooltip text={`${rotuloDeNovas(naoLidas)} desde que você leu este projeto`}>
              <span className="rounded-full border border-primary/50 px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-primary">
                {naoLidas} {naoLidas === 1 ? 'nova' : 'novas'}
              </span>
            </ElementTooltip>
          )}

          <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
            <MessagesSquare aria-hidden className="h-3.5 w-3.5" />
            {itens.length}
          </span>

          <Maximize2
            aria-hidden
            className="hidden h-4 w-4 text-muted-foreground/70 transition-colors group-hover/origem:text-primary sm:block"
          />
        </span>
      </button>

      <div className="mx-4 border-t border-border/50 py-1.5">
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
          const proxima = threads[indice + 1];
          const seguidaDeContinuacao =
            Boolean(proxima?.continuaBloco) &&
            respondendoA !== chaveDaThread &&
            respondendoA !== `${chaveDoBloco}:${proxima.raizId}`;

          return (
            <FeedThread
              key={thread.raizId}
              thread={thread}
              area={area}
              continuaBloco={thread.continuaBloco && !anteriorRespondendo}
              seguidaDeContinuacao={seguidaDeContinuacao}
              respondendo={respondendoA === chaveDaThread}
              idEmRealce={idEmRealce}
              vistoAte={vistoAte}
              meuId={meuId}
              onResponder={() => onResponder(chaveDaThread)}
              onFecharResposta={onFecharResposta}
              onRespondeu={onRespondeu}
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
  /** A raiz da thread de baixo continua esta: a caixa branca emenda nela. */
  seguidaDeContinuacao: boolean;
  respondendo: boolean;
  idEmRealce: string | null;
  vistoAte: string | null;
  meuId: string | null;
  onResponder: () => void;
  onFecharResposta: () => void;
  onRespondeu: (id: string) => void;
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
  seguidaDeContinuacao,
  respondendo,
  idEmRealce,
  vistoAte,
  meuId,
  onResponder,
  onFecharResposta,
  onRespondeu,
}: FeedThreadProps) {
  const naoLida = (comentario: FeedComentario) =>
    ehNaoLida(comentario, vistoAte ?? undefined, meuId);
  /** A quem a resposta se pendura — a raiz, ou a própria resposta órfã. */
  const alvoDaResposta = thread.raiz ?? thread.respostas[0];
  const abreThread = thread.respostas.length > 0 || respondendo;

  const composer = respondendo && (
    <FeedRespostaInline
      comentario={alvoDaResposta}
      area={area}
      onCancelar={onFecharResposta}
      onRespondeu={(id) => {
        onFecharResposta();
        onRespondeu(id);
      }}
    />
  );

  if (!thread.raiz) {
    return (
      <div className="relative">
        {thread.respostas.map((resposta) => (
          <FeedItemComentario
            key={resposta.id}
            comentario={resposta}
            realce={idEmRealce === resposta.id}
            naoLida={naoLida(resposta)}
            onResponder={respondendo ? undefined : onResponder}
          />
        ))}
        {composer && <div className="pb-2 pl-11">{composer}</div>}
      </div>
    );
  }

  return (
    <div className="relative">
      <FeedItemComentario
        comentario={thread.raiz}
        /* O fio desce do avatar, então quem abre resposta volta a mostrá-lo. */
        continuaBloco={continuaBloco && !respondendo}
        seguidaDeContinuacao={seguidaDeContinuacao}
        abreThread={abreThread}
        realce={idEmRealce === thread.raiz.id}
        naoLida={naoLida(thread.raiz)}
        onResponder={respondendo ? undefined : onResponder}
      />

      {abreThread && (
        <div className="relative pb-2 pl-11">
          {thread.respostas.map((resposta, indice) => (
            <FeedItemComentario
              key={resposta.id}
              comentario={resposta}
              nested
              ultima={!respondendo && indice === thread.respostas.length - 1}
              realce={idEmRealce === resposta.id}
              naoLida={naoLida(resposta)}
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
    <ElementTooltip text={autores.map((autor) => autor.nome).join(', ')}>
      <span className="hidden shrink-0 items-center sm:flex">
        {visiveis.map((autor, indice) => (
          <span
            key={autor.id ?? autor.nome}
            className={cn(
              'grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold ring-2 ring-card',
              tomDoAutor(autor.id),
              indice > 0 && '-ml-1.5',
            )}
          >
            {iniciaisDoNome(autor.nome)}
          </span>
        ))}
        {restantes > 0 && (
          <span className="-ml-1.5 grid h-6 w-6 place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-card">
            +{restantes}
          </span>
        )}
      </span>
    </ElementTooltip>
  );
}
