import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, MessagesSquare, SearchX } from 'lucide-react';

import { FeedFiltros } from '@/components/comentarios/feed/FeedFiltros';
import { FeedGrupoOrigem } from '@/components/comentarios/feed/FeedGrupoOrigem';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDomainFeedClientes } from '@/hooks/useDomainFeedClientes';
import { useDomainFeedComentarios } from '@/hooks/useDomainFeedComentarios';
import { agruparPorDia, agruparPorOrigem, type AreaDeProjetos } from '@/lib/feedComentarios';
import {
  aplicarFiltrosNaUrl,
  filtrosDaUrl,
  FILTROS_VAZIOS,
  temFiltroAtivo,
  type FeedFiltros as FeedFiltrosValor,
} from '@/lib/feedFiltros';

interface FeedComentariosProps {
  area: AreaDeProjetos;
}

/**
 * Feed de comentários: stream único, cronológico, de tudo que está sendo
 * conversado nos projetos e tarefas do usuário.
 *
 * A leitura é em dois níveis: o dia marca o tempo (rótulo grudado no topo
 * enquanto se rola), e dentro dele cada bloco é uma conversa — a tarefa ou o
 * projeto de onde os comentários vieram, com as falas penduradas embaixo. Nunca
 * uma pilha de cards soltos repetindo a mesma origem.
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

  const { comentarios, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useDomainFeedComentarios(filtros);
  const [respondendoA, setRespondendoA] = useState<string | null>(null);

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
    conteudo = (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle aria-hidden className="mx-auto mb-3 h-8 w-8 text-destructive/70" />
        <p className="font-semibold">Não foi possível carregar o feed</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  } else if (comentarios.length === 0) {
    conteudo = temFiltroAtivo(filtros) ? (
      <FeedSemResultado onLimpar={() => aplicarFiltros(FILTROS_VAZIOS)} />
    ) : (
      <FeedVazio />
    );
  } else {
    conteudo = (
      <>
        {dias.map((dia) => (
          <section key={dia.dia} className="pb-5">
            <div className="sticky top-0 z-20 -mx-1 flex items-center gap-3 bg-canvas/80 px-1 py-2 backdrop-blur-sm">
              <h2 className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/75 shadow-sm">
                {dia.rotulo}
              </h2>
              <span
                aria-hidden
                className="h-px flex-1 bg-gradient-to-r from-border to-transparent"
              />
              <span className="text-[11px] text-muted-foreground">
                {dia.itens.length === 1 ? '1 comentário' : `${dia.itens.length} comentários`}
              </span>
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
                  respondendoA={respondendoA}
                  onResponder={setRespondendoA}
                  onFecharResposta={() => setRespondendoA(null)}
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
              className="rounded-full bg-card px-5 shadow-sm"
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
    <div className="mx-auto max-w-3xl pb-4">
      <FeedFiltros filtros={filtros} onFiltrosChange={aplicarFiltros} />
      {conteudo}
    </div>
  );
}

/** Esqueleto no formato do feed: rótulo do dia, cabeçalho de origem e falas. */
function FeedCarregando() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-20 rounded-full" />
      {[0, 1].map((bloco) => (
        <div key={bloco} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/50 px-3.5 py-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="space-y-3 px-3.5 py-3">
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

function FeedVazio() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-tool-icon-bg text-tool-icon">
        <MessagesSquare aria-hidden className="h-7 w-7" />
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
function FeedSemResultado({ onLimpar }: { onLimpar: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <SearchX aria-hidden className="h-7 w-7" />
      </span>
      <p className="font-semibold">Nenhuma conversa nesse recorte</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
        Há conversas no feed, mas nenhuma que atenda aos filtros escolhidos. Tente ampliar o período
        ou desligar um dos filtros.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onLimpar}>
        Limpar filtros
      </Button>
    </div>
  );
}
