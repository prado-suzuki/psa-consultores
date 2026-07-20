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
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('sonner', () => toastMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

import { useDomainEquipeBiblioteca } from '@/hooks/useDomainEquipeBiblioteca';
import type { ProjectDocument } from '@/hooks/useDomainEquipeBiblioteca';
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

const storageCalls: { bucket: string; method: string; args: unknown[] }[] = [];
const storageResults = new Map<string, DbResult>();

function setDbResult(table: string, operation: string, result: DbResult) {
  dbResults.set(`${table}:${operation}`, result);
}

function setStorageResult(method: string, result: DbResult) {
  storageResults.set(method, result);
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

function makeStorageBucket(bucket: string) {
  const bucketApi: Record<string, unknown> = {};
  for (const method of ['upload', 'remove', 'download']) {
    bucketApi[method] = vi.fn((...args: unknown[]) => {
      storageCalls.push({ bucket, method, args });
      return Promise.resolve(storageResults.get(method) ?? { data: {}, error: null });
    });
  }
  return bucketApi;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((c) => c.table === table && c.method === method);
}
function storageCallsFor(method: string) {
  return storageCalls.filter((c) => c.method === method);
}
function queryRegistrations() {
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as Record<string, unknown>);
}
function mutationRegistrations() {
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) => o as { mutationFn: (input: unknown) => Promise<unknown> }
  );
}

const callbacks = {
  onUploadStart: vi.fn(),
  onUploadSuccess: vi.fn(),
  onUploadSettled: vi.fn(),
};

function renderBiblioteca() {
  return renderHook(() => useDomainEquipeBiblioteca(callbacks));
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  storageCalls.length = 0;
  storageResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
  vi.mocked(supabase.storage.from).mockImplementation((b: string) => makeStorageBucket(b) as never);
});

describe('useDomainEquipeBiblioteca — queries', () => {
  it('registra as query keys canônicas na ordem esperada', () => {
    renderBiblioteca();
    expect(queryRegistrations().map((r) => r.queryKey)).toEqual([
      ['project-documents'],
      ['processes-list'],
      ['sprints-list'],
    ]);
  });

  it('documentos: seleciona embeds e ordena por created_at desc', async () => {
    renderBiblioteca();
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    const selectArg = callsFor('project_documents', 'select')[0].args[0] as string;
    expect(selectArg).toContain('sprints:sprint_id(name)');
    expect(selectArg).toContain('profiles:uploaded_by(first_name, last_name)');
    expect(selectArg).toContain('processes:process_id(name, code)');
    expect(callsFor('project_documents', 'order')[0].args).toEqual([
      'created_at',
      { ascending: false },
    ]);
  });

  it('processos: seleciona id, name, code ordenado por name', async () => {
    renderBiblioteca();
    await (queryRegistrations()[1].queryFn as () => Promise<unknown>)();
    expect(callsFor('processes', 'select')[0].args).toEqual(['id, name, code']);
    expect(callsFor('processes', 'order')[0].args).toEqual(['name']);
  });

  it('sprints: seleciona id, name ordenado por start_date desc', async () => {
    renderBiblioteca();
    await (queryRegistrations()[2].queryFn as () => Promise<unknown>)();
    expect(callsFor('sprints', 'select')[0].args).toEqual(['id, name']);
    expect(callsFor('sprints', 'order')[0].args).toEqual(['start_date', { ascending: false }]);
  });

  it('propaga erro da consulta de documentos', async () => {
    setDbResult('project_documents', 'select', { data: null, error: new Error('boom') });
    renderBiblioteca();
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)()
    ).rejects.toThrow('boom');
  });
});

describe('useDomainEquipeBiblioteca — upload', () => {
  const uploadInput = () => ({
    file: new File(['conteudo'], 'relatorio.pdf', { type: 'application/pdf' }),
    userId: 'user-1',
    title: 'Relatório',
    description: 'Descrição',
    category: 'geral',
    sprintId: 'sprint-1',
  });

  it('sobe o arquivo no bucket project-documents e insere metadado', async () => {
    renderBiblioteca();
    const input = uploadInput();
    await mutationRegistrations()[0].mutationFn(input);

    expect(callbacks.onUploadStart).toHaveBeenCalled();
    expect(supabase.storage.from).toHaveBeenCalledWith('project-documents');
    const uploadCall = storageCallsFor('upload')[0];
    expect(uploadCall.args[1]).toBe(input.file);
    expect(uploadCall.args[0]).toMatch(/^user-1\/\d+-relatorio\.pdf$/);

    const insertArg = callsFor('project_documents', 'insert')[0].args[0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({
      title: 'Relatório',
      description: 'Descrição',
      file_name: 'relatorio.pdf',
      file_type: 'application/pdf',
      category: 'geral',
      sprint_id: 'sprint-1',
      uploaded_by: 'user-1',
    });
    expect(insertArg.file_path).toBe(uploadCall.args[0]);
  });

  it('normaliza descrição e sprint vazios para null', async () => {
    renderBiblioteca();
    await mutationRegistrations()[0].mutationFn({
      ...uploadInput(),
      description: '',
      sprintId: '',
    });
    const insertArg = callsFor('project_documents', 'insert')[0].args[0] as Record<string, unknown>;
    expect(insertArg.description).toBeNull();
    expect(insertArg.sprint_id).toBeNull();
  });

  it('rejeita quando falta arquivo ou usuário, sem tocar o storage', async () => {
    renderBiblioteca();
    await expect(
      mutationRegistrations()[0].mutationFn({ ...uploadInput(), file: null })
    ).rejects.toThrow('Arquivo e usuário necessários');
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it('propaga erro do insert de metadado', async () => {
    setDbResult('project_documents', 'insert', { data: null, error: new Error('insert-falhou') });
    renderBiblioteca();
    await expect(mutationRegistrations()[0].mutationFn(uploadInput())).rejects.toThrow(
      'insert-falhou'
    );
  });
});

describe('useDomainEquipeBiblioteca — delete', () => {
  const doc = {
    id: 'doc-1',
    file_path: 'user-1/123-relatorio.pdf',
  } as ProjectDocument;

  it('faz precheck, remove do storage e exclui filtrando pelo id', async () => {
    renderBiblioteca();
    await mutationRegistrations()[1].mutationFn(doc);

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('project_documents', 'delete', 'doc-1');
    expect(storageCallsFor('remove')[0].args).toEqual([['user-1/123-relatorio.pdf']]);
    expect(callsFor('project_documents', 'delete')).toHaveLength(1);
    expect(callsFor('project_documents', 'eq')[0].args).toEqual(['id', 'doc-1']);
  });

  it('propaga falha do precheck e não inicia a exclusão', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderBiblioteca();
    await expect(mutationRegistrations()[1].mutationFn(doc)).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propaga erro do delete no banco', async () => {
    setDbResult('project_documents', 'delete', { data: null, error: new Error('delete-falhou') });
    renderBiblioteca();
    await expect(mutationRegistrations()[1].mutationFn(doc)).rejects.toThrow('delete-falhou');
  });
});

describe('useDomainEquipeBiblioteca — download/preview', () => {
  const doc = { id: 'doc-1', file_path: 'user-1/123-relatorio.pdf' } as ProjectDocument;

  it('download baixa o arquivo pelo file_path', async () => {
    renderBiblioteca();
    await mutationRegistrations()[2].mutationFn(doc);
    expect(supabase.storage.from).toHaveBeenCalledWith('project-documents');
    expect(storageCallsFor('download')[0].args).toEqual(['user-1/123-relatorio.pdf']);
  });

  it('preview baixa o arquivo pelo file_path', async () => {
    renderBiblioteca();
    await mutationRegistrations()[3].mutationFn(doc);
    expect(storageCallsFor('download')[0].args).toEqual(['user-1/123-relatorio.pdf']);
  });

  it('download propaga erro do storage', async () => {
    setStorageResult('download', { data: null, error: new Error('download-falhou') });
    renderBiblioteca();
    await expect(mutationRegistrations()[2].mutationFn(doc)).rejects.toThrow('download-falhou');
  });
});
