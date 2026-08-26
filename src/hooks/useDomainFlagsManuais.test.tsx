import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));
const auditMocks = vi.hoisted(() => ({ logAction: vi.fn() }));
const dbMocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: auditMocks.logAction }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: dbMocks.from, auth: { getUser: dbMocks.getUser } },
}));

import {
  nomesDasFlagsManuaisLigadas,
  useDefinirFlagManual,
  useFlagsManuaisProjeto,
  type ProjetoFlagValorRow,
} from '@/hooks/useDomainFlagsManuais';

// Harness de cadeia Supabase com resultado por (tabela, operação): a escrita faz
// select → insert/update na MESMA tabela, e cada passo precisa devolver o seu.
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
const dbResults = new Map<string, DbResult>();

const setDbResult = (table: string, operacao: string, result: DbResult) =>
  dbResults.set(`${table}:${operacao}`, result);

function makeSupabaseChain(table: string) {
  let operacao = 'select';
  const chain: Record<string, unknown> = {};
  for (const method of [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'is', 'in', 'or', 'order', 'limit', 'single', 'maybeSingle',
  ]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      // A operação é a da ESCRITA, não a do `.select('*')` que vem depois dela
      // para devolver a linha gravada (leitura pura já começa em 'select').
      if (['insert', 'update', 'delete', 'upsert'].includes(method)) operacao = method;
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(dbResults.get(`${table}:${operacao}`) ?? { data: [], error: null }).then(
      onFulfilled,
      onRejected,
    );
  return chain;
}

const chamadas = (method: string) => dbCalls.filter((c) => c.method === method);

const linha = (over: Partial<ProjetoFlagValorRow>): ProjetoFlagValorRow =>
  ({
    id: 'pfv-1',
    cliente_id: 'cli-1',
    pj_pessoa_id: null,
    flag_id: 'flag-1',
    valor: true,
    setado_por_id: null,
    created_at: '2026-08-24T12:00:00Z',
    created_by: null,
    updated_at: '2026-08-24T12:00:00Z',
    updated_by: null,
    ...over,
  }) as ProjetoFlagValorRow;

function queryRegistrada() {
  return reactQueryMocks.useQuery.mock.calls[0][0] as {
    queryKey: readonly unknown[];
    enabled: boolean;
    queryFn: () => Promise<ProjetoFlagValorRow[]>;
  };
}

function mutationRegistrada() {
  return reactQueryMocks.useMutation.mock.calls[0][0] as {
    mutationFn: (input: unknown) => Promise<{ linha: ProjetoFlagValorRow; anterior: boolean | null }>;
    onSuccess: (r: { linha: ProjetoFlagValorRow; anterior: boolean | null }, input: unknown) => void;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  dbMocks.from.mockImplementation((t: string) => makeSupabaseChain(t) as never);
  dbMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

describe('useFlagsManuaisProjeto — leitura por escopo', () => {
  it('só consulta com cliente e chaveia por cliente + empresa', () => {
    renderHook(() => useFlagsManuaisProjeto({ clienteId: 'cli-1', pjPessoaId: 'pj-9' }));
    expect(queryRegistrada().queryKey).toEqual(['projeto-flag-valor', 'cli-1', 'pj-9']);
    expect(queryRegistrada().enabled).toBe(true);
  });

  it('fica desabilitada sem cliente', () => {
    renderHook(() => useFlagsManuaisProjeto({ clienteId: null, pjPessoaId: null }));
    expect(queryRegistrada().enabled).toBe(false);
    expect(queryRegistrada().queryKey).toEqual(['projeto-flag-valor', '∅', '∅']);
  });

  it('com empresa, traz os dois escopos: linha do cliente (pj nulo) e a da empresa', async () => {
    setDbResult('projeto_flag_valor', 'select', {
      data: [linha({}), linha({ id: 'pfv-2', pj_pessoa_id: 'pj-9' })],
      error: null,
    });
    renderHook(() => useFlagsManuaisProjeto({ clienteId: 'cli-1', pjPessoaId: 'pj-9' }));

    const linhas = await queryRegistrada().queryFn();

    expect(dbMocks.from).toHaveBeenCalledWith('projeto_flag_valor');
    expect(chamadas('eq')[0].args).toEqual(['cliente_id', 'cli-1']);
    expect(chamadas('or')[0].args).toEqual(['pj_pessoa_id.is.null,pj_pessoa_id.eq.pj-9']);
    expect(chamadas('is')).toHaveLength(0);
    expect(linhas.map((l) => l.id)).toEqual(['pfv-1', 'pfv-2']);
  });

  it('sem empresa, restringe ao escopo cliente com IS NULL (não com igualdade)', async () => {
    renderHook(() => useFlagsManuaisProjeto({ clienteId: 'cli-1', pjPessoaId: null }));

    await queryRegistrada().queryFn();

    expect(chamadas('eq')[0].args).toEqual(['cliente_id', 'cli-1']);
    expect(chamadas('is')[0].args).toEqual(['pj_pessoa_id', null]);
    expect(chamadas('or')).toHaveLength(0);
  });

  it('propaga erro da leitura', async () => {
    const error = new Error('rls negou');
    setDbResult('projeto_flag_valor', 'select', { data: null, error });
    renderHook(() => useFlagsManuaisProjeto({ clienteId: 'cli-1', pjPessoaId: null }));

    await expect(queryRegistrada().queryFn()).rejects.toBe(error);
  });
});

describe('useDefinirFlagManual — toggle', () => {
  const entrada = (over: Record<string, unknown> = {}) => ({
    clienteId: 'cli-1',
    pjPessoaId: 'pj-9',
    flagId: 'flag-1',
    flagNome: 'evento_aumento_capital',
    escopo: 'pj' as const,
    valor: true,
    ...over,
  });

  it('sem linha ainda, insere no escopo pj respeitando o índice único da empresa', async () => {
    setDbResult('projeto_flag_valor', 'select', { data: null, error: null });
    setDbResult('projeto_flag_valor', 'insert', { data: linha({ pj_pessoa_id: 'pj-9' }), error: null });
    renderHook(() => useDefinirFlagManual());

    const r = await mutationRegistrada().mutationFn(entrada());

    expect(chamadas('eq').slice(0, 3).map((c) => c.args)).toEqual([
      ['cliente_id', 'cli-1'],
      ['flag_id', 'flag-1'],
      ['pj_pessoa_id', 'pj-9'],
    ]);
    expect(chamadas('insert')[0].args).toEqual([
      {
        cliente_id: 'cli-1',
        pj_pessoa_id: 'pj-9',
        flag_id: 'flag-1',
        valor: true,
        setado_por_id: 'user-1',
        created_by: 'user-1',
        updated_by: 'user-1',
      },
    ]);
    expect(r.anterior).toBeNull();
  });

  it('escopo cliente ignora a empresa e grava pj_pessoa_id nulo (índice único parcial do cliente)', async () => {
    setDbResult('projeto_flag_valor', 'select', { data: null, error: null });
    setDbResult('projeto_flag_valor', 'insert', { data: linha({}), error: null });
    renderHook(() => useDefinirFlagManual());

    await mutationRegistrada().mutationFn(entrada({ escopo: 'cliente' }));

    // A busca do existente também precisa ser por IS NULL, senão acharia a linha errada.
    expect(chamadas('is')[0].args).toEqual(['pj_pessoa_id', null]);
    expect((chamadas('insert')[0].args[0] as Record<string, unknown>).pj_pessoa_id).toBeNull();
  });

  it('com linha existente, atualiza pelo id e devolve o valor anterior', async () => {
    setDbResult('projeto_flag_valor', 'select', {
      data: linha({ id: 'pfv-7', pj_pessoa_id: 'pj-9', valor: true }),
      error: null,
    });
    setDbResult('projeto_flag_valor', 'update', {
      data: linha({ id: 'pfv-7', pj_pessoa_id: 'pj-9', valor: false }),
      error: null,
    });
    renderHook(() => useDefinirFlagManual());

    const r = await mutationRegistrada().mutationFn(entrada({ valor: false }));

    expect(chamadas('update')[0].args).toEqual([
      { valor: false, setado_por_id: 'user-1', updated_by: 'user-1' },
    ]);
    expect(chamadas('eq').at(-1)!.args).toEqual(['id', 'pfv-7']);
    expect(chamadas('insert')).toHaveLength(0);
    expect(r.anterior).toBe(true);
    expect(r.linha.valor).toBe(false);
  });

  it('recusa flag de escopo pj sem empresa escolhida, sem tocar no banco', async () => {
    renderHook(() => useDefinirFlagManual());

    await expect(mutationRegistrada().mutationFn(entrada({ pjPessoaId: null }))).rejects.toThrow(
      /empresa do contrato/i,
    );
    expect(dbMocks.from).not.toHaveBeenCalled();
  });

  it('propaga erro da escrita', async () => {
    const error = new Error('falha no update');
    setDbResult('projeto_flag_valor', 'select', { data: linha({ id: 'pfv-7' }), error: null });
    setDbResult('projeto_flag_valor', 'update', { data: null, error });
    renderHook(() => useDefinirFlagManual());

    await expect(mutationRegistrada().mutationFn(entrada({ escopo: 'cliente' }))).rejects.toBe(error);
  });

  it('audita o toggle com o diff do valor', () => {
    renderHook(() => useDefinirFlagManual());

    mutationRegistrada().onSuccess(
      { linha: linha({ id: 'pfv-7', valor: false }), anterior: true },
      entrada({ valor: false }),
    );

    expect(auditMocks.logAction).toHaveBeenCalledWith({
      area: 'osg',
      entity_type: 'projeto_flag_valor',
      entity_id: 'pfv-7',
      entity_name: 'evento_aumento_capital',
      action: 'updated',
      changed_fields: { valor: { old: true, new: false } },
    });
  });

  it('audita como criação quando a linha não existia', () => {
    renderHook(() => useDefinirFlagManual());

    mutationRegistrada().onSuccess({ linha: linha({ valor: true }), anterior: null }, entrada());

    expect(auditMocks.logAction.mock.calls[0][0]).toMatchObject({
      action: 'created',
      changed_fields: { valor: { old: null, new: true } },
    });
  });
});

describe('nomesDasFlagsManuaisLigadas', () => {
  const nomes = new Map([
    ['flag-1', 'evento_aumento_capital'],
    ['flag-2', 'evento_cessao_quotas'],
  ]);

  it('devolve só os nomes das ligadas, e ignora flag_id fora do catálogo', () => {
    const valores = [
      linha({ id: 'a', flag_id: 'flag-1', valor: true }),
      linha({ id: 'b', flag_id: 'flag-2', valor: false }),
      linha({ id: 'c', flag_id: 'flag-inexistente', valor: true }),
    ];
    expect(nomesDasFlagsManuaisLigadas(valores, nomes)).toEqual(['evento_aumento_capital']);
  });
});
