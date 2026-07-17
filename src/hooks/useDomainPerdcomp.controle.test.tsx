import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
}));

vi.mock('@tanstack/react-query', () => queryMocks);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { currentAmbiente } from '@/config/api';
import {
  useBuscarProcessoGlobalPerdcomp,
  useClientesControlePerdcomp,
  useContribuintesControlePerdcomp,
  useDcompsControlePerdcomp,
  useDistribuicoesControlePerdcomp,
  usePersControlePerdcomp,
  useSituacoesControlePerdcomp,
  useSituacoesDistintasControlePerdcomp,
} from '@/hooks/useDomainPerdcomp';
import { supabase } from '@/integrations/supabase/client';

interface Registration {
  queryKey: readonly unknown[];
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
}
interface MutationRegistration {
  mutationKey: readonly unknown[];
  mutationFn: (value: string) => Promise<unknown>;
}
interface Call {
  table: string;
  method: string;
  args: unknown[];
}
interface Result {
  data: unknown;
  error: unknown;
}

const calls: Call[] = [];
const results = new Map<string, Result[]>();

function queue(table: string, ...queued: Result[]) {
  results.set(table, queued);
}

function chain(table: string) {
  const value: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'not', 'like', 'limit', 'order', 'maybeSingle']) {
    value[method] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method, args });
      return value;
    });
  }
  value.then = (resolve: (result: Result) => unknown) =>
    Promise.resolve(results.get(table)?.shift() ?? { data: [], error: null }).then(resolve);
  return value;
}

function registrations(): Registration[] {
  return queryMocks.useQuery.mock.calls.map(([options]) => options as Registration);
}

function callsFor(table: string, method: string) {
  return calls.filter((call) => call.table === table && call.method === method);
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  results.clear();
  vi.mocked(supabase.from).mockImplementation((table: string) => chain(table) as never);
});

describe('queries do controle PER/DCOMP', () => {
  it('registra keys e enabled exatos', () => {
    renderHook(() => {
      useClientesControlePerdcomp();
      useContribuintesControlePerdcomp('cliente-1');
      useContribuintesControlePerdcomp('');
      usePersControlePerdcomp('contrib-1', true);
      usePersControlePerdcomp('contrib-1', false);
      useSituacoesControlePerdcomp('contrib-1', true);
      useDcompsControlePerdcomp('', true);
      useDistribuicoesControlePerdcomp('contrib-1', ['D1', 'D2'], true);
      useDistribuicoesControlePerdcomp('contrib-1', [], true);
      useSituacoesDistintasControlePerdcomp();
    });

    expect(registrations().map(({ queryKey, enabled }) => ({ queryKey, enabled }))).toEqual([
      { queryKey: ['clientes-ativos'], enabled: undefined },
      { queryKey: ['contribuintes', 'cliente-1'], enabled: true },
      { queryKey: ['contribuintes', ''], enabled: false },
      { queryKey: ['perdcomp-per', 'contrib-1', true], enabled: true },
      { queryKey: ['perdcomp-per', 'contrib-1', false], enabled: false },
      { queryKey: ['per-situacoes', 'contrib-1', true], enabled: true },
      { queryKey: ['perdcomp-dcomp', '', true], enabled: false },
      { queryKey: ['perdcomp-distribuicoes', 'contrib-1', 'D1,D2'], enabled: true },
      { queryKey: ['perdcomp-distribuicoes', 'contrib-1', ''], enabled: false },
      { queryKey: ['per-situacoes-distintas'], enabled: undefined },
    ]);
  });

  it('aplica selects, filtros de cliente e contribuinte, ambiente, flags e ordenação', async () => {
    renderHook(() => {
      useClientesControlePerdcomp();
      useContribuintesControlePerdcomp('cliente-1');
      usePersControlePerdcomp('contrib-1', true);
    });
    const [clientes, contribuintes, pers] = registrations();
    await clientes.queryFn();
    await contribuintes.queryFn();
    await pers.queryFn();

    expect(callsFor('cliente', 'select')[0].args).toEqual(['id, nome']);
    expect(callsFor('cliente', 'eq').map(({ args }) => args)).toEqual([
      ['ativo', true],
      ['excluido', false],
      ['ambiente', currentAmbiente],
    ]);
    expect(callsFor('cliente', 'order')[0].args).toEqual(['nome']);
    expect(callsFor('contribuinte', 'select')[0].args).toEqual(['id, nome_razao_social']);
    expect(callsFor('contribuinte', 'eq').map(({ args }) => args)).toEqual([
      ['cliente_id', 'cliente-1'],
      ['excluido', false],
      ['ambiente', currentAmbiente],
    ]);
    expect(callsFor('contribuinte', 'order')[0].args).toEqual(['nome_razao_social']);
    expect(callsFor('per_with_contribuinte', 'select')[0].args).toEqual(['*']);
    expect(callsFor('per_with_contribuinte', 'eq')[0].args).toEqual([
      'id_contribuinte',
      'contrib-1',
    ]);
    expect(callsFor('per_with_contribuinte', 'order')[0].args).toEqual([
      'exercicio',
      { ascending: false },
    ]);
  });

  it('consulta situações, DCOMPs e distribuições com os selects, filtros e ordens exatos', async () => {
    queue(
      'per',
      { data: [{ nr_per: 'P1' }, { nr_per: 'P2' }], error: null },
      { data: [{ nr_per: 'P1' }], error: null },
    );
    queue('per_situacao', {
      data: [
        { nr_proc_per: 'P1', situacao: 'Pago', criado_em: '2026-02-01', dt_pagamento: null },
        { nr_proc_per: 'P1', situacao: 'Em Análise', criado_em: '2026-01-01', dt_pagamento: null },
      ],
      error: null,
    });
    renderHook(() => {
      useSituacoesControlePerdcomp('contrib-1', true);
      useDcompsControlePerdcomp('contrib-1', true);
      useDistribuicoesControlePerdcomp('contrib-1', ['D1'], true);
    });
    const [situacoes, dcomps, distribuicoes] = registrations();

    await expect(situacoes.queryFn()).resolves.toEqual({
      P1: { situacao: 'Pago', criado_em: '2026-02-01', dt_pagamento: null },
    });
    await dcomps.queryFn();
    await distribuicoes.queryFn();

    expect(callsFor('per', 'select').map(({ args }) => args)).toEqual([['nr_per'], ['nr_per']]);
    expect(callsFor('per', 'eq').map(({ args }) => args)).toEqual([
      ['id_contribuinte', 'contrib-1'],
      ['id_contribuinte', 'contrib-1'],
    ]);
    expect(callsFor('per_situacao', 'select')[0].args).toEqual([
      'nr_proc_per, situacao, criado_em, dt_pagamento',
    ]);
    expect(callsFor('per_situacao', 'in')[0].args).toEqual(['nr_proc_per', ['P1', 'P2']]);
    expect(callsFor('per_situacao', 'order')[0].args).toEqual(['criado_em', { ascending: false }]);
    expect(callsFor('dcomp', 'select')[0].args).toEqual(['*']);
    expect(callsFor('dcomp', 'in')[0].args).toEqual(['nr_per_orig', ['P1']]);
    expect(callsFor('dcomp', 'order')[0].args).toEqual(['dt_envio', { ascending: false }]);
    expect(callsFor('distribuicao_dcomp', 'select')[0].args).toEqual([
      'nr_documento, valor_tributo, valor_original',
    ]);
    expect(callsFor('distribuicao_dcomp', 'in')[0].args).toEqual(['nr_documento', ['D1']]);
  });

  it('deduplica situações distintas e suprime o erro dessa consulta', async () => {
    queue('per_situacao', {
      data: [{ situacao: 'Pago' }, { situacao: 'Pago' }, { situacao: 'Deferido' }],
      error: new Error('ignorado'),
    });
    renderHook(() => useSituacoesDistintasControlePerdcomp());

    await expect(registrations()[0].queryFn()).resolves.toEqual(['Pago', 'Deferido']);
    expect(callsFor('per_situacao', 'select')[0].args).toEqual(['situacao']);
    expect(callsFor('per_situacao', 'not')[0].args).toEqual(['situacao', 'is', null]);
  });
});

describe('busca global de processo', () => {
  it('normaliza pontuação, prioriza PER e ignora errors quando há dados utilizáveis', async () => {
    queue('per', { data: [{ id_contribuinte: 'contrib-1' }], error: new Error('ignorado') });
    queue('contribuinte', { data: { cliente_id: 'cliente-1' }, error: new Error('ignorado') });
    renderHook(() => useBuscarProcessoGlobalPerdcomp());
    const mutation = queryMocks.useMutation.mock.calls[0][0] as MutationRegistration;

    await expect(mutation.mutationFn('12.345/67-8')).resolves.toEqual({
      status: 'found',
      contribuinteId: 'contrib-1',
      clienteId: 'cliente-1',
    });
    expect(mutation.mutationKey).toEqual(['perdcomp', 'processo', 'buscar-global']);
    expect(callsFor('per', 'like')[0].args).toEqual(['nr_per', '%12345678%']);
    expect(callsFor('per', 'limit')[0].args).toEqual([1]);
    expect(callsFor('dcomp', 'select')).toHaveLength(0);
    expect(callsFor('contribuinte', 'eq')[0].args).toEqual(['id', 'contrib-1']);
  });

  it('cai para DCOMP somente após PER vazio e resolve seu PER de origem', async () => {
    queue(
      'per',
      { data: [], error: new Error('ignorado') },
      { data: { id_contribuinte: 'contrib-2' }, error: new Error('ignorado') },
    );
    queue('dcomp', { data: [{ nr_per_orig: 'PER-2' }], error: new Error('ignorado') });
    queue('contribuinte', { data: { cliente_id: 'cliente-2' }, error: null });
    renderHook(() => useBuscarProcessoGlobalPerdcomp());
    const mutation = queryMocks.useMutation.mock.calls[0][0] as MutationRegistration;

    await expect(mutation.mutationFn('DC-99')).resolves.toEqual({
      status: 'found',
      contribuinteId: 'contrib-2',
      clienteId: 'cliente-2',
    });
    expect(
      calls
        .map(({ table }) => table)
        .filter((table, index, all) => index === 0 || table !== all[index - 1]),
    ).toEqual(['per', 'dcomp', 'per', 'contribuinte']);
    expect(callsFor('dcomp', 'like')[0].args).toEqual(['nr_documento', '%99%']);
    expect(callsFor('per', 'eq')[0].args).toEqual(['nr_per', 'PER-2']);
  });
});
