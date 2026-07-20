import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

const toastMocks = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/hooks/use-toast', () => toastMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import {
  novidadesQueryKey,
  novidadesPublicasQueryKey,
  useDomainNovidades,
  usePublicNovidades,
} from '@/hooks/useDomainNovidades';
import type { NovidadeFormData } from '@/hooks/useDomainNovidades';
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
      onRejected
    );
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((c) => c.table === table && c.method === method);
}
function queryRegistrations() {
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as Record<string, unknown>);
}
function mutationRegistrations() {
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) => o as { mutationFn: (input: unknown) => Promise<unknown> }
  );
}

const onFormSaved = vi.fn();
function renderNovidades() {
  return renderHook(() => useDomainNovidades({ onFormSaved }));
}

const formData: NovidadeFormData = {
  categoria: 'tributario',
  titulo: 'Novo título',
  descricao: 'Descrição',
  itens: ['a', 'b'],
  imagem_url: 'http://img',
  botao_texto: 'Ver',
  botao_url: 'http://link',
  ativo: true,
  conteudo_completo: 'conteúdo',
  imagem_lateral_url: 'http://lateral',
  imagem_lateral_posicao: 'direita',
  texto_original: 'original',
};

const expectedPayload = {
  categoria: 'tributario',
  titulo: 'Novo título',
  descricao: 'Descrição',
  itens: ['a', 'b'],
  imagem_url: 'http://img',
  botao_texto: 'Ver',
  botao_url: 'http://link',
  ativo: true,
  conteudo_completo: 'conteúdo',
  imagem_lateral_url: 'http://lateral',
  imagem_lateral_posicao: 'direita',
  texto_original: 'original',
};

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('usePublicNovidades — query pública', () => {
  it('registra a query key pública canônica', () => {
    renderHook(() => usePublicNovidades());
    expect(queryRegistrations()[0].queryKey).toEqual(novidadesPublicasQueryKey);
  });

  it('filtra por ativo=true (soft-delete) e ordena por data_publicacao desc', async () => {
    renderHook(() => usePublicNovidades());
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(callsFor('novidades', 'select')[0].args).toEqual(['*']);
    expect(callsFor('novidades', 'eq')[0].args).toEqual(['ativo', true]);
    expect(callsFor('novidades', 'order')[0].args).toEqual([
      'data_publicacao',
      { ascending: false },
    ]);
  });

  it('propaga erro da consulta pública', async () => {
    setDbResult('novidades', 'select', { data: null, error: new Error('boom') });
    renderHook(() => usePublicNovidades());
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)()
    ).rejects.toThrow('boom');
  });
});

describe('useDomainNovidades — query de gestão', () => {
  it('registra a query key de gestão canônica', () => {
    renderNovidades();
    expect(queryRegistrations()[0].queryKey).toEqual(novidadesQueryKey);
  });

  it('lista todas as novidades ordenadas por data_publicacao desc (sem filtro de ativo)', async () => {
    renderNovidades();
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(callsFor('novidades', 'select')[0].args).toEqual(['*']);
    expect(callsFor('novidades', 'eq')).toHaveLength(0);
    expect(callsFor('novidades', 'order')[0].args).toEqual([
      'data_publicacao',
      { ascending: false },
    ]);
  });
});

describe('useDomainNovidades — mutations de escrita', () => {
  it('create insere o payload normalizado sem precheck', async () => {
    renderNovidades();
    await mutationRegistrations()[0].mutationFn(formData);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
    expect(callsFor('novidades', 'insert')[0].args).toEqual([expectedPayload]);
  });

  it('create normaliza campos vazios para null e posição padrão para direita', async () => {
    renderNovidades();
    await mutationRegistrations()[0].mutationFn({
      ...formData,
      imagem_url: '',
      botao_texto: '',
      botao_url: '',
      conteudo_completo: '',
      imagem_lateral_url: '',
      imagem_lateral_posicao: '' as NovidadeFormData['imagem_lateral_posicao'],
      texto_original: '',
    });
    const insertArg = callsFor('novidades', 'insert')[0].args[0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({
      imagem_url: null,
      botao_texto: null,
      botao_url: null,
      conteudo_completo: null,
      imagem_lateral_url: null,
      imagem_lateral_posicao: 'direita',
      texto_original: null,
    });
  });

  it('update faz precheck, envia payload e filtra pelo id', async () => {
    renderNovidades();
    await mutationRegistrations()[1].mutationFn({ id: 'nov-1', data: formData });
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('novidades', 'update', 'nov-1');
    expect(callsFor('novidades', 'update')[0].args).toEqual([expectedPayload]);
    expect(callsFor('novidades', 'eq')[0].args).toEqual(['id', 'nov-1']);
  });

  it('delete faz precheck e filtra a exclusão pelo id', async () => {
    renderNovidades();
    await mutationRegistrations()[2].mutationFn('nov-1');
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('novidades', 'delete', 'nov-1');
    expect(callsFor('novidades', 'delete')).toHaveLength(1);
    expect(callsFor('novidades', 'eq')[0].args).toEqual(['id', 'nov-1']);
  });

  it('toggleAtivo faz precheck, atualiza só ativo e filtra pelo id', async () => {
    renderNovidades();
    await mutationRegistrations()[3].mutationFn({ id: 'nov-1', ativo: false });
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('novidades', 'update', 'nov-1');
    expect(callsFor('novidades', 'update')[0].args).toEqual([{ ativo: false }]);
    expect(callsFor('novidades', 'eq')[0].args).toEqual(['id', 'nov-1']);
  });

  it('restructure invoca a edge function restructure-novidade e retorna os dados', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { texto_reestruturado: 'ok' },
      error: null,
    } as never);
    renderNovidades();
    const result = await mutationRegistrations()[4].mutationFn('texto bruto');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('restructure-novidade', {
      body: { texto: 'texto bruto' },
    });
    expect(result).toEqual({ texto_reestruturado: 'ok' });
  });

  it('propaga falha do precheck no update e não inicia a escrita', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderNovidades();
    await expect(
      mutationRegistrations()[1].mutationFn({ id: 'nov-1', data: formData })
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propaga erro do insert no create', async () => {
    setDbResult('novidades', 'insert', { data: null, error: new Error('insert-falhou') });
    renderNovidades();
    await expect(mutationRegistrations()[0].mutationFn(formData)).rejects.toThrow('insert-falhou');
  });
});
