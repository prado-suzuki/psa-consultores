import { useInfiniteQuery } from '@tanstack/react-query';

import {
  buscarAnexosPorComentario,
  type OrgComment,
} from '@/hooks/useDomainOrgComments';
import { supabase } from '@/integrations/supabase/client';
import { cursorDoComentario, type FeedCursor } from '@/lib/feedComentarios';
import { STALE_TIMES } from '@/lib/queryClient';

/**
 * Camada de dados do feed de comentários: uma página por vez da função
 * `public.feed_org_comments`, em ordem cronológica decrescente.
 *
 * A relevância não é montada aqui — vem da RLS de `org_comments`, que a função
 * respeita por ser `SECURITY INVOKER` sobre uma view `security_invoker`. O
 * front só pede a próxima página.
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

export const feedComentariosQueryKey = () => ['org-comments-feed'] as const;

/** A linha que a função devolve é a da view — os anexos entram depois. */
type LinhaDoFeed = Omit<OrgComment, 'attachments'>;

export type FeedComentario = OrgComment;

interface FeedRpcParams {
  _cursor_created_at: string | null;
  _cursor_id: string | null;
  _limit: number;
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

async function buscarPagina(cursor: FeedCursor | null): Promise<FeedComentario[]> {
  const { data, error } = await (supabase.rpc as unknown as FeedRpc)(RPC, {
    _cursor_created_at: cursor?.createdAt ?? null,
    _cursor_id: cursor?.id ?? null,
    _limit: FEED_PAGE_SIZE,
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

export function useDomainFeedComentarios() {
  const query = useInfiniteQuery({
    queryKey: feedComentariosQueryKey(),
    initialPageParam: null as FeedCursor | null,
    queryFn: ({ pageParam }) => buscarPagina(pageParam),
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
