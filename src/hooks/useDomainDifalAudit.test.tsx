import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

const apiAuthMocks = vi.hoisted(() => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/hooks/useApiAuth', () => ({
  useApiAuth: () => ({ fetchWithAuth: apiAuthMocks.fetchWithAuth }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { API_BASE_URL } from '@/config/api';
import { useDomainDifalAudit } from '@/hooks/useDomainDifalAudit';
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
const dbResults = new Map<string, DbResult>();

function setDbResult(table: string, operation: string, result: DbResult) {
  dbResults.set(`${table}:${operation}`, result);
}

function makeSupabaseChain(table: string) {
  let operation = 'select';
  const chain: Record<string, unknown> = {};
  for (const method of [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'is',
    'in',
    'filter',
    'order',
    'limit',
    'single',
    'maybeSingle',
  ]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      if (['select', 'insert', 'update', 'delete', 'upsert'].includes(method)) operation = method;
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(dbResults.get(`${table}:${operation}`) ?? { data: [], error: null }).then(
      onFulfilled,
      onRejected,
    );
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((c) => c.table === table && c.method === method);
}
function queryRegistration() {
  return reactQueryMocks.useQuery.mock.calls[0][0] as Record<string, unknown>;
}
function mutationRegistration() {
  return reactQueryMocks.useMutation.mock.calls[0][0] as {
    networkMode?: string;
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

const group = { cod_ncm: '12345678' } as never;

function render(overrides: Partial<{ open: boolean; group: unknown; ufDestino: string }> = {}) {
  return renderHook(() =>
    useDomainDifalAudit({
      open: overrides.open ?? true,
      group: (overrides.group === undefined ? group : overrides.group) as never,
      ufDestino: overrides.ufDestino ?? 'SP',
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  apiAuthMocks.fetchWithAuth.mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ regras: [] }),
  });
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainDifalAudit — query de regras NCM', () => {
  it('registra a query key com cod_ncm e ufDestino', () => {
    render();
    expect(queryRegistration().queryKey).toEqual(['ncm-regras', '12345678', 'SP']);
  });

  it('habilita a query apenas com open, group e ufDestino presentes', () => {
    render();
    expect(queryRegistration().enabled).toBe(true);

    vi.clearAllMocks();
    render({ open: false });
    expect(queryRegistration().enabled).toBe(false);

    vi.clearAllMocks();
    render({ group: null });
    expect(queryRegistration().enabled).toBe(false);

    vi.clearAllMocks();
    render({ ufDestino: '' });
    expect(queryRegistration().enabled).toBe(false);
  });

  it('faz POST em /api/v1/ncm/regras com ncms e uf no corpo', async () => {
    render();
    await (queryRegistration().queryFn as () => Promise<unknown>)();
    expect(apiAuthMocks.fetchWithAuth).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/ncm/regras`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ncms: ['12345678'], uf: 'SP' }),
      }),
    );
  });

  it('retorna null sem group, sem chamar a API', async () => {
    render({ group: null });
    const result = await (queryRegistration().queryFn as () => Promise<unknown>)();
    expect(result).toBeNull();
    expect(apiAuthMocks.fetchWithAuth).not.toHaveBeenCalled();
  });

  it('lança erro quando a resposta não é ok', async () => {
    apiAuthMocks.fetchWithAuth.mockResolvedValueOnce({ ok: false });
    render();
    await expect((queryRegistration().queryFn as () => Promise<unknown>)()).rejects.toThrow(
      'Erro ao buscar regras NCM',
    );
  });
});

describe('useDomainDifalAudit — mutation salvar decisão', () => {
  const input = {
    sessaoId: 'sess-1',
    codNcm: '12345678',
    decisao: 'aplicar' as never,
    regraId: 'regra-1',
  };

  it('usa networkMode always', () => {
    render();
    expect(mutationRegistration().networkMode).toBe('always');
  });

  it('consulta linha existente filtrando por sessao_id e cod_ncm', async () => {
    render();
    await mutationRegistration().mutationFn(input);
    expect(callsFor('difal_decisao', 'select')[0].args).toEqual(['id']);
    expect(callsFor('difal_decisao', 'eq').map((c) => c.args)).toEqual([
      ['sessao_id', 'sess-1'],
      ['cod_ncm', '12345678'],
    ]);
  });

  it('faz precheck de update quando já existe linha', async () => {
    setDbResult('difal_decisao', 'select', { data: { id: 'ex-1' }, error: null });
    render();
    await mutationRegistration().mutationFn(input);
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('difal_decisao', 'update', 'ex-1');
  });

  it('não faz precheck quando não existe linha (insert via upsert)', async () => {
    setDbResult('difal_decisao', 'select', { data: null, error: null });
    render();
    await mutationRegistration().mutationFn(input);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('faz upsert com onConflict sessao_id,cod_ncm e o payload da decisão', async () => {
    render();
    await mutationRegistration().mutationFn(input);
    expect(callsFor('difal_decisao', 'upsert')[0].args).toEqual([
      {
        sessao_id: 'sess-1',
        cod_ncm: '12345678',
        decisao: 'aplicar',
        id_icms_st_bq: 'regra-1',
        decidido_em: expect.any(String),
      },
      { onConflict: 'sessao_id,cod_ncm' },
    ]);
  });

  it('propaga erro do upsert', async () => {
    setDbResult('difal_decisao', 'upsert', { data: null, error: new Error('falha upsert') });
    render();
    await expect(mutationRegistration().mutationFn(input)).rejects.toThrow('falha upsert');
  });
});
