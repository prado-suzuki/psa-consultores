import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

const auditMocks = vi.hoisted(() => ({
  logAction: vi.fn<() => Promise<void>>(),
}));

const toastMocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const storageMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
}));

const precheckMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('sonner', () => toastMocks);
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction: auditMocks.logAction }),
}));
vi.mock('@/hooks/useRlsPrecheck', () => ({ assertCanPerform: precheckMocks.assertCanPerform }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => storageMocks),
    },
  },
}));

import type { OrgCommentEntityType } from '@/hooks/useDomainOrgComments';
import { orgCommentsQueryKey, useDomainOrgComments } from '@/hooks/useDomainOrgComments';
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
let rpcResult: DbResult = { data: null, error: null };

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
    'eq',
    'or',
    'is',
    'in',
    'order',
    'limit',
  ]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      if (['select', 'insert', 'update', 'delete'].includes(method)) operation = method;
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
function queryRegistrations() {
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as Record<string, unknown>);
}
function mutationRegistrations() {
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) =>
      o as {
        mutationFn: (input: unknown) => Promise<unknown>;
        onSuccess: (data?: unknown, variables?: unknown) => void;
        onError: (error: Error) => void;
      },
  );
}

const invalidateQueries = vi.fn();

function renderComments(
  entityType: OrgCommentEntityType = 'org_task',
  entityId = 'task-1',
  area?: 'tax' | 'osg',
) {
  return renderHook(() =>
    area
      ? useDomainOrgComments(entityType, entityId, area)
      : useDomainOrgComments(entityType, entityId),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rpcResult = { data: 'comment-gerado-no-banco', error: null };
  auditMocks.logAction.mockResolvedValue(undefined);
  precheckMocks.assertCanPerform.mockResolvedValue(undefined);
  storageMocks.upload.mockResolvedValue({ error: null });
  storageMocks.remove.mockResolvedValue({ error: null });
  storageMocks.createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://signed.example/file' },
    error: null,
  });
  reactQueryMocks.useQueryClient.mockReturnValue({ invalidateQueries });
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
  vi.mocked(supabase.rpc).mockImplementation(((...args: unknown[]) => {
    dbCalls.push({ table: 'rpc', method: String(args[0]), args: args.slice(1) });
    return Promise.resolve(rpcResult);
  }) as never);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');
});

describe('useDomainOrgComments — listagem', () => {
  it('registra a query key com entityType e entityId (thread de tarefa e de projeto não compartilham cache)', () => {
    renderComments('org_task', 'task-1');
    expect(queryRegistrations()[0].queryKey).toEqual(['org-comments', 'org_task', 'task-1']);

    vi.clearAllMocks();
    renderComments('org_project', 'proj-9');
    expect(queryRegistrations()[0].queryKey).toEqual(['org-comments', 'org_project', 'proj-9']);
  });

  it('expõe a mesma query key pelo helper exportado', () => {
    expect(orgCommentsQueryKey('org_task', 'task-1')).toEqual([
      'org-comments',
      'org_task',
      'task-1',
    ]);
  });

  it('lê a view por entidade e mantém raízes excluídas para não órfãnar respostas', async () => {
    renderComments('org_task', 'task-1');
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(supabase.from).toHaveBeenCalledWith('org_comments_feed');
    expect(callsFor('org_comments_feed', 'select')[0].args).toEqual(['*']);
    expect(callsFor('org_comments_feed', 'eq').map((c) => c.args)).toEqual([
      ['entity_type', 'org_task'],
      ['entity_id', 'task-1'],
    ]);
    expect(callsFor('org_comments_feed', 'order')[0].args).toEqual([
      'created_at',
      { ascending: true },
    ]);
  });

  it('não consulta sem entityId (enabled: !!entityId)', () => {
    renderComments('org_task', '');
    expect(queryRegistrations()[0].enabled).toBe(false);

    vi.clearAllMocks();
    renderComments('org_task', 'task-1');
    expect(queryRegistrations()[0].enabled).toBe(true);
  });

  it('propaga erro da view', async () => {
    setDbResult('org_comments_feed', 'select', { data: null, error: new Error('boom') });
    renderComments();
    await expect((queryRegistrations()[0].queryFn as () => Promise<unknown>)()).rejects.toThrow(
      'boom',
    );
  });

  it('devolve lista vazia quando a view não retorna dados', async () => {
    setDbResult('org_comments_feed', 'select', { data: null, error: null });
    renderComments();
    await expect((queryRegistrations()[0].queryFn as () => Promise<unknown>)()).resolves.toEqual(
      [],
    );
  });
});

describe('useDomainOrgComments — thread consolidada do projeto', () => {
  function renderConsolidada(entityType: OrgCommentEntityType = 'org_project', entityId = 'proj-9') {
    return renderHook(() =>
      useDomainOrgComments(entityType, entityId, 'tax', entityId, { consolidarTarefas: true }),
    );
  }

  it('tem cache próprio, separado da thread do projeto sozinho', () => {
    renderConsolidada();
    expect(queryRegistrations()[0].queryKey).toEqual([
      'org-comments',
      'org_project',
      'proj-9',
      'consolidado',
    ]);
    expect(orgCommentsQueryKey('org_project', 'proj-9', true)).toEqual([
      'org-comments',
      'org_project',
      'proj-9',
      'consolidado',
    ]);
  });

  it('recorta pela etiqueta project_id e deixa de fora os eventos de sistema das tarefas', async () => {
    renderConsolidada();
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    // Nada de `entity_id`: é a etiqueta que junta projeto e tarefas.
    expect(callsFor('org_comments_feed', 'eq').map((c) => c.args)).toEqual([
      ['project_id', 'proj-9'],
    ]);
    expect(callsFor('org_comments_feed', 'or')[0].args).toEqual([
      'entity_type.eq.org_project,kind.eq.comment',
    ]);
    expect(callsFor('org_comments_feed', 'order')[0].args).toEqual([
      'created_at',
      { ascending: true },
    ]);
  });

  it('ignora o pedido na tarefa — consolidar só vale de projeto para baixo', async () => {
    renderHook(() =>
      useDomainOrgComments('org_task', 'task-1', 'tax', 'proj-9', { consolidarTarefas: true }),
    );
    expect(queryRegistrations()[0].queryKey).toEqual(['org-comments', 'org_task', 'task-1']);

    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(callsFor('org_comments_feed', 'eq').map((c) => c.args)).toEqual([
      ['entity_type', 'org_task'],
      ['entity_id', 'task-1'],
    ]);
  });

  it('responder a um comentário de tarefa grava na tarefa, não no projeto', async () => {
    renderConsolidada();
    await mutationRegistrations()[0].mutationFn({
      body: 'Respondendo pela thread do projeto',
      parentId: 'C1',
      respondidoId: 'C1',
      alvo: { entityType: 'org_task', entityId: 'task-7' },
    });

    const params = dbCalls.find((c) => c.table === 'rpc')?.args[0] as Record<string, unknown>;
    // O trigger do banco exige que a resposta fique na mesma entidade da raiz.
    expect(params._entity_type).toBe('org_task');
    expect(params._entity_id).toBe('task-7');
    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        changed_fields: expect.objectContaining({
          entity_type: { old: null, new: 'org_task' },
          entity_id: { old: null, new: 'task-7' },
        }),
      }),
    );
  });

  it('invalida a thread consolidada e também a da tarefa respondida', () => {
    renderConsolidada();
    mutationRegistrations()[0].onSuccess('C-NOVO', {
      body: 'Respondendo',
      alvo: { entityType: 'org_task', entityId: 'task-7' },
    });

    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['org-comments', 'org_project', 'proj-9', 'consolidado'],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['org-comments', 'org_task', 'task-7'],
    });
  });

  it('publicar no próprio projeto invalida só a thread aberta', () => {
    renderConsolidada();
    mutationRegistrations()[0].onSuccess('C-NOVO', { body: 'No projeto' });

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });
});

describe('useDomainOrgComments — criação', () => {
  it('chama criar_org_comment com os 8 parâmetros nomeados do contrato', async () => {
    renderComments('org_task', 'task-1');
    await mutationRegistrations()[0].mutationFn({ body: 'Primeiro comentário' });

    const rpcCall = dbCalls.find((c) => c.table === 'rpc');
    expect(rpcCall?.method).toBe('criar_org_comment');

    const params = rpcCall?.args[0] as Record<string, unknown>;
    // Contrato com o banco (EDU-08..EDU-13 + migration 20260731120000, que
    // acrescentou `_respondido_id`): nomes e valores exatos.
    expect(Object.keys(params)).toEqual([
      '_id',
      '_entity_type',
      '_entity_id',
      '_parent_id',
      '_body',
      '_mentions',
      '_attachments',
      '_respondido_id',
    ]);
    expect(params).toEqual({
      _id: '11111111-1111-4111-8111-111111111111',
      _entity_type: 'org_task',
      _entity_id: 'task-1',
      _parent_id: null,
      _body: 'Primeiro comentário',
      _mentions: [],
      _attachments: [],
      _respondido_id: null,
    });
  });

  it('resposta manda o comentário respondido separado da raiz onde ela se pendura', async () => {
    renderComments('org_task', 'task-1');
    await mutationRegistrations()[0].mutationFn({
      body: 'Respondendo',
      parentId: 'C1',
      respondidoId: 'C2',
    });

    const params = dbCalls.find((c) => c.table === 'rpc')?.args[0] as Record<string, unknown>;
    // Os dois divergem quando se responde a uma resposta: a thread tem um nível
    // só, então o parent volta a ser a raiz — e quem é notificado é o autor de C2.
    expect(params._parent_id).toBe('C1');
    expect(params._respondido_id).toBe('C2');
  });

  it('serve entityType org_project sem duplicar código', async () => {
    renderComments('org_project', 'proj-9');
    await mutationRegistrations()[0].mutationFn({ body: 'No projeto' });

    const params = dbCalls.find((c) => c.table === 'rpc')?.args[0] as Record<string, unknown>;
    expect(params._entity_type).toBe('org_project');
    expect(params._entity_id).toBe('proj-9');
  });

  it('usa o id gerado no cliente (caminho de anexo das fatias futuras depende dele)', async () => {
    renderComments();
    await mutationRegistrations()[0].mutationFn({ body: 'Comentário' });
    expect(crypto.randomUUID).toHaveBeenCalled();
  });

  it('audita a criação com entity_type org_comment e a área default tax', async () => {
    renderComments('org_task', 'task-1');
    await mutationRegistrations()[0].mutationFn({ body: 'Comentário auditado' });

    expect(auditMocks.logAction).toHaveBeenCalledWith({
      area: 'tax',
      entity_type: 'org_comment',
      entity_id: 'comment-gerado-no-banco',
      entity_name: 'Comentário auditado',
      action: 'created',
      changed_fields: {
        entity_type: { old: null, new: 'org_task' },
        entity_id: { old: null, new: 'task-1' },
        body: { old: null, new: 'Comentário auditado' },
        mentions: { old: null, new: [] },
        attachments: { old: null, new: [] },
      },
    });
  });

  it('propaga a área recebida para a trilha de auditoria', async () => {
    renderComments('org_task', 'task-1', 'osg');
    await mutationRegistrations()[0].mutationFn({ body: 'Comentário OSG' });

    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ area: 'osg', entity_type: 'org_comment' }),
    );
  });

  it('cai no id do cliente quando a RPC não devolve o uuid', async () => {
    rpcResult = { data: null, error: null };
    renderComments();
    await expect(mutationRegistrations()[0].mutationFn({ body: 'Comentário' })).resolves.toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: '11111111-1111-4111-8111-111111111111' }),
    );
  });

  it('invalida a query da thread no onSuccess', () => {
    renderComments('org_task', 'task-1');
    mutationRegistrations()[0].onSuccess();

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['org-comments', 'org_task', 'task-1'],
    });
  });

  it('propaga erro da RPC sem auditar', async () => {
    rpcResult = { data: null, error: { message: 'rpc-falhou' } };
    renderComments();
    await expect(
      mutationRegistrations()[0].mutationFn({ body: 'Comentário' }),
    ).rejects.toMatchObject({ message: 'rpc-falhou' });
    expect(auditMocks.logAction).not.toHaveBeenCalled();
  });

  it('mostra toast de erro pelo sonner (nunca alert/confirm)', () => {
    renderComments();
    mutationRegistrations()[0].onError(new Error('rpc-falhou'));
    expect(toastMocks.toast.error).toHaveBeenCalledWith('Erro ao publicar comentário: rpc-falhou');
  });

  it('sobe anexos antes da RPC usando a convenção projeto/comentário/arquivo', async () => {
    const file = new File(['conteúdo'], 'memoria.pdf', { type: 'application/pdf' });
    renderHook(() => useDomainOrgComments('org_task', 'task-1', 'tax', 'project-7'));

    await mutationRegistrations()[0].mutationFn({ body: 'Segue o arquivo', files: [file] });

    expect(storageMocks.upload).toHaveBeenCalledWith(
      'project-7/11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111.pdf',
      file,
    );
    const params = dbCalls.find((call) => call.table === 'rpc')?.args[0] as Record<string, unknown>;
    expect(params._attachments).toEqual([
      {
        file_path:
          'project-7/11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111.pdf',
        file_name: 'memoria.pdf',
        file_size: file.size,
        file_type: 'application/pdf',
        width: null,
        height: null,
      },
    ]);
  });

  it('remove do storage os arquivos já enviados quando a RPC falha', async () => {
    const file = new File(['x'], 'erro.txt', { type: 'text/plain' });
    rpcResult = { data: null, error: { message: 'rpc-falhou' } };
    renderHook(() => useDomainOrgComments('org_task', 'task-1', 'tax', 'project-7'));

    await expect(
      mutationRegistrations()[0].mutationFn({ body: 'Falhar', files: [file] }),
    ).rejects.toMatchObject({ message: 'rpc-falhou' });

    expect(storageMocks.remove).toHaveBeenCalledWith([
      'project-7/11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111.txt',
    ]);
  });
});

describe('useDomainOrgComments — edição e exclusão', () => {
  it('faz precheck, atualiza somente o corpo e audita a edição', async () => {
    renderComments();
    await mutationRegistrations()[1].mutationFn({ id: 'comment-1', body: 'Texto editado' });

    expect(precheckMocks.assertCanPerform).toHaveBeenCalledWith(
      'org_comments',
      'update',
      'comment-1',
    );
    expect(callsFor('org_comments', 'update')[0].args).toEqual([{ body: 'Texto editado' }]);
    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'org_comment',
        entity_id: 'comment-1',
        action: 'updated',
      }),
    );
  });

  it('exclui logicamente e nunca usa DELETE físico', async () => {
    renderComments();
    await mutationRegistrations()[2].mutationFn('comment-1');

    expect(callsFor('org_comments', 'update')[0].args).toEqual([{ excluido: true }]);
    expect(callsFor('org_comments', 'delete')).toHaveLength(0);
    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deleted', entity_id: 'comment-1' }),
    );
  });
});
