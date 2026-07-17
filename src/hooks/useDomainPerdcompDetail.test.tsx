import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  sync: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/syncPerdcomp', () => ({ syncPerdcompToDW: mocks.sync }));

import {
  useClearPerReimbursement,
  useInsertPerSituationDetail,
  usePerDcompsDetail,
  usePerDetail,
  usePerDistribuicoesDetail,
  usePerSituacoesDetail,
  useRegisterPerReimbursement,
  useSyncPerdcompDetail,
} from '@/hooks/useDomainPerdcompDetail';
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
  enabled: boolean;
  queryFn: () => Promise<unknown>;
}
interface MutationRegistration {
  mutationFn: (variables: never) => Promise<unknown>;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

const calls: Call[] = [];
const results = new Map<string, Result[]>();
const sequence: string[] = [];

function chain(table: string) {
  const query: Record<string, unknown> = {};
  for (const method of [
    'select',
    'eq',
    'in',
    'order',
    'maybeSingle',
    'update',
    'insert',
    'single',
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

const registrations = () =>
  mocks.useQuery.mock.calls.map(([options]) => options as QueryRegistration);
const mutations = () =>
  mocks.useMutation.mock.calls.map(([options]) => options as MutationRegistration);
const callsFor = (table: string, method: string) =>
  calls.filter((call) => call.table === table && call.method === method).map((call) => call.args);

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  calls.length = 0;
  sequence.length = 0;
  results.clear();
  vi.mocked(supabase.from).mockImplementation((table: string) => chain(table) as never);
});

describe('consultas do detalhe do PER', () => {
  it('registra query keys e enabled exatos, incluindo a ordem dos documentos na key', () => {
    renderHook(() => {
      usePerDetail('P1', true);
      usePerDetail(undefined, true);
      usePerDcompsDetail('P1', false);
      usePerSituacoesDetail('P1', true);
      usePerDistribuicoesDetail('P1', ['D2', 'D1'], true);
      usePerDistribuicoesDetail('P1', [], true);
    });

    expect(registrations().map(({ queryKey, enabled }) => ({ queryKey, enabled }))).toEqual([
      { queryKey: ['per-detail', 'P1'], enabled: true },
      { queryKey: ['per-detail', undefined], enabled: false },
      { queryKey: ['per-dcomps', 'P1'], enabled: false },
      { queryKey: ['per-situacoes', 'P1'], enabled: true },
      { queryKey: ['per-distribuicoes', 'P1', 'D2,D1'], enabled: true },
      { queryKey: ['per-distribuicoes', 'P1', ''], enabled: false },
    ]);
  });

  it('aplica selects, filtros e ordenações exatos', async () => {
    renderHook(() => {
      usePerDetail('P1', true);
      usePerDcompsDetail('P1', true);
      usePerSituacoesDetail('P1', true);
      usePerDistribuicoesDetail('P1', ['D1', 'D2'], true);
    });
    await Promise.all(registrations().map(({ queryFn }) => queryFn()));

    expect(callsFor('per', 'select')).toEqual([['*, contribuinte(nome_razao_social)']]);
    expect(callsFor('per', 'eq')).toEqual([['nr_per', 'P1']]);
    expect(callsFor('per', 'maybeSingle')).toEqual([[]]);
    expect(callsFor('dcomp', 'select')).toEqual([['*']]);
    expect(callsFor('dcomp', 'eq')).toEqual([['nr_per_orig', 'P1']]);
    expect(callsFor('dcomp', 'order')).toEqual([['dt_envio', { ascending: false }]]);
    expect(callsFor('per_situacao', 'select')).toEqual([['*']]);
    expect(callsFor('per_situacao', 'eq')).toEqual([['nr_proc_per', 'P1']]);
    expect(callsFor('per_situacao', 'order')).toEqual([['criado_em', { ascending: false }]]);
    expect(callsFor('distribuicao_dcomp', 'select')).toEqual([
      ['nr_documento, tributo, valor_tributo, valor_original, competencia'],
    ]);
    expect(callsFor('distribuicao_dcomp', 'in')).toEqual([['nr_documento', ['D1', 'D2']]]);
  });

  it('retorna os defaults sem consultar quando os identificadores estão vazios', async () => {
    renderHook(() => {
      usePerDetail(undefined, true);
      usePerDcompsDetail(undefined, true);
      usePerSituacoesDetail(undefined, true);
      usePerDistribuicoesDetail(undefined, [], true);
    });
    await expect(Promise.all(registrations().map(({ queryFn }) => queryFn()))).resolves.toEqual([
      null,
      [],
      [],
      [],
    ]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it.each(['per', 'dcomp', 'per_situacao', 'distribuicao_dcomp'])(
    'propaga o erro de %s',
    async (table) => {
      const error = new Error(`falha ${table}`);
      results.set(table, [{ data: null, error }]);
      renderHook(() => {
        usePerDetail('P1', true);
        usePerDcompsDetail('P1', true);
        usePerSituacoesDetail('P1', true);
        usePerDistribuicoesDetail('P1', ['D1'], true);
      });
      const index = ['per', 'dcomp', 'per_situacao', 'distribuicao_dcomp'].indexOf(table);
      await expect(registrations()[index].queryFn()).rejects.toBe(error);
    },
  );
});

describe('mutações de ressarcimento', () => {
  it('atualiza valores arredondados antes de inserir a situação com payload exato', async () => {
    const sitData = { id: 'S1' };
    results.set('per_situacao', [{ data: sitData, error: null }]);
    renderHook(() => useRegisterPerReimbursement());

    await expect(
      mutations()[0].mutationFn({
        nrPer: 'P1',
        valor: 123.45,
        valorOriginal: 10.126,
        dataPagamento: '2026-07-01',
      } as never),
    ).resolves.toEqual({ valor: 123.45, sitData });

    expect(callsFor('per', 'update')).toEqual([
      [{ vlr_ressarcido: 123.45, vlr_ressarcido_original: 10.13 }],
    ]);
    expect(callsFor('per', 'eq')).toEqual([['nr_per', 'P1']]);
    expect(callsFor('per_situacao', 'insert')).toEqual([
      [
        {
          nr_proc_per: 'P1',
          situacao: 'PER deferido',
          dt_pagamento: '2026-07-01',
        },
      ],
    ]);
    expect(callsFor('per_situacao', 'select')).toEqual([[]]);
    expect(callsFor('per_situacao', 'single')).toEqual([[]]);
    expect(sequence.indexOf('per.eq')).toBeLessThan(sequence.indexOf('per_situacao.insert'));
  });

  it('não insere situação quando o update falha e expõe a falha parcial da segunda etapa', async () => {
    const updateError = new Error('update falhou');
    results.set('per', [
      { data: null, error: updateError },
      { data: null, error: null },
    ]);
    renderHook(() => useRegisterPerReimbursement());
    await expect(
      mutations()[0].mutationFn({
        nrPer: 'P1',
        valor: 1,
        valorOriginal: 1,
        dataPagamento: '2026-01-01',
      } as never),
    ).rejects.toBe(updateError);
    expect(callsFor('per_situacao', 'insert')).toHaveLength(0);

    results.set('per_situacao', [{ data: null, error: new Error('situação falhou') }]);
    await expect(
      mutations()[0].mutationFn({
        nrPer: 'P1',
        valor: 2,
        valorOriginal: 2,
        dataPagamento: '2026-01-02',
      } as never),
    ).rejects.toThrow('situação falhou');
    expect(callsFor('per', 'update')).toHaveLength(2);
  });

  it('insere situação de forma autônoma, propaga erro e preserva callbacks', async () => {
    const sitData = { id: 'S2', situacao: 'Homologado' };
    results.set('per_situacao', [
      { data: sitData, error: null },
      { data: null, error: new Error('insert falhou') },
    ]);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    renderHook(() => useInsertPerSituationDetail({ onSuccess, onError }));
    const mutation = mutations()[0];
    const payload = { nr_proc_per: 'P1', situacao: 'Homologado' };

    await expect(mutation.mutationFn(payload as never)).resolves.toEqual(sitData);
    await expect(mutation.mutationFn(payload as never)).rejects.toThrow('insert falhou');
    expect(callsFor('per_situacao', 'insert')).toEqual([[payload], [payload]]);
    mutation.onSuccess?.(sitData);
    mutation.onError?.(new Error('callback'));
    expect(onSuccess).toHaveBeenCalledWith(sitData);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'callback' }));
  });

  it('encapsula a sincronização de detalhe sem aguardar seu retorno', () => {
    mocks.sync.mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useSyncPerdcompDetail());
    const payload = { per_situacao: [{ id: 'S1' }] };
    expect(result.current(payload as never)).toBeUndefined();
    expect(mocks.sync).toHaveBeenCalledWith(payload);
  });

  it('preserva callbacks fornecidos no nível do hook', () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    renderHook(() => useRegisterPerReimbursement({ onSuccess, onError }));
    mutations()[0].onSuccess?.({ ok: true });
    mutations()[0].onError?.(new Error('x'));
    expect(onSuccess).toHaveBeenCalledWith({ ok: true });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'x' }));
  });

  it('protege PER vazio e limpa com payload, usuário e timestamp exatos', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:34:56.000Z'));
    renderHook(() => useClearPerReimbursement());
    await expect(
      mutations()[0].mutationFn({ nrPer: undefined, userId: 'U1' } as never),
    ).rejects.toThrow('PER inválido');
    expect(supabase.from).not.toHaveBeenCalled();

    await mutations()[0].mutationFn({ nrPer: 'P1', userId: 'U1' } as never);
    expect(callsFor('per', 'update')).toEqual([
      [
        {
          vlr_ressarcido: null,
          vlr_ressarcido_original: null,
          atualizado_em: '2026-07-17T12:34:56.000Z',
          atualizado_por: 'U1',
        },
      ],
    ]);
    expect(callsFor('per', 'eq')).toEqual([['nr_per', 'P1']]);
  });

  it('propaga erro de limpeza e preserva seus callbacks', async () => {
    const error = new Error('limpeza falhou');
    results.set('per', [{ data: null, error }]);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    renderHook(() => useClearPerReimbursement({ onSuccess, onError }));
    await expect(mutations()[0].mutationFn({ nrPer: 'P1', userId: null } as never)).rejects.toBe(
      error,
    );
    mutations()[0].onSuccess?.(undefined);
    mutations()[0].onError?.(error);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(error);
  });
});
