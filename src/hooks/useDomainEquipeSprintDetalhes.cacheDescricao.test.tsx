/**
 * A descrição da tarefa não vem na listagem: ela tem cache próprio, por tarefa.
 * Este arquivo cobre a sincronia desse cache com react-query DE VERDADE (o
 * teste de wiring vizinho mocka a lib e por isso não enxerga cache), porque o
 * bug que ele previne mora exatamente aí: sem sincronizar, reabrir a tarefa
 * devolvia o texto anterior ao salvamento (vazio, quando a descrição tinha
 * acabado de ser escrita) e o modal regravava esse vazio por cima do banco.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const rlsMocks = vi.hoisted(() => ({ assertCanPerform: vi.fn<() => Promise<void>>() }));
const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));
vi.mock('@/lib/excelImporter', () => ({ findProfileByName: vi.fn(() => null) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMocks.from,
    channel: supabaseMocks.channel,
    removeChannel: supabaseMocks.removeChannel,
    storage: { from: supabaseMocks.storageFrom },
  },
}));

import { useDomainEquipeSprintDetalhes } from '@/hooks/useDomainEquipeSprintDetalhes';

/** Banco fake: só a coluna que interessa, alterada pelo update. */
const banco = { description: null as string | null };
let leiturasDaDescricao = 0;
/** Callback que o hook registra no canal de realtime. */
let realtimeHandler: ((payload: Record<string, unknown>) => void) | null = null;

function makeChain(table: string) {
  let selectArgs = '';
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'eq', 'in', 'not', 'is', 'order', 'limit']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      if (method === 'update') {
        const updates = args[0] as { description?: string | null };
        if ('description' in updates) banco.description = updates.description ?? null;
      }
      if (method === 'select') selectArgs = String(args[0] ?? '');
      return chain;
    });
  }
  chain.maybeSingle = vi.fn(() => {
    if (table === 'sprint_deliverables' && selectArgs === 'description') {
      leiturasDaDescricao += 1;
      return Promise.resolve({ data: { description: banco.description }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
  chain.then = (onFulfilled: (r: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled);
  return chain;
}

/** Mesmos defaults do QueryClient de produção (src/lib/queryClient.ts). */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

/** O modal grava o formulário inteiro; aqui só a descrição varia. */
const payloadDeEdicao = (description: string | null) => ({
  title: 'Tarefa 1',
  description,
  assigned_to: null,
  start_date: null,
  due_date: '2026-08-20',
  estimated_hours: null,
  actual_hours: null,
  status: 'pending',
  completed_at: null,
  project_id: null,
  process_id: null,
  parent_id: null,
  task_code: null,
});

/** Abre a tarefa no modal, fecha e reabre: o caminho em que o bug aparecia. */
function renderComTarefaAberta(deliverableId: string) {
  return renderHook(
    ({ tarefa }: { tarefa: string | undefined }) =>
      useDomainEquipeSprintDetalhes('sprint-1', { tarefaEmEdicao: tarefa }),
    { wrapper: makeWrapper(), initialProps: { tarefa: deliverableId as string | undefined } },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  banco.description = null;
  leiturasDaDescricao = 0;
  realtimeHandler = null;
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  supabaseMocks.from.mockImplementation((t: string) => makeChain(t) as never);
  const channelObject = {
    on: vi.fn((_event: string, _filtro: unknown, handler: (p: Record<string, unknown>) => void) => {
      realtimeHandler = handler;
      return channelObject;
    }),
    subscribe: vi.fn(() => channelObject),
  };
  supabaseMocks.channel.mockReturnValue(channelObject);
});

describe('useDomainEquipeSprintDetalhes — cache da descrição da tarefa', () => {
  it('reabrir a tarefa depois de salvar entrega o texto salvo, não o anterior', async () => {
    banco.description = 'texto original';
    const { result, rerender } = renderComTarefaAberta('task-1');
    await waitFor(() => expect(result.current.descricaoDaTarefa).toBe('texto original'));

    await result.current.updateDeliverable.mutateAsync({
      deliverableId: 'task-1',
      updates: payloadDeEdicao('texto novo'),
    });

    rerender({ tarefa: undefined }); // fecha o modal
    rerender({ tarefa: 'task-1' }); // reabre a mesma tarefa

    // Sem espera: é o primeiro render que o formulário lê, e ele não pode
    // trazer o texto velho nem ficar em branco.
    expect(result.current.descricaoDaTarefaCarregando).toBe(false);
    expect(result.current.descricaoDaTarefa).toBe('texto novo');
  });

  it('tarefa que estava sem descrição não volta vazia depois de ganhar texto', async () => {
    const { result, rerender } = renderComTarefaAberta('task-1');
    await waitFor(() => expect(leiturasDaDescricao).toBe(1));
    expect(result.current.descricaoDaTarefa).toBeNull();

    await result.current.updateDeliverable.mutateAsync({
      deliverableId: 'task-1',
      updates: payloadDeEdicao('<p>plano da tarefa</p>'),
    });

    rerender({ tarefa: undefined });
    rerender({ tarefa: 'task-1' });

    expect(result.current.descricaoDaTarefa).toBe('<p>plano da tarefa</p>');
  });

  it('edição de outra pessoa chega pelo realtime e corrige o cache', async () => {
    banco.description = 'texto original';
    const { result, rerender } = renderComTarefaAberta('task-1');
    await waitFor(() => expect(result.current.descricaoDaTarefa).toBe('texto original'));

    rerender({ tarefa: undefined });
    realtimeHandler?.({
      eventType: 'UPDATE',
      old: { id: 'task-1' },
      new: { id: 'task-1', description: 'texto de outra pessoa' },
    });
    rerender({ tarefa: 'task-1' });

    expect(result.current.descricaoDaTarefa).toBe('texto de outra pessoa');
  });
});
