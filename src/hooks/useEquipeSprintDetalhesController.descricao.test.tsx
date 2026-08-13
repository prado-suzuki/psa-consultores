/**
 * O formulário de edição da tarefa recebe a descrição por uma leitura própria,
 * assíncrona. Este arquivo cobre o que o campo mostra ao ABRIR a tarefa, com
 * react-query de verdade: abrir, fechar e reabrir a mesma tarefa não pode
 * devolver o campo vazio.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock('@/hooks/useRlsPrecheck', () => ({ assertCanPerform: vi.fn(async () => undefined) }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: true, isLider: true }) }));
vi.mock('@/hooks/useSprints', () => ({ useSprints: () => ({ data: [] }) }));
vi.mock('@/lib/excelImporter', () => ({
  findProfileByName: vi.fn(() => null),
  parseExcelFile: vi.fn(),
  processExcelData: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMocks.from,
    channel: supabaseMocks.channel,
    removeChannel: supabaseMocks.removeChannel,
    storage: { from: supabaseMocks.storageFrom },
  },
}));

import { useEquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';
import type { SprintDetalhesDeliverable } from '@/hooks/useDomainEquipeSprintDetalhes';

const SPRINT = {
  id: 'sprint-1',
  name: 'Sprint 1',
  goal: null,
  start_date: '2026-08-10',
  end_date: '2026-08-21',
  status: 'active',
  project_id: null,
};

const TAREFA = {
  id: 'task-1',
  title: 'Tarefa 1',
  assigned_to: null,
  start_date: '2026-08-10',
  due_date: '2026-08-20',
  status: 'pending',
  estimated_hours: null,
  actual_hours: null,
  parent_id: null,
  task_code: '1',
  project_id: null,
  process_id: null,
  sprint_id: 'sprint-1',
} as unknown as SprintDetalhesDeliverable;

/** Banco fake: a listagem não traz `description`, ela é lida à parte. */
const banco = { description: 'plano da tarefa' as string | null };
let leiturasDaDescricao = 0;

function makeChain(table: string) {
  let selectArgs = '';
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'eq', 'in', 'not', 'is', 'order', 'limit']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      if (method === 'select') selectArgs = String(args[0] ?? '');
      return chain;
    });
  }
  chain.maybeSingle = vi.fn(() => {
    if (table === 'sprints') return Promise.resolve({ data: SPRINT, error: null });
    if (table === 'sprint_deliverables' && selectArgs === 'description') {
      leiturasDaDescricao += 1;
      return Promise.resolve({ data: { description: banco.description }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
  chain.then = (onFulfilled: (r: unknown) => unknown) => {
    const data = table === 'sprint_deliverables' && selectArgs !== 'id' ? [TAREFA] : [];
    return Promise.resolve({ data, error: null }).then(onFulfilled);
  };
  return chain;
}

/** Mesmos defaults do QueryClient de produção (src/lib/queryClient.ts). */
function wrapper({ children }: { children: ReactNode }) {
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
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/equipe/sprints/sprint-1']}>
        <Routes>
          <Route path="/equipe/sprints/:id" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  banco.description = 'plano da tarefa';
  leiturasDaDescricao = 0;
  supabaseMocks.from.mockImplementation((t: string) => makeChain(t) as never);
  const channelObject = { on: vi.fn(() => channelObject), subscribe: vi.fn(() => channelObject) };
  supabaseMocks.channel.mockReturnValue(channelObject);
});

describe('useEquipeSprintDetalhesController — descrição no formulário', () => {
  // As aberturas passam sempre O MESMO objeto de propósito: é o que a tela faz
  // (react-query preserva a identidade das linhas que não mudaram e a lista
  // hierárquica é memoizada). Clonar a tarefa aqui esconderia o bug.
  it('reabrir a mesma tarefa, sem salvar nada, mantém a descrição no campo', async () => {
    const { result } = renderHook(() => useEquipeSprintDetalhesController(), { wrapper });

    // 1ª abertura
    act(() => result.current.openEditModal(TAREFA));
    await waitFor(() => expect(result.current.editForm.description).toBe('plano da tarefa'));

    // fecha sem salvar
    act(() => result.current.setEditModalOpen(false));

    // 2ª abertura da MESMA tarefa
    act(() => result.current.openEditModal(TAREFA));
    await waitFor(() => expect(result.current.descricaoDaTarefaCarregando).toBe(false));
    expect(result.current.editForm.description).toBe('plano da tarefa');
  });

  it('alternar entre duas tarefas e voltar traz a descrição de cada uma', async () => {
    const OUTRA = { ...TAREFA, id: 'task-2', title: 'Tarefa 2' } as SprintDetalhesDeliverable;
    const textos: Record<string, string> = {
      'task-1': 'plano da tarefa',
      'task-2': 'plano da outra',
    };
    supabaseMocks.from.mockImplementation((table: string) => {
      const chain = makeChain(table) as Record<string, unknown>;
      const eq = chain.eq as (...args: unknown[]) => unknown;
      chain.eq = vi.fn((coluna: string, valor: string) => {
        if (coluna === 'id' && valor in textos) banco.description = textos[valor];
        return eq(coluna, valor);
      });
      return chain as never;
    });
    const { result } = renderHook(() => useEquipeSprintDetalhesController(), { wrapper });

    act(() => result.current.openEditModal(TAREFA));
    await waitFor(() => expect(result.current.editForm.description).toBe('plano da tarefa'));

    act(() => result.current.openEditModal(OUTRA));
    await waitFor(() => expect(result.current.editForm.description).toBe('plano da outra'));

    act(() => result.current.openEditModal(TAREFA));
    await waitFor(() => expect(result.current.editForm.description).toBe('plano da tarefa'));
  });

  it('texto digitado sobrevive à chegada tardia da leitura do banco', async () => {
    const { result } = renderHook(() => useEquipeSprintDetalhesController(), { wrapper });

    act(() => result.current.openEditModal(TAREFA));
    await waitFor(() => expect(result.current.editForm.description).toBe('plano da tarefa'));

    act(() =>
      result.current.setEditForm((form) => ({ ...form, description: 'texto que eu digitei' })),
    );
    // uma releitura do banco não pode passar por cima do que está no campo
    banco.description = 'outro texto qualquer';
    act(() => result.current.openEditModal(TAREFA));
    expect(result.current.editForm.description).not.toBe('');
  });
});
