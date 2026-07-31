import { useInfiniteQuery } from '@tanstack/react-query';

import {
  buscarAnexosPorComentario,
  type OrgComment,
} from '@/hooks/useDomainOrgComments';
import { supabase } from '@/integrations/supabase/client';
import { cursorDoComentario, type FeedCursor } from '@/lib/feedComentarios';
import { desdeDoPeriodo, FILTROS_VAZIOS, type FeedFiltros } from '@/lib/feedFiltros';
import { STALE_TIMES } from '@/lib/queryClient';

/**
 * Camada de dados do feed de comentários: uma página por vez da função
 * `public.feed_org_comments`, em ordem cronológica decrescente.
 *
 * A relevância não é montada aqui — vem da RLS de `org_comments`, que a função
 * respeita por ser `SECURITY INVOKER` sobre uma view `security_invoker`. O
 * front só pede a próxima página.
 *
 * Os FILTROS também não são aplicados aqui: vão como parâmetro para a função e
 * são resolvidos no `WHERE`, antes do `LIMIT`. Filtrar no front filtraria a
 * janela de 20 comentários da página, não o feed (ver o cabeçalho da migration
 * `20260730151500_feed_org_comments_filtros.sql`).
 *
 * ⚠️ DÍVIDA TÉCNICA (`as never` / cast de shim): `src/integrations/supabase/types.ts`
 * é autogerado e ainda não conhece a função `feed_org_comments`, no mesmo caso
 * de `criar_org_comment`. Enquanto isso, a chamada entra por cast — a checagem
 * de tipo fica desligada exatamente na fronteira com o banco. Registrado em
 * `docs/geral/divida-tipos-org-comments.md`.
 */
const RPC = 'feed_org_comments';

/** Tamanho da página. É também o sinal de fim: página curta = não há mais. */
export const FEED_PAGE_SIZE = 20;

/**
 * A chave carrega o recorte, e não os ids do resultado: cada combinação de
 * filtros é uma lista paginada própria, com seu próprio cursor. Trocar de filtro
 * abre uma lista nova em vez de remendar a anterior — e voltar ao filtro
 * anterior encontra o cache dele de pé.
 *
 * O PERÍODO entra como preset (`7d`), nunca como o timestamp já calculado: o
 * timestamp vem de `new Date()` e mudaria a chave a cada render, refazendo a
 * consulta para sempre. O corte é calculado na hora de buscar.
 */
export const feedComentariosQueryKey = (filtros: FeedFiltros = FILTROS_VAZIOS) =>
  [...feedComentariosQueryKeyPrefix(), filtros] as const;

/**
 * O prefixo comum a todos os recortes. É por ele que se INVALIDA: uma resposta
 * escrita no feed tem que reaparecer no recorte que está na tela, e não só no
 * feed sem filtro — `invalidateQueries` casa por prefixo, então passar a chave
 * completa de um recorte deixaria os outros parados.
 */
export const feedComentariosQueryKeyPrefix = () => ['org-comments-feed'] as const;

/**
 * A linha que a função devolve é a da view — os anexos entram depois.
 *
 * A view também traz `client_id` (de que cliente é a conversa), que não está
 * neste tipo de propósito: ele existe como eixo de filtro no banco, e o NOME do
 * cliente que a tela mostra vem de `useDomainFeedClientes`, por projeto.
 */
type LinhaDoFeed = Omit<OrgComment, 'attachments'>;

export type FeedComentario = OrgComment;

interface FeedRpcParams {
  _cursor_created_at: string | null;
  _cursor_id: string | null;
  _limit: number;
  /** Arrays porque a função aceita multi-seleção; a tela hoje manda um só. */
  _client_ids: string[] | null;
  _project_ids: string[] | null;
  _author_ids: string[] | null;
  _only_mentions: boolean;
  _since: string | null;
}

interface SupabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Shim mínimo da função enquanto `types.ts` não a conhece (ver dívida no topo). */
type FeedRpc = (
  fn: string,
  params: FeedRpcParams,
) => PromiseLike<SupabaseResult<LinhaDoFeed[]>>;

/** Um id só, ou nulo: nulo é "sem filtro", e a função distingue isso de vazio. */
const listaOuNada = (id: string | null): string[] | null => (id ? [id] : null);

async function buscarPagina(
  cursor: FeedCursor | null,
  filtros: FeedFiltros,
): Promise<FeedComentario[]> {
  const { data, error } = await (supabase.rpc as unknown as FeedRpc)(RPC, {
    _cursor_created_at: cursor?.createdAt ?? null,
    _cursor_id: cursor?.id ?? null,
    _limit: FEED_PAGE_SIZE,
    _client_ids: listaOuNada(filtros.clienteId),
    _project_ids: listaOuNada(filtros.projetoId),
    _author_ids: listaOuNada(filtros.autorId),
    _only_mentions: filtros.apenasMencoes,
    _since: desdeDoPeriodo(filtros.periodo),
  });
  if (error) throw error;

  const comentarios = data ?? [];
  if (comentarios.length === 0) return [];

  const anexos = await buscarAnexosPorComentario(comentarios.map((comentario) => comentario.id));
  return comentarios.map((comentario) => ({
    ...comentario,
    attachments: anexos.get(comentario.id) ?? [],
  }));
}

export function useDomainFeedComentarios(filtros: FeedFiltros = FILTROS_VAZIOS) {
  const query = useInfiniteQuery({
    queryKey: feedComentariosQueryKey(filtros),
    initialPageParam: null as FeedCursor | null,
    queryFn: ({ pageParam }) => buscarPagina(pageParam, filtros),
    /**
     * O cursor é o par (created_at, id) do último item da página — nunca um
     * offset. Página incompleta significa fim do feed.
     *
     * Isso é o que faz o "carregar mais" não repetir item quando entra
     * comentário novo no meio: a próxima página é pedida a partir de onde a
     * anterior parou, e não a partir de uma posição que se desloca. Na
     * invalidação, o React Query refaz as páginas em sequência recalculando
     * cada cursor a partir da página anterior já revalidada, então a lista
     * cicatriza sozinha.
     */
    getNextPageParam: (ultimaPagina) =>
      ultimaPagina.length < FEED_PAGE_SIZE ? undefined : cursorDoComentario(ultimaPagina.at(-1)!),
    staleTime: STALE_TIMES.SHORT,
  });

  return {
    comentarios: query.data?.pages.flat() ?? [],
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
