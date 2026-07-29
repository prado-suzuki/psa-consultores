import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useInfiniteQuery: vi.fn((options: unknown) => ({ data: undefined, ...(options as object) })),
  // O hook importa `STALE_TIMES` de `@/lib/queryClient`, que instancia um
  // QueryClient no import — daí o construtor entrar no mock do módulo.
  QueryClient: class {},
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import {
  FEED_PAGE_SIZE,
  feedComentariosQueryKey,
  useDomainFeedComentarios,
} from '@/hooks/useDomainFeedComentarios';
import { supabase } from '@/integrations/supabase/client';

interface DbResult {
  data: unknown;
  error: unknown;
}
interface DbCall {
  table: string;
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
let anexosResult: DbResult = { data: [], error: null };
let rpcResult: DbResult = { data: [], error: null };

function makeSupabaseChain(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'order']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(anexosResult).then(onFulfilled, onRejected);
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((call) => call.table === table && call.method === method);
}

function registro() {
  const [options] = reactQueryMocks.useInfiniteQuery.mock.calls.at(-1) as [
    {
      queryKey: readonly unknown[];
      initialPageParam: unknown;
      queryFn: (ctx: { pageParam: unknown }) => Promise<unknown[]>;
      getNextPageParam: (ultimaPagina: unknown[]) => unknown;
      staleTime: number;
    },
  ];
  return options;
}

const comentario = (id: string, createdAt: string) => ({
  id,
  entity_type: 'org_task',
  entity_id: 'task-1',
  project_id: 'proj-1',
  parent_id: null,
  kind: 'comment',
  body: 'oi',
  metadata: {},
  author_id: 'user-1',
  author_name: 'Bernardo',
  editado_em: null,
  created_at: createdAt,
  updated_at: createdAt,
  entity_title: 'Apurar ICMS',
  project_name: 'Recuperação 2026',
  reply_count: 0,
  attachment_count: 0,
  excluido: false,
});

const paginaCheia = () =>
  Array.from({ length: FEED_PAGE_SIZE }, (_, indice) =>
    comentario(`c${indice}`, `2026-07-29T1${indice % 10}:00:00.000Z`),
  );

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  anexosResult = { data: [], error: null };
  rpcResult = { data: [], error: null };
  vi.mocked(supabase.from).mockImplementation((table: string) => makeSupabaseChain(table) as never);
  vi.mocked(supabase.rpc).mockImplementation(((...args: unknown[]) => {
    dbCalls.push({ table: 'rpc', method: String(args[0]), args: args.slice(1) });
    return Promise.resolve(rpcResult);
  }) as never);
});

describe('useDomainFeedComentarios — registro da query', () => {
  it('usa uma query key única do feed (stream único, não por projeto)', () => {
    renderHook(() => useDomainFeedComentarios());
    expect(registro().queryKey).toEqual(['org-comments-feed']);
    expect(feedComentariosQueryKey()).toEqual(['org-comments-feed']);
  });

  it('abre sem cursor e com staleTime curto', () => {
    renderHook(() => useDomainFeedComentarios());
    expect(registro().initialPageParam).toBeNull();
    expect(registro().staleTime).toBe(60 * 1000);
  });
});

describe('useDomainFeedComentarios — página', () => {
  it('chama a função do banco sem cursor na primeira página', async () => {
    renderHook(() => useDomainFeedComentarios());
    await registro().queryFn({ pageParam: null });

    expect(dbCalls).toEqual([
      {
        table: 'rpc',
        method: 'feed_org_comments',
        args: [{ _cursor_created_at: null, _cursor_id: null, _limit: FEED_PAGE_SIZE }],
      },
    ]);
  });

  it('passa o par (created_at, id) do cursor nas páginas seguintes', async () => {
    renderHook(() => useDomainFeedComentarios());
    await registro().queryFn({
      pageParam: { createdAt: '2026-07-29T12:00:00.000Z', id: 'c9' },
    });

    expect(callsFor('rpc', 'feed_org_comments')[0].args).toEqual([
      {
        _cursor_created_at: '2026-07-29T12:00:00.000Z',
        _cursor_id: 'c9',
        _limit: FEED_PAGE_SIZE,
      },
    ]);
  });

  it('hidrata os anexos da página num único lote, por comment_id', async () => {
    rpcResult = {
      data: [comentario('c1', '2026-07-29T12:00:00.000Z'), comentario('c2', '2026-07-29T11:00:00.000Z')],
      error: null,
    };
    anexosResult = {
      data: [
        { id: 'a1', comment_id: 'c2', file_name: 'print.png' },
        { id: 'a2', comment_id: 'c2', file_name: 'nota.pdf' },
      ],
      error: null,
    };

    renderHook(() => useDomainFeedComentarios());
    const pagina = (await registro().queryFn({ pageParam: null })) as Array<{
      id: string;
      attachments: unknown[];
    }>;

    expect(supabase.from).toHaveBeenCalledWith('org_comment_attachments');
    expect(callsFor('org_comment_attachments', 'in')[0].args).toEqual(['comment_id', ['c1', 'c2']]);
    expect(pagina.map((item) => item.attachments.length)).toEqual([0, 2]);
  });

  it('não busca anexos quando a página vem vazia', async () => {
    renderHook(() => useDomainFeedComentarios());
    const pagina = await registro().queryFn({ pageParam: null });

    expect(pagina).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propaga erro da função do banco', async () => {
    rpcResult = { data: null, error: new Error('boom') };
    renderHook(() => useDomainFeedComentarios());

    await expect(registro().queryFn({ pageParam: null })).rejects.toThrow('boom');
  });
});

describe('useDomainFeedComentarios — cursor da próxima página', () => {
  it('encerra o feed quando a página vem incompleta', () => {
    renderHook(() => useDomainFeedComentarios());
    expect(registro().getNextPageParam([comentario('c1', '2026-07-29T12:00:00.000Z')])).toBeUndefined();
    expect(registro().getNextPageParam([])).toBeUndefined();
  });

  it('devolve o par (created_at, id) do último item da página cheia', () => {
    const pagina = paginaCheia();
    const ultimo = pagina.at(-1)!;

    renderHook(() => useDomainFeedComentarios());
    expect(registro().getNextPageParam(pagina)).toEqual({
      createdAt: ultimo.created_at,
      id: ultimo.id,
    });
  });
});
