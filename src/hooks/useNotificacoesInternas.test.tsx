import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => ({ data: undefined, ...(options as object) })),
  useMutation: vi.fn((options: unknown) => ({ mutate: vi.fn(), ...(options as object) })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'U1' } }) }));
vi.mock('@/config/api', () => ({ currentAmbiente: 'prod' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import {
  notificacoesInternasQueryKey,
  useNotificacoesInternas,
} from '@/hooks/useNotificacoesInternas';
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
      refetchInterval: number;
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

const linha = (extra: Record<string, unknown> = {}) => ({
  id: 'N1',
  tipo: 'tarefa_atribuida',
  titulo: 'Voce e o responsavel: Apurar ICMS',
  corpo: null,
  entidade_tipo: 'org_task',
  entidade_id: 'T1',
  href: null,
  quantidade: 1,
  metadata: {},
  created_at: '2026-08-11T12:00:00.000Z',
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  resultado = { data: [], error: null };
  vi.mocked(supabase.from).mockImplementation((table: string) => makeSupabaseChain(table) as never);
});

describe('useNotificacoesInternas — registro da query', () => {
  it('usa uma query key por usuário e o mesmo compasso das outras notificações do sino', () => {
    renderHook(() => useNotificacoesInternas());

    expect(queryRegistro().queryKey).toEqual(['notificacoes-internas', 'U1']);
    expect(notificacoesInternasQueryKey('U1')).toEqual(['notificacoes-internas', 'U1']);
    expect(queryRegistro().enabled).toBe(true);
    expect(queryRegistro().staleTime).toBe(30000);
    expect(queryRegistro().refetchInterval).toBe(30000);
  });
});

describe('useNotificacoesInternas — leitura da caixa', () => {
  it('lê só os avisos meus ainda não lidos, mais recentes primeiro', async () => {
    renderHook(() => useNotificacoesInternas());
    await queryRegistro().queryFn();

    expect(supabase.from).toHaveBeenCalledWith('notificacao');
    // `quantidade` e `metadata` fazem parte do contrato da leitura: a primeira é o
    // agrupamento visível na linha, a segunda carrega o ambiente do evento.
    expect(callsFor('select')[0].args).toEqual([
      'id, tipo, titulo, corpo, entidade_tipo, entidade_id, href, quantidade, metadata, created_at',
    ]);
    expect(callsFor('eq')[0].args).toEqual(['destinatario_id', 'U1']);
    expect(callsFor('is')[0].args).toEqual(['lido_em', null]);
    expect(callsFor('order')[0].args).toEqual(['created_at', { ascending: false }]);
    expect(callsFor('limit')[0].args).toEqual([20]);
  });

  it('vai ao banco uma vez só, ao contrário do hook de menção', async () => {
    resultado = { data: [linha()], error: null };
    renderHook(() => useNotificacoesInternas());
    await queryRegistro().queryFn();

    expect(vi.mocked(supabase.from).mock.calls).toHaveLength(1);
  });

  it('devolve o aviso como veio, porque título e destino já estão na linha', async () => {
    resultado = { data: [linha()], error: null };

    renderHook(() => useNotificacoesInternas());
    const avisos = (await queryRegistro().queryFn()) as Array<Record<string, unknown>>;

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      id: 'N1',
      tipo: 'tarefa_atribuida',
      entidade_tipo: 'org_task',
      entidade_id: 'T1',
      href: null,
      quantidade: 1,
    });
  });

  it('descarta aviso do outro ambiente e mantém o que não carrega ambiente', async () => {
    resultado = {
      data: [
        linha({ id: 'N1', metadata: {} }),
        linha({ id: 'N2', metadata: { ambiente: 'prod' } }),
        linha({ id: 'N3', metadata: { ambiente: 'dev' } }),
      ],
      error: null,
    };

    renderHook(() => useNotificacoesInternas());
    const avisos = (await queryRegistro().queryFn()) as Array<Record<string, unknown>>;

    // O ambiente do teste é `prod`, então o de `dev` sai.
    expect(avisos.map((aviso) => aviso.id)).toEqual(['N1', 'N2']);
  });

  it('caixa vazia devolve lista vazia', async () => {
    renderHook(() => useNotificacoesInternas());

    await expect(queryRegistro().queryFn()).resolves.toEqual([]);
  });

  it('propaga erro da leitura', async () => {
    resultado = { data: null, error: new Error('boom') };
    renderHook(() => useNotificacoesInternas());

    await expect(queryRegistro().queryFn()).rejects.toThrow('boom');
  });
});

describe('useNotificacoesInternas — marcar como lido', () => {
  it('carimba só lido_em, nos avisos informados e sempre presos ao usuário', async () => {
    renderHook(() => useNotificacoesInternas());
    await mutationRegistro().mutationFn(['N1', 'N2']);

    const [update] = callsFor('update');
    // Só `lido_em`: é a única coluna que o privilégio da EDU-1 concede ao
    // destinatário, e qualquer outro campo aqui voltaria 42501.
    expect(Object.keys(update.args[0] as object)).toEqual(['lido_em']);
    expect(callsFor('in')[0].args).toEqual(['id', ['N1', 'N2']]);
    expect(callsFor('eq')[0].args).toEqual(['destinatario_id', 'U1']);
  });

  it('não vai ao banco quando não há aviso para marcar', async () => {
    renderHook(() => useNotificacoesInternas());
    await mutationRegistro().mutationFn([]);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propaga erro da gravação', async () => {
    resultado = { data: null, error: new Error('sem permissão') };
    renderHook(() => useNotificacoesInternas());

    await expect(mutationRegistro().mutationFn(['N1'])).rejects.toThrow('sem permissão');
  });
});
