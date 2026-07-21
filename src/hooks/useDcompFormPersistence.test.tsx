import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  assertCanPerform: vi.fn().mockResolvedValue(undefined),
  sync: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/hooks/useRlsPrecheck', () => ({ assertCanPerform: mocks.assertCanPerform }));
vi.mock('@/lib/syncPerdcomp', () => ({ syncPerdcompToDW: mocks.sync }));

import {
  useCreateDcompForm,
  useDcompsExistentesForm,
  useDistribuicoesDcompForm,
  usePersDcompForm,
  useSyncDcompForm,
  useUpdateDcompForm,
} from '@/hooks/useDcompFormPersistence';
import { supabase } from '@/integrations/supabase/client';

interface Call {
  table: string;
  method: string;
  args: unknown[];
}
interface Result {
  data: unknown;
  error: unknown;
}
interface QueryRegistration {
  queryKey: unknown[];
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
}
interface MutationRegistration {
  mutationFn: (variables: never) => Promise<unknown>;
  onSuccess?: (value: unknown) => void;
  onError?: (error: Error) => void;
}

const calls: Call[] = [];
const sequence: string[] = [];
const results = new Map<string, Result[]>();

function chain(table: string) {
  const query: Record<string, unknown> = {};
  for (const method of [
    'select',
    'eq',
    'order',
    'limit',
    'maybeSingle',
    'insert',
    'update',
    'delete',
  ]) {
    query[method] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method, args });
      sequence.push(`${table}.${method}`);
      return query;
    });
  }
  query.then = (resolve: (result: Result) => unknown) =>
    Promise.resolve(results.get(table)?.shift() ?? { data: [], error: null }).then(resolve);
  return query;
}

const registrations = () => mocks.useQuery.mock.calls.map(([value]) => value as QueryRegistration);
const mutations = () =>
  mocks.useMutation.mock.calls.map(([value]) => value as MutationRegistration);
const callsFor = (table: string, method: string) =>
  calls.filter((call) => call.table === table && call.method === method).map((call) => call.args);

const context = {
  data: {
    nr_documento: '12.34',
    nr_per_orig: 'PER-9',
    mes_ano_exercicio: '2026-07',
    dt_envio: '2026-07-17',
    vlr_compensado: 10,
    nr_dcomp_ret: null,
  },
  distribuicoes: [
    { grupo_tributo_id: 'G1', codigo_receita_id: 'C1', valor_tributo: 10, competencia: '2026-07' },
  ],
  existentes: [],
  grupos: [{ id: 'G1', sigla: 'IRPJ' }],
  isEditing: false,
  dtEnvioMudou: false,
  proporcaoOriginal: 0.8,
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  sequence.length = 0;
  results.clear();
  vi.mocked(supabase.from).mockImplementation((table: string) => chain(table) as never);
});

describe('consultas do formulário DCOMP', () => {
  it('registra query keys e enabled com os parâmetros exatos', () => {
    renderHook(() => {
      useDistribuicoesDcompForm('D1', true);
      useDistribuicoesDcompForm(undefined, true);
      useDcompsExistentesForm('P1');
      useDcompsExistentesForm(undefined);
      usePersDcompForm('C1');
      usePersDcompForm(undefined);
    });
    expect(registrations().map(({ queryKey, enabled }) => ({ queryKey, enabled }))).toEqual([
      { queryKey: ['dcomp-distribuicoes', 'D1'], enabled: true },
      { queryKey: ['dcomp-distribuicoes', undefined], enabled: false },
      { queryKey: ['dcomps-existentes', 'P1'], enabled: true },
      { queryKey: ['dcomps-existentes', undefined], enabled: false },
      { queryKey: ['pers-for-dcomp', 'C1'], enabled: undefined },
      { queryKey: ['pers-for-dcomp', undefined], enabled: undefined },
    ]);
  });

  it('aplica selects, filtros e ordens, omitindo somente o filtro opcional de contribuinte', async () => {
    renderHook(() => {
      useDistribuicoesDcompForm('D1', true);
      useDcompsExistentesForm('P1');
      usePersDcompForm('C1');
      usePersDcompForm(undefined);
    });
    await Promise.all(registrations().map(({ queryFn }) => queryFn()));

    expect(callsFor('distribuicao_dcomp', 'select')).toEqual([
      [
        'id, tributo, grupo_tributo_id, codigo_receita_id, valor_tributo, competencia, valor_original',
      ],
    ]);
    expect(callsFor('distribuicao_dcomp', 'eq')).toEqual([['nr_documento', 'D1']]);
    expect(callsFor('dcomp', 'select')).toEqual([
      ['nr_documento, mes_ano_exercicio, nr_dcomp_ret'],
    ]);
    expect(callsFor('dcomp', 'eq')).toEqual([['nr_per_orig', 'P1']]);
    expect(callsFor('dcomp', 'order')).toEqual([['dt_envio', { ascending: false }]]);
    expect(callsFor('per', 'select')).toEqual([
      [
        'nr_per, id_contribuinte, exercicio, tri_exercicio, dt_solicitada, tp_credito, porcentagem_psa',
      ],
      [
        'nr_per, id_contribuinte, exercicio, tri_exercicio, dt_solicitada, tp_credito, porcentagem_psa',
      ],
    ]);
    expect(callsFor('per', 'order')).toEqual([
      ['exercicio', { ascending: false }],
      ['exercicio', { ascending: false }],
    ]);
    expect(callsFor('per', 'eq')).toEqual([['id_contribuinte', 'C1']]);
  });

  it('mapeia números, competência e nulos da distribuição e preserva opções das demais queries', async () => {
    const rawDcomps = [{ nr_documento: 'D1', mes_ano_exercicio: '2026-01', nr_dcomp_ret: null }];
    const rawPers = [{ nr_per: 'P1', exercicio: 2026 }];
    results.set('distribuicao_dcomp', [
      {
        data: [
          {
            id: 'L1',
            tributo: 'IR',
            grupo_tributo_id: null,
            codigo_receita_id: 'C1',
            valor_tributo: '12.50',
            competencia: '2026-07-31',
            valor_original: '10.25',
          },
          {
            id: 'L2',
            tributo: null,
            grupo_tributo_id: 'G2',
            codigo_receita_id: null,
            valor_tributo: 'inválido',
            competencia: null,
            valor_original: null,
          },
        ],
        error: null,
      },
    ]);
    results.set('dcomp', [{ data: rawDcomps, error: null }]);
    results.set('per', [{ data: rawPers, error: null }]);
    renderHook(() => {
      useDistribuicoesDcompForm('D1', true);
      useDcompsExistentesForm('P1');
      usePersDcompForm(undefined);
    });
    const [distribuicoes, dcomps, pers] = await Promise.all(
      registrations().map(({ queryFn }) => queryFn()),
    );
    expect(distribuicoes).toEqual([
      {
        id: 'L1',
        _legacyTributo: 'IR',
        grupo_tributo_id: null,
        codigo_receita_id: 'C1',
        valor_tributo: 12.5,
        competencia: '2026-07',
        valor_original: 10.25,
      },
      {
        id: 'L2',
        _legacyTributo: null,
        grupo_tributo_id: 'G2',
        codigo_receita_id: null,
        valor_tributo: 0,
        competencia: '',
        valor_original: null,
      },
    ]);
    expect(dcomps).toBe(rawDcomps);
    expect(pers).toBe(rawPers);
  });

  it('retorna defaults sem consultar e propaga erros das três tabelas', async () => {
    renderHook(() => {
      useDistribuicoesDcompForm(undefined, true);
      useDcompsExistentesForm(undefined);
    });
    await expect(Promise.all(registrations().map(({ queryFn }) => queryFn()))).resolves.toEqual([
      [],
      [],
    ]);
    expect(supabase.from).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const distribuicaoError = new Error('falha distribuicao_dcomp');
    results.set('distribuicao_dcomp', [{ data: null, error: distribuicaoError }]);
    renderHook(() => useDistribuicoesDcompForm('D', true));
    await expect(registrations()[0].queryFn()).rejects.toBe(distribuicaoError);

    vi.clearAllMocks();
    const dcompError = new Error('falha dcomp');
    results.set('dcomp', [{ data: null, error: dcompError }]);
    renderHook(() => useDcompsExistentesForm('P'));
    await expect(registrations()[0].queryFn()).rejects.toBe(dcompError);

    vi.clearAllMocks();
    const perError = new Error('falha per');
    results.set('per', [{ data: null, error: perError }]);
    renderHook(() => usePersDcompForm(undefined));
    await expect(registrations()[0].queryFn()).rejects.toBe(perError);
  });
});

describe('persistência do formulário DCOMP', () => {
  it('na criação executa duplicate check, insert em array, precheck opcional, delete, build e insert', async () => {
    results.set('dcomp', [
      { data: null, error: null },
      { data: null, error: null },
    ]);
    results.set('distribuicao_dcomp', [
      { data: { id: 'SAMPLE' }, error: new Error('erro amostral ignorado') },
      { data: null, error: null },
      { data: null, error: null },
    ]);
    renderHook(() => useCreateDcompForm());
    const record = await mutations()[0].mutationFn(context as never);

    expect(record).toEqual({
      nr_documento: '1234',
      nr_per_orig: '9',
      mes_ano_exercicio: '2026-07-01',
      dt_envio: '2026-07-17',
      vlr_compensado: 10,
      nr_dcomp_ret: null,
    });
    expect(callsFor('dcomp', 'select')).toEqual([['nr_documento']]);
    expect(callsFor('dcomp', 'insert')).toEqual([[[record]]]);
    expect(mocks.assertCanPerform).toHaveBeenCalledWith('distribuicao_dcomp', 'delete', 'SAMPLE');
    expect(callsFor('distribuicao_dcomp', 'delete')).toEqual([[]]);
    expect(callsFor('distribuicao_dcomp', 'insert')).toEqual([
      [
        [
          {
            nr_documento: '1234',
            tributo: 'IRPJ',
            grupo_tributo_id: 'G1',
            codigo_receita_id: 'C1',
            valor_tributo: 10,
            valor_original: 8,
            competencia: '2026-07-01',
          },
        ],
      ],
    ]);
    expect(sequence).toEqual([
      'dcomp.select',
      'dcomp.eq',
      'dcomp.maybeSingle',
      'dcomp.insert',
      'distribuicao_dcomp.select',
      'distribuicao_dcomp.eq',
      'distribuicao_dcomp.limit',
      'distribuicao_dcomp.maybeSingle',
      'distribuicao_dcomp.delete',
      'distribuicao_dcomp.eq',
      'distribuicao_dcomp.insert',
    ]);
  });

  it('bloqueia duplicata antes do insert e propaga erro do duplicate check', async () => {
    results.set('dcomp', [{ data: { nr_documento: '1234' }, error: null }]);
    renderHook(() => useCreateDcompForm());
    await expect(mutations()[0].mutationFn(context as never)).rejects.toThrow('Já existe um DCOMP');
    expect(callsFor('dcomp', 'insert')).toHaveLength(0);

    calls.length = 0;
    results.set('dcomp', [{ data: null, error: new Error('check falhou') }]);
    await expect(mutations()[0].mutationFn(context as never)).rejects.toThrow('check falhou');
    expect(callsFor('dcomp', 'insert')).toHaveLength(0);
  });

  it('expõe falhas parciais de insert principal, delete, construção pós-delete e insert do rateio', async () => {
    renderHook(() => useCreateDcompForm());
    const mutationFn = mutations()[0].mutationFn;

    results.set('dcomp', [
      { data: null, error: null },
      { data: null, error: new Error('principal') },
    ]);
    await expect(mutationFn(context as never)).rejects.toThrow('principal');
    expect(callsFor('distribuicao_dcomp', 'delete')).toHaveLength(0);

    calls.length = 0;
    results.set('dcomp', [
      { data: null, error: null },
      { data: null, error: null },
    ]);
    results.set('distribuicao_dcomp', [
      { data: null, error: null },
      { data: null, error: new Error('delete') },
    ]);
    await expect(mutationFn(context as never)).rejects.toThrow('delete');
    expect(callsFor('distribuicao_dcomp', 'insert')).toHaveLength(0);

    calls.length = 0;
    results.set('dcomp', [
      { data: null, error: null },
      { data: null, error: null },
    ]);
    results.set('distribuicao_dcomp', [
      { data: null, error: null },
      { data: null, error: null },
    ]);
    const invalidContext = { ...context, distribuicoes: null };
    await expect(mutationFn(invalidContext as never)).rejects.toThrow();
    expect(callsFor('distribuicao_dcomp', 'delete')).toHaveLength(1);

    calls.length = 0;
    results.set('dcomp', [
      { data: null, error: null },
      { data: null, error: null },
    ]);
    results.set('distribuicao_dcomp', [
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: new Error('rateio') },
    ]);
    await expect(mutationFn(context as never)).rejects.toThrow('rateio');
    expect(callsFor('distribuicao_dcomp', 'delete')).toHaveLength(1);
  });

  it('no update atualiza primeiro, não procura duplicata nem faz precheck de DCOMP, depois substitui rateio', async () => {
    results.set('dcomp', [{ data: null, error: null }]);
    results.set('distribuicao_dcomp', [
      { data: { id: 'L1' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]);
    renderHook(() => useUpdateDcompForm());
    const record = await mutations()[0].mutationFn({
      ...context,
      originalNrDocumento: 'ORIGINAL',
    } as never);
    expect(record).toMatchObject({ nr_documento: 'ORIGINAL', nr_per_orig: '9' });
    expect(callsFor('dcomp', 'update')).toHaveLength(1);
    expect(callsFor('dcomp', 'select')).toHaveLength(0);
    expect(mocks.assertCanPerform).toHaveBeenCalledTimes(1);
    expect(mocks.assertCanPerform).toHaveBeenCalledWith('distribuicao_dcomp', 'delete', 'L1');
    expect(sequence.indexOf('dcomp.update')).toBeLessThan(
      sequence.indexOf('distribuicao_dcomp.select'),
    );
    expect(callsFor('distribuicao_dcomp', 'eq')).toEqual([
      ['nr_documento', 'ORIGINAL'],
      ['nr_documento', 'ORIGINAL'],
    ]);
  });

  it('interrompe update em erro e não insere rateio vazio após o delete', async () => {
    results.set('dcomp', [{ data: null, error: new Error('update') }]);
    renderHook(() => useUpdateDcompForm());
    await expect(
      mutations()[0].mutationFn({ ...context, originalNrDocumento: 'D' } as never),
    ).rejects.toThrow('update');
    expect(callsFor('distribuicao_dcomp', 'delete')).toHaveLength(0);

    calls.length = 0;
    results.set('dcomp', [{ data: null, error: null }]);
    results.set('distribuicao_dcomp', [
      { data: null, error: null },
      { data: null, error: null },
    ]);
    await mutations()[0].mutationFn({
      ...context,
      distribuicoes: [],
      originalNrDocumento: 'D',
    } as never);
    expect(callsFor('distribuicao_dcomp', 'delete')).toHaveLength(1);
    expect(callsFor('distribuicao_dcomp', 'insert')).toHaveLength(0);
  });

  it('preserva callbacks no nível dos hooks e encapsula sync sem aguardar', () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    renderHook(() => {
      useCreateDcompForm({ onSuccess, onError });
      useUpdateDcompForm({ onSuccess, onError });
    });
    for (const mutation of mutations()) {
      mutation.onSuccess?.({ ok: true });
      mutation.onError?.(new Error('x'));
    }
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(2);

    mocks.sync.mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useSyncDcompForm());
    const record = { nr_documento: 'D1' };
    expect(result.current(record as never)).toBeUndefined();
    expect(mocks.sync).toHaveBeenCalledWith({ dcomp: [record] });
  });
});
