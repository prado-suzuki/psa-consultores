import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
}));
const rlsMocks = vi.hoisted(() => ({ assertCanPerform: vi.fn<() => Promise<void>>() }));
const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => queryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMocks.from,
    auth: { getUser: supabaseMocks.getUser },
    storage: { from: supabaseMocks.storageFrom },
  },
}));

import { useEquipeKanbanAttachments } from '@/hooks/useDomainEquipeKanbanAttachments';
import { useEquipeKanbanDeliverableMutations } from '@/hooks/useDomainEquipeKanbanDeliverableMutations';
import { useEquipeKanbanInitialQuery } from '@/hooks/useDomainEquipeKanbanQueries';

interface Registration {
  mutationKey: unknown[];
  mutationFn: (input: never) => Promise<unknown>;
  retry: boolean;
  networkMode: string;
  onError?: () => void;
}
interface DbResult {
  data: unknown;
  error: unknown;
}
interface Call {
  scope: string;
  method: string;
  args: unknown[];
}
const calls: Call[] = [];
const results = new Map<string, DbResult>();

function chainFor(table: string) {
  let operation = 'select';
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'update', 'insert', 'delete', 'eq', 'order']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ scope: table, method, args });
      if (['select', 'update', 'insert', 'delete'].includes(method)) operation = method;
      return chain;
    });
  }
  chain.then = (resolve: (result: DbResult) => unknown) =>
    Promise.resolve(results.get(`${table}:${operation}`) ?? { data: [], error: null }).then(
      resolve,
    );
  return chain;
}

function mutation(action: string) {
  const registration = queryMocks.useMutation.mock.calls
    .map(([options]) => options as Registration)
    .find(({ mutationKey }) => mutationKey[1] === action);
  if (!registration) throw new Error(`mutation ausente: ${action}`);
  return registration;
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  results.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  supabaseMocks.from.mockImplementation((table: string) => chainFor(table));
  supabaseMocks.storageFrom.mockImplementation((bucket: string) => {
    calls.push({ scope: 'storage', method: 'from', args: [bucket] });
    return {
      upload: (...args: unknown[]) => {
        calls.push({ scope: 'storage', method: 'upload', args });
        return supabaseMocks.upload(...args);
      },
      download: (...args: unknown[]) => supabaseMocks.download(...args),
      remove: (...args: unknown[]) => {
        calls.push({ scope: 'storage', method: 'remove', args });
        return supabaseMocks.remove(...args);
      },
    };
  });
  supabaseMocks.upload.mockResolvedValue({ error: null });
  supabaseMocks.remove.mockResolvedValue({ error: null });
  supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

describe('useEquipeKanbanInitialQuery', () => {
  it('registra opções exatas, executa os cinco selects e suprime erros das respostas', async () => {
    for (const table of [
      'sprints',
      'profiles_safe',
      'projects',
      'processes',
      'sprint_deliverables',
    ]) {
      results.set(`${table}:select`, { data: null, error: new Error(`ignored ${table}`) });
    }
    renderHook(() => useEquipeKanbanInitialQuery());
    const options = queryMocks.useQuery.mock.calls[0][0] as Record<string, unknown> & {
      queryFn: () => Promise<unknown>;
    };
    expect(options).toMatchObject({
      queryKey: ['domain-equipe-kanban', 'initial'],
      staleTime: 0,
      gcTime: 0,
      retry: false,
      networkMode: 'always',
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
    await expect(options.queryFn()).resolves.toEqual({
      sprints: [],
      profiles: [],
      projects: [],
      processes: [],
      deliverables: [],
    });
    expect(
      calls.filter(({ method }) => method === 'select').map(({ scope, args }) => [scope, ...args]),
    ).toEqual([
      ['sprints', 'id, name, project_id'],
      ['profiles_safe', 'id, first_name, last_name'],
      ['projects', 'id, name'],
      ['processes', 'id, name, project_id'],
      [
        'sprint_deliverables',
        'id, title, description, status, assigned_to, sprint_id, estimated_hours, due_date, start_date, parent_id, task_code',
      ],
    ]);
    expect(
      calls.filter(({ method }) => method === 'order').map(({ scope, args }) => [scope, ...args]),
    ).toEqual([
      ['sprints', 'name', { ascending: true }],
      ['projects', 'name'],
      ['processes', 'name'],
    ]);
  });
});

describe('mutations de entregáveis', () => {
  it('mantém keys/opções e ignora o error retornado ao atualizar status', async () => {
    results.set('sprint_deliverables:update', { data: null, error: new Error('ignorado') });
    renderHook(() => useEquipeKanbanDeliverableMutations());
    expect(
      queryMocks.useMutation.mock.calls.map(([value]) => (value as Registration).mutationKey),
    ).toEqual([
      ['domain-equipe-kanban', 'update-status'],
      ['domain-equipe-kanban', 'save-deliverable'],
      ['domain-equipe-kanban', 'delete-deliverable'],
    ]);
    expect(
      queryMocks.useMutation.mock.calls.every(([value]) => {
        const option = value as Registration;
        return (
          option.retry === false &&
          option.networkMode === 'always' &&
          typeof option.onError === 'function'
        );
      }),
    ).toBe(true);
    await expect(
      mutation('update-status').mutationFn({ deliverableId: 'd-1', status: 'pending' } as never),
    ).resolves.toBeUndefined();
    expect(calls.find(({ method }) => method === 'update')?.args).toEqual([
      { status: 'pending', completed_at: null },
    ]);
  });

  it.each([
    {
      label: 'conclusão',
      completedAt: '2026-07-17T12:00:00.000Z',
    },
    {
      label: 'reabertura',
      completedAt: null,
    },
  ])(
    'saveDeliverable envia payload e id exatos na $label e propaga o erro retornado',
    async ({ completedAt }) => {
      const error = new Error('falha ao salvar entregável');
      const payload = {
        title: 'Entrega revisada',
        description: 'Descrição',
        assigned_to: 'user-2',
        status: completedAt ? 'completed' : 'in_progress',
        start_date: '2026-07-01',
        due_date: '2026-07-31',
        estimated_hours: 4.5,
        completed_at: completedAt,
      };
      results.set('sprint_deliverables:update', { data: null, error });
      renderHook(() => useEquipeKanbanDeliverableMutations());

      await expect(
        mutation('save-deliverable').mutationFn({
          deliverableId: 'deliverable-42',
          payload,
        } as never),
      ).rejects.toBe(error);

      expect(calls.filter(({ method }) => method === 'update')).toEqual([
        { scope: 'sprint_deliverables', method: 'update', args: [payload] },
      ]);
      expect(calls.filter(({ method }) => method === 'eq')).toEqual([
        { scope: 'sprint_deliverables', method: 'eq', args: ['id', 'deliverable-42'] },
      ]);
    },
  );

  it('exclui anexos com precheck e ordem storage/metadados/pai, ignorando erros intermediários', async () => {
    results.set('deliverable_attachments:select', {
      data: [{ id: 'a-1', file_path: 'd/a.pdf' }],
      error: new Error('ignored select'),
    });
    results.set('deliverable_attachments:delete', {
      data: null,
      error: new Error('ignored metadata delete'),
    });
    supabaseMocks.remove.mockResolvedValue({ error: new Error('ignored storage remove') });
    renderHook(() => useEquipeKanbanDeliverableMutations());
    await expect(
      mutation('delete-deliverable').mutationFn('d-1' as never),
    ).resolves.toBeUndefined();

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledTimes(1);
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'deliverable_attachments',
      'delete',
      'a-1',
    );
    expect(rlsMocks.assertCanPerform.mock.invocationCallOrder[0]).toBeLessThan(
      supabaseMocks.storageFrom.mock.invocationCallOrder[0],
    );
    expect(calls.map(({ scope, method }) => `${scope}.${method}`)).toEqual([
      'deliverable_attachments.select',
      'deliverable_attachments.eq',
      'storage.from',
      'storage.remove',
      'deliverable_attachments.delete',
      'deliverable_attachments.eq',
      'sprint_deliverables.delete',
      'sprint_deliverables.eq',
    ]);
  });

  it('exclui o pai diretamente, sem qualquer precheck, quando não há anexos', async () => {
    renderHook(() => useEquipeKanbanDeliverableMutations());
    await mutation('delete-deliverable').mutationFn('d-1' as never);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
    expect(
      calls.some(({ scope, method }) => scope === 'sprint_deliverables' && method === 'delete'),
    ).toBe(true);
  });
});

describe('mutations de anexos', () => {
  it('faz auth, upload, insert de metadados e recarga ordenada nessa sequência', async () => {
    const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });
    results.set('deliverable_attachments:select', { data: [{ id: 'fresh' }], error: null });
    renderHook(() => useEquipeKanbanAttachments());
    const result = await mutation('upload-attachment').mutationFn({
      deliverableId: 'd-1',
      file,
    } as never);

    expect(result).toEqual([{ id: 'fresh' }]);
    expect(supabaseMocks.getUser).toHaveBeenCalledBefore(supabaseMocks.upload);
    expect(supabaseMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^d-1\/\d+\.pdf$/),
      file,
    );
    const insert = calls.find(
      ({ scope, method }) => scope === 'deliverable_attachments' && method === 'insert',
    );
    expect(insert?.args[0]).toMatchObject({
      deliverable_id: 'd-1',
      file_name: 'report.pdf',
      file_size: 3,
      file_type: 'application/pdf',
      uploaded_by: 'user-1',
      file_path: expect.stringMatching(/^d-1\/\d+\.pdf$/),
    });
    expect(calls.map(({ method }) => method)).toEqual([
      'from',
      'upload',
      'insert',
      'select',
      'eq',
      'order',
    ]);
    expect(calls.at(-1)?.args).toEqual(['uploaded_at', { ascending: false }]);
  });

  it('remove arquivo com precheck primeiro e ignora erros de storage e banco', async () => {
    supabaseMocks.remove.mockResolvedValue({ error: new Error('ignored') });
    results.set('deliverable_attachments:delete', { data: null, error: new Error('ignored') });
    renderHook(() => useEquipeKanbanAttachments());
    await expect(
      mutation('delete-attachment').mutationFn({ id: 'a-1', file_path: 'd/a.pdf' } as never),
    ).resolves.toBeUndefined();
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'deliverable_attachments',
      'delete',
      'a-1',
    );
    expect(rlsMocks.assertCanPerform.mock.invocationCallOrder[0]).toBeLessThan(
      supabaseMocks.storageFrom.mock.invocationCallOrder[0],
    );
    expect(calls.map(({ scope, method }) => `${scope}.${method}`)).toEqual([
      'storage.from',
      'storage.remove',
      'deliverable_attachments.delete',
      'deliverable_attachments.eq',
    ]);
  });
});
