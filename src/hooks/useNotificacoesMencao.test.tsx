import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => ({ data: undefined, ...(options as object) })),
  useMutation: vi.fn((options: unknown) => ({ mutate: vi.fn(), ...(options as object) })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

const mocks = vi.hoisted(() => ({
  buscarComentariosPorId: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'U1' } }) }));
vi.mock('@/hooks/useDomainOrgComments', () => ({
  buscarComentariosPorId: mocks.buscarComentariosPorId,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { notificacoesMencaoQueryKey, useNotificacoesMencao } from '@/hooks/useNotificacoesMencao';
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
let resultado: DbResult = { data: [], error: null };

function makeSupabaseChain(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'order', 'limit', 'update', 'in']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(onFulfilled, onRejected);
  return chain;
}

function callsFor(method: string) {
  return dbCalls.filter((call) => call.method === method);
}

function queryRegistro() {
  const [options] = reactQueryMocks.useQuery.mock.calls.at(-1) as [
    {
      queryKey: readonly unknown[];
      queryFn: () => Promise<unknown[]>;
      enabled: boolean;
      staleTime: number;
      refetchInterval: number | false;
    },
  ];
  return options;
}

function mutationRegistro() {
  const [options] = reactQueryMocks.useMutation.mock.calls.at(-1) as [
    { mutationFn: (ids: string[]) => Promise<unknown> },
  ];
  return options;
}

const comentario = () => ({
  id: 'C1',
  entity_type: 'org_task',
  entity_id: 'T1',
  entity_title: 'Apurar ICMS',
  project_name: 'Recuperação 2026',
  author_id: 'U2',
  author_name: 'Ana Souza',
  body: 'Bernardo, confere',
  created_at: '2026-07-29T11:00:00.000Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  resultado = { data: [], error: null };
  mocks.buscarComentariosPorId.mockResolvedValue(new Map());
  vi.mocked(supabase.from).mockImplementation((table: string) => makeSupabaseChain(table) as never);
});

describe('useNotificacoesMencao — registro da query', () => {
  it('usa uma query key por usuário e o mesmo compasso das outras notificações do sino', () => {
    renderHook(() => useNotificacoesMencao());

    expect(queryRegistro().queryKey).toEqual(['mencao-notifications', 'U1']);
    expect(notificacoesMencaoQueryKey('U1')).toEqual(['mencao-notifications', 'U1']);
    expect(queryRegistro().enabled).toBe(true);
    expect(queryRegistro().staleTime).toBe(30000);
    expect(queryRegistro().refetchInterval).toBe(30000);
  });
});

describe('useNotificacoesMencao — leitura da caixa', () => {
  it('lê as linhas minhas, lidas ou não, mais recentes primeiro', async () => {
    renderHook(() => useNotificacoesMencao());
    await queryRegistro().queryFn();

    expect(supabase.from).toHaveBeenCalledWith('org_comment_mentions');
    // `motivo` faz parte do contrato da leitura: é o que separa "mencionou você"
    // de "respondeu você" no sino. `lido_em` entrou em 14/09/2026, quando deixou
    // de ser filtro e virou o campo `lida` da notificação.
    expect(callsFor('select')[0].args).toEqual(['id, comment_id, created_at, motivo, lido_em']);
    expect(callsFor('eq')[0].args).toEqual(['mentioned_user_id', 'U1']);
    expect(callsFor('order')[0].args).toEqual(['created_at', { ascending: false }]);
    expect(callsFor('limit')[0].args).toEqual([30]);
  });

  /*
   * A trava do histórico, igual à do hook de avisos internos: o balão mostra as
   * últimas 30, e voltar a filtrar por não lido esvaziaria a lista na abertura.
   */
  it('não filtra por lido_em, senão o balão se esvaziaria ao ser aberto', async () => {
    renderHook(() => useNotificacoesMencao());
    await queryRegistro().queryFn();

    expect(callsFor('is')).toEqual([]);
  });

  it('marca a linha já carimbada como lida, e ela sai da conta da bolinha', async () => {
    resultado = {
      data: [
        {
          id: 'M1',
          comment_id: 'C1',
          created_at: '2026-07-29T12:00:00.000Z',
          motivo: 'mencao',
          lido_em: '2026-09-14T10:00:00.000Z',
        },
        {
          id: 'M2',
          comment_id: 'C1',
          created_at: '2026-07-29T12:00:00.000Z',
          motivo: 'mencao',
          lido_em: null,
        },
      ],
      error: null,
    };
    mocks.buscarComentariosPorId.mockResolvedValue(new Map([['C1', comentario()]]));

    renderHook(() => useNotificacoesMencao());
    const notificacoes = (await queryRegistro().queryFn()) as Array<Record<string, unknown>>;

    expect(notificacoes.map((item) => item.lida)).toEqual([true, false]);
  });

  it('hidrata os comentários citados num lote só e devolve a notificação montada', async () => {
    resultado = {
      data: [
        {
          id: 'M1',
          comment_id: 'C1',
          created_at: '2026-07-29T12:00:00.000Z',
          motivo: 'mencao',
          lido_em: null,
        },
      ],
      error: null,
    };
    mocks.buscarComentariosPorId.mockResolvedValue(new Map([['C1', comentario()]]));

    renderHook(() => useNotificacoesMencao());
    const notificacoes = (await queryRegistro().queryFn()) as Array<Record<string, unknown>>;

    expect(mocks.buscarComentariosPorId).toHaveBeenCalledWith(['C1']);
    expect(notificacoes).toHaveLength(1);
    expect(notificacoes[0]).toMatchObject({
      id: 'M1',
      commentId: 'C1',
      authorName: 'Ana Souza',
      motivo: 'mencao',
      trecho: 'Bernardo, confere',
    });
  });

  it('a linha de resposta chega ao sino com o motivo resposta', async () => {
    resultado = {
      data: [
        {
          id: 'M2',
          comment_id: 'C1',
          created_at: '2026-07-29T12:00:00.000Z',
          motivo: 'resposta',
          lido_em: null,
        },
      ],
      error: null,
    };
    mocks.buscarComentariosPorId.mockResolvedValue(new Map([['C1', comentario()]]));

    renderHook(() => useNotificacoesMencao());
    const notificacoes = (await queryRegistro().queryFn()) as Array<Record<string, unknown>>;

    expect(notificacoes[0]).toMatchObject({ id: 'M2', motivo: 'resposta' });
  });

  it('motivo desconhecido ou ausente lê como menção', async () => {
    resultado = {
      data: [
        {
          id: 'M3',
          comment_id: 'C1',
          created_at: '2026-07-29T12:00:00.000Z',
          motivo: null,
          lido_em: null,
        },
        {
          id: 'M4',
          comment_id: 'C1',
          created_at: '2026-07-29T12:00:00.000Z',
          motivo: 'outro',
          lido_em: null,
        },
      ],
      error: null,
    };
    mocks.buscarComentariosPorId.mockResolvedValue(new Map([['C1', comentario()]]));

    renderHook(() => useNotificacoesMencao());
    const notificacoes = (await queryRegistro().queryFn()) as Array<Record<string, unknown>>;

    // Toda linha era menção antes da coluna existir — é o padrão seguro.
    expect(notificacoes.map((item) => item.motivo)).toEqual(['mencao', 'mencao']);
  });

  it('não busca comentário quando a caixa está vazia', async () => {
    renderHook(() => useNotificacoesMencao());

    await expect(queryRegistro().queryFn()).resolves.toEqual([]);
    expect(mocks.buscarComentariosPorId).not.toHaveBeenCalled();
  });

  it('propaga erro da leitura das menções', async () => {
    resultado = { data: null, error: new Error('boom') };
    renderHook(() => useNotificacoesMencao());

    await expect(queryRegistro().queryFn()).rejects.toThrow('boom');
  });
});

describe('useNotificacoesMencao — marcar como lida', () => {
  it('carimba lido_em nas menções informadas, sempre presas ao usuário', async () => {
    renderHook(() => useNotificacoesMencao());
    await mutationRegistro().mutationFn(['M1', 'M2']);

    const [update] = callsFor('update');
    expect(Object.keys(update.args[0] as object)).toEqual(['lido_em']);
    expect(callsFor('in')[0].args).toEqual(['id', ['M1', 'M2']]);
    expect(callsFor('eq')[0].args).toEqual(['mentioned_user_id', 'U1']);
  });

  it('não vai ao banco quando não há menção para marcar', async () => {
    renderHook(() => useNotificacoesMencao());
    await mutationRegistro().mutationFn([]);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propaga erro da gravação', async () => {
    resultado = { data: null, error: new Error('sem permissão') };
    renderHook(() => useNotificacoesMencao());

    await expect(mutationRegistro().mutationFn(['M1'])).rejects.toThrow('sem permissão');
  });
});
