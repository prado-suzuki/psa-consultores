import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, MessagesSquare, RotateCcw, SearchX } from 'lucide-react';

import { FeedBarraDeAtividade } from '@/components/comentarios/feed/FeedBarraDeAtividade';
import { FeedFiltros } from '@/components/comentarios/feed/FeedFiltros';
import { FeedGrupoOrigem } from '@/components/comentarios/feed/FeedGrupoOrigem';
import { FeedNovoComentario } from '@/components/comentarios/feed/FeedNovoComentario';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import { Button } from '@/components/ui/button';
import { ElementTooltip } from '@/components/ui/button-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useAtividadeDoFeedController } from '@/hooks/useAtividadeDoFeedController';
import { useDomainFeedClientes } from '@/hooks/useDomainFeedClientes';
import { useDomainFeedComentarios } from '@/hooks/useDomainFeedComentarios';
import { agruparPorDia, agruparPorOrigem, type AreaDeProjetos } from '@/lib/feedComentarios';
import {
  aplicarFiltrosNaUrl,
  filtrosDaUrl,
  FILTROS_VAZIOS,
  temFiltroAtivo,
  termoDaBusca,
  type FeedFiltros as FeedFiltrosValor,
} from '@/lib/feedFiltros';

interface FeedComentariosProps {
  area: AreaDeProjetos;
}

/** Quanto tempo a fala recém-publicada fica realçada depois de encontrada. */
const DURACAO_DO_REALCE = 6000;

/**
 * Feed de comentários: stream único, cronológico, de tudo que está sendo
 * conversado nos projetos e tarefas do usuário.
 *
 * A leitura é em dois níveis: o dia marca o tempo (rótulo grudado logo abaixo da
 * barra de filtros enquanto se rola), e dentro dele cada bloco é uma conversa:
 * a tarefa ou o projeto de onde os comentários vieram, com as falas penduradas
 * embaixo. Nunca uma pilha de cards soltos repetindo a mesma origem.
 *
 * Compartilhado entre Tax e OSG, no padrão do `PainelTarefas` — a única coisa
 * que difere entre as áreas é a moldura da página e a base dos links de origem.
 * O recorte de relevância não mora aqui: vem da RLS, aplicada dentro da função
 * `feed_org_comments`.
 *
 * Os filtros vivem na URL, e não em estado local: o recorte sobrevive ao F5, ao
 * voltar do deep-link de uma tarefa e ao link colado para outra pessoa — que era
 * metade da utilidade de poder filtrar por cliente.
 */
export function FeedComentarios({ area }: FeedComentariosProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtros = useMemo(() => filtrosDaUrl(searchParams), [searchParams]);
  const aplicarFiltros = useCallback(
    (proximos: FeedFiltrosValor) =>
      // `replace`: filtrar não é navegar. Sem isso, o Voltar do navegador
      // desfaria um clique de filtro por vez em vez de sair do feed.
      setSearchParams((atuais) => aplicarFiltrosNaUrl(atuais, proximos), { replace: true }),
    [setSearchParams],
  );

  const { comentarios, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useDomainFeedComentarios(filtros);
  const [respondendoA, setRespondendoA] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const [alturaDaBarra, setAlturaDaBarra] = useState(0);
  const barraRef = useAlturaObservada(setAlturaDaBarra);
  const limparFiltros = useCallback(() => aplicarFiltros(FILTROS_VAZIOS), [aplicarFiltros]);
  const { idEmRealce, realcar } = useRealceDaFala(feedRef, limparFiltros);

  /**
   * O cliente vem de fora do feed, por projeto: todo comentário tem
   * `project_id`, e o nome do cliente é cadastro — não precisa vir repetido em
   * cada linha da página. Ver `useDomainFeedClientes`.
   */
  const projectIds = useMemo(
    () => comentarios.map((comentario) => comentario.project_id),
    [comentarios],
  );
  const { clientePorProjeto } = useDomainFeedClientes(projectIds);

  // A barra de clientes e a marca de não lido saem do mesmo controlador: a
  // barra diz quais clientes têm fala nova, o stream marca quais falas são.
  const atividade = useAtividadeDoFeedController(filtros);

  /**
   * Dois agrupamentos encadeados: o dia por fora, a conversa por dentro. O de
   * origem roda dentro do dia para nenhum bloco atravessar a virada da data.
   */
  const dias = useMemo(
    () =>
      agruparPorDia(comentarios).map((dia) => ({
        ...dia,
        conversas: agruparPorOrigem(dia.itens),
      })),
    [comentarios],
  );

  /**
   * O que aparece embaixo da barra. Sai como variável, e não como early return,
   * porque a barra fica de pé em TODOS os estados — inclusive carregando, vazio e
   * erro. É ela que explica por que a tela está assim e é por ela que se desfaz o
   * recorte; esconder o filtro justo quando ele não trouxe nada seria esconder a
   * causa do vazio.
   */
  let conteudo: JSX.Element;
  if (isLoading) {
    conteudo = <FeedCarregando />;
  } else if (error) {
    conteudo = <FeedComErro erro={error} onTentarDeNovo={() => refetch()} />;
  } else if (comentarios.length === 0) {
    conteudo = temFiltroAtivo(filtros) ? (
      <FeedSemResultado
        termo={termoDaBusca(filtros)}
        onLimpar={() => aplicarFiltros(FILTROS_VAZIOS)}
      />
    ) : (
      <FeedVazio />
    );
  } else {
    conteudo = (
      <>
        {dias.map((dia, indiceDoDia) => (
          <section key={dia.dia} className="pb-6">
            {/* O fundo é máscara do conteúdo que rola por baixo, então segue o token do `body`.
                O `top` é medido porque a barra de filtros ganha uma linha com filtro ligado. */}
            <div
              className="sticky z-20 -mx-1 flex items-center gap-3 bg-background/85 px-1 pb-2 pt-1.5 backdrop-blur-sm"
              style={{ top: alturaDaBarra }}
            >
              <h2 className="shrink-0 text-xs font-semibold text-foreground/70">{dia.rotulo}</h2>
              <span aria-hidden className="h-px flex-1 bg-border/70" />
              <ContagemDoDia
                carregados={dia.itens.length}
                /* Só o dia mais antigo da leva pode estar cortado pela paginação;
                   os de cima já vieram inteiros. */
                cortado={hasNextPage && indiceDoDia === dias.length - 1}
              />
            </div>

            <div className="space-y-3">
              {dia.conversas.map((conversa, indice) => (
                <FeedGrupoOrigem
                  // A mesma origem pode reaparecer no dia depois de outra conversa,
                  // então a chave carrega a posição do bloco.
                  key={`${conversa.chave}#${indice}`}
                  chaveDoBloco={`${dia.dia}/${conversa.chave}#${indice}`}
                  itens={conversa.itens}
                  cliente={clientePorProjeto.get(conversa.itens[0].project_id) ?? null}
                  area={area}
                  vistoAte={atividade.carimbos.get(conversa.itens[0].project_id)?.vistoAte ?? null}
                  meuId={atividade.meuId}
                  registrarLeitura={atividade.registrarBloco}
                  respondendoA={respondendoA}
                  idEmRealce={idEmRealce}
                  onResponder={setRespondendoA}
                  onFecharResposta={() => setRespondendoA(null)}
                  onRespondeu={(id) => realcar(id, { resposta: true })}
                />
              ))}
            </div>
          </section>
        ))}

        {hasNextPage && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full px-5"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? (
                <>
                  <AreaLoader area={area} size={16} className="mr-2" />
                  Carregando...
                </>
              ) : (
                'Ver comentários mais antigos'
              )}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    /* `items-start` para a barra poder grudar: esticada pelo `stretch` padrão,
       ela teria a altura da conversa inteira e o `sticky` não teria folga. */
    <div className="flex w-full max-w-3xl grow items-start gap-5 lg:max-w-none lg:gap-6 lg:pr-8 2xl:gap-8">
      <FeedBarraDeAtividade
        atividade={atividade}
        filtros={filtros}
        onFiltrosChange={aplicarFiltros}
      />

      {/* Coluna: filtros em cima, conversa no meio, compositor no rodapé. O `flex`
       existe por causa do rodapé — é o `mt-auto` dele que o empurra para baixo
       quando há pouca conversa; sem isso a barra de escrever boiava logo abaixo
       do último comentário, no meio da tela. O `grow` é a outra metade disso:
       o invólucro da página estica sob `rolagemNoConteudo`, e sem crescer dentro
       dele a coluna mediria só o que a conversa pede, e não sobraria espaço
       nenhum para o `mt-auto` distribuir. `self-stretch` devolve a altura que o
       `items-start` do pai tirou, senão o compositor desgruda do rodapé. */}
      {/* O teto de 50rem segura a linha de leitura em monitor largo; a coluna cresce até ele. */}
      <div
        ref={feedRef}
        className="flex w-full min-w-0 max-w-[50rem] grow flex-col self-stretch pb-2"
      >
        {/* A barra gruda no topo junto com o rótulo do dia. Antes ela rolava para
          fora: depois de duzentos comentários, trocar o período obrigava a voltar
          ao começo da página: o controle sumia e a informação passiva ficava.
          A faixa carrega a máscara e o espaçamento que antes eram `mb-3` na
          barra, para o conteúdo não aparecer na fresta entre as duas. */}
        <div
          ref={barraRef}
          className="sticky top-0 z-30 -mx-1 bg-background/85 px-1 pb-3 pt-1 backdrop-blur-sm"
        >
          <FeedFiltros filtros={filtros} onFiltrosChange={aplicarFiltros} />
        </div>
        {conteudo}
        {/*
        O compositor fica no RODAPÉ, grudado, como a caixa de mensagem do Slack:
        é lá que a mão já está depois de ler, e ele não pode depender de rolar
        duzentos comentários de volta até o topo. Antes ele morava na faixa de
        cima, junto dos filtros — e ali, aberto, empurrava a conversa para fora
        da tela justamente enquanto se escreve sobre ela.

        A máscara é OPACA, diferente da faixa de cima: aqui embaixo ela cobre a
        caixa de escrever inteira, e o borrão translúcido deixava a conversa
        aparecer por trás do campo de texto e dos campos de destino.
      */}
        <div className="sticky bottom-0 z-30 -mx-1 mt-auto bg-background px-1 pb-1 pt-3 shadow-[0_-10px_14px_-14px_hsl(var(--foreground)/0.12)]">
          <FeedNovoComentario
            area={area}
            filtros={filtros}
            onPublicou={(id, noRecorte) => realcar(id, { noRecorte })}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Altura viva de um elemento: a barra de filtros muda de altura quando ganha a
 * linha das etiquetas, e é dela que sai o `top` do rótulo do dia.
 */
function useAlturaObservada(aoMedir: (altura: number) => void) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    aoMedir(elemento.offsetHeight);
    // `ResizeObserver` não existe no jsdom antigo nem em navegador de teste sem
    // polyfill: sem ele a medida inicial já vale, só deixa de acompanhar.
    if (typeof ResizeObserver === 'undefined') return;

    const observador = new ResizeObserver(() => aoMedir(elemento.offsetHeight));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [aoMedir]);

  return ref;
}

interface OpcoesDoRealce {
  /** A fala cabe no recorte que está na tela? Só o compositor sabe responder. */
  noRecorte?: boolean;
  /** Muda só o título do toast: resposta e conversa nova não são a mesma notícia. */
  resposta?: boolean;
}

/**
 * O retorno visual da fala publicada — resposta ou conversa nova.
 *
 * O feed é cronológico, então a fala escrita numa conversa de quatro dias atrás
 * nasce lá no topo, no bloco de "Hoje": o compositor fechava, nada mudava na
 * frente da pessoa e ela concluía que a fala se perdeu. Aqui o toast diz o que
 * aconteceu e leva até ela, que chega realçada por alguns segundos.
 *
 * Quando a fala NÃO cabe no recorte da tela (escrita para outro cliente
 * enquanto se lê o feed filtrado num deles), o "Ver no topo" levaria a lugar
 * nenhum: o toast troca de texto e passa a oferecer a saída que resolve —
 * limpar os filtros.
 */
function useRealceDaFala(feedRef: React.RefObject<HTMLDivElement>, onLimparFiltros: () => void) {
  const [idEmRealce, setIdEmRealce] = useState<string | null>(null);

  useEffect(() => {
    if (!idEmRealce) return;
    const relogio = window.setTimeout(() => setIdEmRealce(null), DURACAO_DO_REALCE);
    return () => window.clearTimeout(relogio);
  }, [idEmRealce]);

  const realcar = useCallback(
    (id: string, { noRecorte = true, resposta = false }: OpcoesDoRealce = {}) => {
      const titulo = resposta ? 'Resposta publicada' : 'Comentário publicado';
      setIdEmRealce(id);
      if (!noRecorte) {
        toast.success(titulo, {
          description: 'Foi gravado, mas está fora dos filtros desta tela.',
          action: { label: 'Limpar filtros', onClick: onLimparFiltros },
        });
        return;
      }
      toast.success(titulo, {
        description: 'Entrou no topo do feed, no bloco de hoje.',
        action: {
          label: 'Ver no topo',
          onClick: () => {
            const alvo = feedRef.current?.querySelector(`[data-comentario="${id}"]`);
            if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIdEmRealce(id);
          },
        },
      });
    },
    [feedRef, onLimparFiltros],
  );

  return { idEmRealce, realcar };
}

/**
 * Quantos comentários o dia teve.
 *
 * O número conta o que está CARREGADO, e o dia mais antigo da leva quase sempre
 * está cortado pela página de 20: ele aparecia como "20 comentários" e virava
 * "34 comentários" depois de um clique em ver mais. Número que muda sozinho é
 * pior do que número nenhum, então o dia cortado ganha o `+` e diz por quê.
 */
function ContagemDoDia({ carregados, cortado }: { carregados: number; cortado: boolean }) {
  const plural = carregados === 1 ? 'comentário' : 'comentários';
  return (
    <ElementTooltip text={cortado ? 'Este dia tem mais comentários ainda não carregados' : null}>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {cortado ? `${carregados}+ ${plural}` : `${carregados} ${plural}`}
      </span>
    </ElementTooltip>
  );
}

/** Esqueleto com a geometria final: rótulo do dia, cabeçalho em dois níveis e falas. */
function FeedCarregando() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando o feed">
      <div className="flex items-center gap-3 pb-2 pt-1.5">
        <Skeleton className="h-3 w-12" />
        <span aria-hidden className="h-px flex-1 bg-border/70" />
      </div>
      {[0, 1].map((bloco) => (
        <div key={bloco} className="rounded-lg border border-border/60 bg-superficie-cartao">
          <div className="flex items-start gap-3 px-4 pb-2.5 pt-3">
            <Skeleton className="mt-0.5 h-7 w-7 rounded-md" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-2.5 w-40" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
          </div>
          <div className="mx-4 space-y-3 border-t border-border/50 py-3">
            {[0, 1].map((linha) => (
              <div key={linha} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-2.5 w-32" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Falha de carregamento com saída.
 *
 * O texto do Postgres não é frase para quem veio ler conversa, e o estado ainda
 * era um beco sem saída: nem tentar de novo, nem caminho alternativo. A mensagem
 * técnica não some: fica no `<details>`, para quem vai reportar o problema.
 */
function FeedComErro({ erro, onTentarDeNovo }: { erro: Error; onTentarDeNovo: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/25 px-6 py-12 text-center">
      <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden className="h-5 w-5" />
      </span>
      <p className="font-semibold">Não foi possível carregar o feed</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
        A conversa continua guardada: foi a busca que falhou. Tente de novo; se insistir, avise o
        time com a mensagem técnica abaixo.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onTentarDeNovo}>
        <RotateCcw aria-hidden className="mr-2 h-3.5 w-3.5" />
        Tentar de novo
      </Button>
      {erro.message && (
        <details className="mx-auto mt-4 max-w-sm text-left">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">
            Detalhe técnico
          </summary>
          <p className="mt-1 break-words text-[11px] text-muted-foreground">{erro.message}</p>
        </details>
      )}
    </div>
  );
}

function FeedVazio() {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-tool-icon-bg text-tool-icon">
        <MessagesSquare aria-hidden className="h-5 w-5" />
      </span>
      <p className="font-semibold">Nada no feed ainda</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
        Aparecem aqui os comentários dos projetos e tarefas que você acompanha — os seus, os que
        mencionam você e os das threads em que você respondeu.
      </p>
    </div>
  );
}

/**
 * Vazio POR CAUSA DO FILTRO — outra coisa que "nada no feed ainda".
 *
 * O texto tem que dizer que existe conversa, só não nesse recorte; senão a
 * pessoa lê "o feed está vazio" e conclui que a ferramenta não tem nada dentro.
 */
function FeedSemResultado({ termo, onLimpar }: { termo: string | null; onLimpar: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <SearchX aria-hidden className="h-5 w-5" />
      </span>
      {/*
        Com busca ligada o vazio tem uma causa provável, e ela vai no título: a
        palavra procurada. "Nenhuma conversa nesse recorte" mandava conferir
        cinco filtros quando o que não casou foi o termo digitado — e o termo é
        o único filtro que a pessoa escreveu de cabeça, então é o mais fácil de
        ter saído com um erro de digitação.
      */}
      <p className="font-semibold">
        {termo ? <>Nada encontrado para “{termo}”</> : 'Nenhuma conversa nesse recorte'}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
        {termo
          ? 'A busca procura no texto do comentário, inteiro, e pede todas as palavras digitadas. Tente menos palavras, ou confira os outros filtros ligados.'
          : 'Há conversas no feed, mas nenhuma que atenda aos filtros escolhidos. Tente ampliar o período ou desligar um dos filtros.'}
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onLimpar}>
        Limpar filtros
      </Button>
    </div>
  );
}
