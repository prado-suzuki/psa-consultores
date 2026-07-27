import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  useActualHook: false,
  useDomain: vi.fn(),
  toast: vi.fn(),
  navigate: vi.fn(),
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  storageFrom: vi.fn(),
  assertCanPerform: vi.fn(),
  parseExcelFile: vi.fn(),
  processExcelData: vi.fn(),
  jsonToSheet: vi.fn(),
  bookNew: vi.fn(),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
  calendarProps: vi.fn(),
  hoursProps: vi.fn(),
}));

vi.mock('@/hooks/useDomainEquipeSprintDetalhes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useDomainEquipeSprintDetalhes')>();
  return {
    ...actual,
    useDomainEquipeSprintDetalhes: (sprintId: string | undefined) =>
      boundary.useActualHook
        ? actual.useDomainEquipeSprintDetalhes(sprintId)
        : boundary.useDomain(sprintId),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: boundary.from,
    channel: boundary.channel,
    removeChannel: boundary.removeChannel,
    storage: { from: boundary.storageFrom },
  },
}));

vi.mock('@/hooks/useRlsPrecheck', () => ({ assertCanPerform: boundary.assertCanPerform }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: boundary.toast }) }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => boundary.navigate };
});
vi.mock('@/lib/excelImporter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/excelImporter')>();
  return {
    ...actual,
    parseExcelFile: boundary.parseExcelFile,
    processExcelData: boundary.processExcelData,
  };
});
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: boundary.jsonToSheet,
    book_new: boundary.bookNew,
    book_append_sheet: boundary.bookAppendSheet,
  },
  writeFile: boundary.writeFile,
}));
vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({ title, children }: { title: string; children: ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));
vi.mock('@/components/sprint/SprintCalendar', () => ({
  SprintCalendar: (props: unknown) => {
    boundary.calendarProps(props);
    return <div>CALENDARIO_PUBLICO</div>;
  },
}));
vi.mock('@/components/sprint/SprintHoursDashboard', () => ({
  SprintHoursDashboard: (props: unknown) => {
    boundary.hoursProps(props);
    return <div>HORAS_PUBLICAS</div>;
  },
}));

import EquipeSprintDetalhes from '@/pages/equipe/EquipeSprintDetalhes';
import { useDomainEquipeSprintDetalhes } from '@/hooks/useDomainEquipeSprintDetalhes';
import {
  buildExportRows,
  buildGanttData,
  buildTaskHierarchy,
  calculateSprintRisks,
  filterDeliverables,
  siblingShifts,
  suggestNextTaskCode,
} from '@/lib/equipeSprintDetalhes';

interface ChainResult {
  data: unknown;
  error: { message: string } | null;
}

interface BoundaryChain {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: Promise<ChainResult>['then'];
}

function chainFor(result: ChainResult): BoundaryChain {
  const chain = {} as BoundaryChain;
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected);
  return chain;
}

const sprint = {
  id: 'sprint-1',
  name: 'Sprint Alfa',
  goal: 'Entregar valor',
  start_date: '2026-07-01',
  end_date: '2026-07-31',
  status: 'active',
  project_id: 'project-1',
};

const profiles = [
  { id: 'user-1', first_name: 'Ana', last_name: 'Silva' },
  { id: 'user-2', first_name: 'Bruno', last_name: 'Lima' },
];

const deliverables = [
  {
    id: 'parent',
    title: 'Tarefa Pai',
    description: null,
    assigned_to: 'user-1',
    start_date: '2026-07-01',
    due_date: '2026-07-25',
    status: 'pending',
    estimated_hours: 2,
    parent_id: null,
    task_code: '7',
    project_id: 'project-1',
    process_id: 'process-1',
  },
  {
    id: 'child-10',
    title: 'Subtarefa Dez',
    description: 'qualidade fiscal',
    assigned_to: 'user-2',
    start_date: '2026-07-03',
    due_date: '2026-07-24',
    status: 'pending',
    estimated_hours: 3,
    parent_id: 'parent',
    task_code: '7.10',
    project_id: 'project-1',
    process_id: 'process-1',
  },
  {
    id: 'child-2',
    title: 'Subtarefa Dois',
    description: null,
    assigned_to: 'user-1',
    start_date: '2026-07-02',
    due_date: '2026-07-23',
    status: 'completed',
    estimated_hours: 1,
    parent_id: 'parent',
    task_code: '7.2',
    project_id: 'project-1',
    process_id: 'process-1',
  },
  {
    id: 'deep',
    title: 'Terceiro Nível Oculto',
    description: null,
    assigned_to: 'user-1',
    start_date: '2026-07-02',
    due_date: '2026-07-23',
    status: 'pending',
    estimated_hours: 1,
    parent_id: 'child-2',
    task_code: '7.2.1',
    project_id: null,
    process_id: null,
  },
  {
    id: 'late',
    title: 'Entrega Atrasada',
    description: null,
    assigned_to: 'user-1',
    start_date: '2026-07-01',
    due_date: '2026-07-19',
    status: 'in_progress',
    estimated_hours: 5,
    parent_id: null,
    task_code: '8',
    project_id: null,
    process_id: null,
  },
  {
    id: 'today',
    title: 'Entrega Hoje',
    description: null,
    assigned_to: null,
    start_date: null,
    due_date: '2026-07-21',
    status: 'pending',
    estimated_hours: null,
    parent_id: null,
    task_code: '9',
    project_id: null,
    process_id: null,
  },
  {
    id: 'tomorrow',
    title: 'Entrega Amanhã',
    description: null,
    assigned_to: 'user-2',
    start_date: '2026-07-21',
    due_date: '2026-07-22',
    status: 'pending',
    estimated_hours: 2,
    parent_id: null,
    task_code: '10',
    project_id: null,
    process_id: null,
  },
];

const mutations = {
  updateDeliverableStatus: { mutateAsync: vi.fn() },
  reorderDeliverables: { mutateAsync: vi.fn() },
  updateDeliverable: { mutateAsync: vi.fn() },
  deleteDeliverable: { mutateAsync: vi.fn() },
  updateMetric: { mutateAsync: vi.fn() },
  createDeliverable: { mutateAsync: vi.fn() },
  importDeliverables: { mutateAsync: vi.fn() },
};
const refetch = vi.fn();

function pageData(overrides: Record<string, unknown> = {}) {
  return {
    sprint,
    deliverables,
    events: [
      {
        id: 'event-1',
        title: 'Daily fiscal',
        description: 'Alinhamento',
        event_date: '2026-07-21',
        start_time: '09:00:00',
        end_time: '09:15:00',
        event_type: 'daily',
        participants: ['user-1'],
      },
    ],
    metrics: [
      {
        id: 'metric-1',
        name: 'Qualidade fiscal',
        target_value: 10,
        current_value: 1,
        unit: 'pontos',
        category: 'Fiscal',
      },
    ],
    profiles,
    projects: [{ id: 'project-1', name: 'Projeto Fiscal' }],
    processes: [{ id: 'process-1', name: 'Apuração', project_id: 'project-1' }],
    projectProcesses: [{ process_id: 'process-1', project_id: 'project-1' }],
    isLoading: false,
    isNotFound: false,
    error: null,
    dataUpdatedAt: 10,
    refetch,
    ...mutations,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/equipe/sprints/sprint-1']}>
      <Routes>
        <Route path="/equipe/sprints/:id" element={<EquipeSprintDetalhes />} />
      </Routes>
    </MemoryRouter>,
  );
}

function hookWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function installQueryBoundary() {
  const rows: Record<string, ChainResult> = {
    sprints: { data: sprint, error: null },
    estrutura_areas: { data: [{ id: 'area-1' }], error: null },
    estrutura_equipes: { data: [{ id: 'team-1', gestor_id: 'user-1' }], error: null },
    estrutura_equipe_membros: { data: [{ user_id: 'user-2' }], error: null },
    profiles_safe: { data: profiles, error: null },
    sprint_deliverables: { data: deliverables.slice(0, 2), error: null },
    sprint_events: { data: [], error: null },
    sprint_metrics: { data: [], error: null },
    projects: { data: [], error: null },
    processes: { data: [], error: null },
    project_processes: { data: [], error: null },
  };
  const chains = new Map<string, BoundaryChain>();
  boundary.from.mockImplementation((table: string) => {
    const chain = chainFor(rows[table] ?? { data: [], error: null });
    chains.set(table, chain);
    return chain;
  });

  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  boundary.channel.mockReturnValue(channel);
  return { chains, channel };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-07-21T12:34:56.000Z'));
  boundary.useActualHook = false;
  boundary.useDomain.mockReturnValue(pageData());
  refetch.mockResolvedValue({ data: {}, error: null, dataUpdatedAt: 11 });
  Object.values(mutations).forEach((mutation) => mutation.mutateAsync.mockResolvedValue(undefined));
  boundary.parseExcelFile.mockResolvedValue([{ Sprint: 'Sprint Alfa' }]);
  boundary.processExcelData.mockReturnValue({
    taskGroups: [
      {
        title: 'Grupo importado',
        responsible: 'Sem Cadastro',
        minDate: '2026-07-22',
        maxDate: '2026-07-23',
        totalHours: 3,
        projectName: null,
        processName: null,
        subtasks: [],
      },
    ],
    totalTasks: 1,
    totalSubtasks: 0,
    totalHours: 3,
    unmappedResponsibles: ['Sem Cadastro'],
  });
  boundary.jsonToSheet.mockReturnValue({ sheet: true });
  boundary.bookNew.mockReturnValue({ workbook: true });
  boundary.assertCanPerform.mockResolvedValue(undefined);
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined;
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDomainEquipeSprintDetalhes: contratos na fronteira', () => {
  it('preserva query key, opções observáveis, consultas e realtime filtrado da sprint', async () => {
    boundary.useActualHook = true;
    const { chains, channel } = installQueryBoundary();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useDomainEquipeSprintDetalhes('sprint-1'), {
      wrapper: hookWrapper(client),
    });

    await waitFor(() => expect(result.current.sprint?.id).toBe('sprint-1'));
    expect(client.getQueryData(['domain-equipe-sprint-detalhes', 'sprint-1'])).toBeTruthy();
    expect(boundary.from.mock.calls.map(([table]) => table)).toEqual([
      'sprints',
      'estrutura_areas',
      'estrutura_equipes',
      'estrutura_equipe_membros',
      'profiles_safe',
      'sprint_deliverables',
      'sprint_events',
      'sprint_metrics',
      'projects',
      'processes',
      'project_processes',
    ]);
    expect(chains.get('sprints')?.select).toHaveBeenCalledWith('*');
    expect(chains.get('sprints')?.eq).toHaveBeenCalledWith('id', 'sprint-1');
    expect(chains.get('sprint_deliverables')?.eq).toHaveBeenCalledWith('sprint_id', 'sprint-1');
    expect(chains.get('sprint_deliverables')?.order).toHaveBeenCalledWith('due_date', {
      ascending: true,
    });
    expect(chains.get('sprint_events')?.order.mock.calls).toEqual([
      ['event_date', { ascending: true }],
      ['start_time', { ascending: true }],
    ]);
    expect(boundary.channel).toHaveBeenCalledWith('sprint-deliverables-sprint-1');
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sprint_deliverables',
        filter: 'sprint_id=eq.sprint-1',
      },
      expect.any(Function),
    );

    const realtime = channel.on.mock.calls[0][2] as (payload: unknown) => void;
    act(() =>
      realtime({
        eventType: 'UPDATE',
        old: {},
        new: { id: 'parent', title: 'Atualizada em realtime' },
      }),
    );
    await waitFor(() =>
      expect(result.current.deliverables[0].title).toBe('Atualizada em realtime'),
    );
    act(() =>
      realtime({ eventType: 'INSERT', old: {}, new: { ...deliverables[4], id: 'realtime-new' } }),
    );
    await waitFor(() =>
      expect(result.current.deliverables.some((item) => item.id === 'realtime-new')).toBe(true),
    );
    act(() => realtime({ eventType: 'DELETE', old: { id: 'child-10' }, new: {} }));
    await waitFor(() =>
      expect(result.current.deliverables.some((item) => item.id === 'child-10')).toBe(false),
    );

    unmount();
    expect(boundary.removeChannel).toHaveBeenCalledWith(channel);
  });

  it('não consulta sem id e mantém o estado público de carregamento', () => {
    boundary.useActualHook = true;
    installQueryBoundary();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDomainEquipeSprintDetalhes(undefined), {
      wrapper: hookWrapper(client),
    });
    expect(result.current.isLoading).toBe(true);
    expect(boundary.from).not.toHaveBeenCalled();
    expect(boundary.channel).not.toHaveBeenCalled();
  });

  it('recalcula completed_at ao marcar e desmarcar uma conclusão', async () => {
    boundary.useActualHook = true;
    installQueryBoundary();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDomainEquipeSprintDetalhes('sprint-1'), {
      wrapper: hookWrapper(client),
    });
    await waitFor(() => expect(result.current.sprint).not.toBeNull());

    const updateChain = chainFor({ data: null, error: null });
    boundary.from.mockImplementation(() => updateChain);
    await act(() =>
      result.current.updateDeliverableStatus.mutateAsync({
        deliverableId: 'parent',
        newStatus: 'completed',
      }),
    );
    expect(updateChain.update).toHaveBeenLastCalledWith({
      status: 'completed',
      completed_at: expect.stringMatching(/^2026-07-21T12:34:56\.\d{3}Z$/),
    });
    await act(() =>
      result.current.updateDeliverableStatus.mutateAsync({
        deliverableId: 'parent',
        newStatus: 'pending',
      }),
    );
    expect(updateChain.update).toHaveBeenLastCalledWith({ status: 'pending', completed_at: null });
  });

  it('exclui na ordem storage, registros de anexos e entregável', async () => {
    boundary.useActualHook = true;
    installQueryBoundary();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDomainEquipeSprintDetalhes('sprint-1'), {
      wrapper: hookWrapper(client),
    });
    await waitFor(() => expect(result.current.sprint).not.toBeNull());

    const order: string[] = [];
    let attachmentCall = 0;
    boundary.from.mockImplementation((table: string) => {
      if (table === 'deliverable_attachments' && attachmentCall++ === 0) {
        return chainFor({ data: [{ id: 'attachment-1', file_path: 'sprint/a.pdf' }], error: null });
      }
      const chain = chainFor({ data: null, error: null });
      if (table === 'deliverable_attachments')
        chain.delete.mockImplementation(() => {
          order.push('anexos');
          return chain;
        });
      if (table === 'sprint_deliverables')
        chain.delete.mockImplementation(() => {
          order.push('entregavel');
          return chain;
        });
      return chain;
    });
    boundary.storageFrom.mockReturnValue({
      remove: vi.fn(async () => {
        order.push('storage');
        return { error: null };
      }),
    });

    await act(() => result.current.deleteDeliverable.mutateAsync('parent'));
    expect(boundary.assertCanPerform.mock.calls).toEqual([
      ['sprint_deliverables', 'delete', 'parent'],
      ['deliverable_attachments', 'delete', 'attachment-1'],
    ]);
    expect(boundary.storageFrom).toHaveBeenCalledWith('deliverable-attachments');
    expect(order).toEqual(['storage', 'anexos', 'entregavel']);
  });

  it('importa grupos sequencialmente e mantém os dados parciais quando um grupo posterior falha', async () => {
    boundary.useActualHook = true;
    installQueryBoundary();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDomainEquipeSprintDetalhes('sprint-1'), {
      wrapper: hookWrapper(client),
    });
    await waitFor(() => expect(result.current.sprint).not.toBeNull());

    const inserts: unknown[] = [];
    let parentNumber = 0;
    boundary.from.mockImplementation(() => {
      const chain = chainFor({ data: null, error: null });
      chain.insert.mockImplementation((payload: unknown) => {
        inserts.push(payload);
        return chain;
      });
      chain.single.mockImplementation(async () => {
        parentNumber += 1;
        return parentNumber === 1
          ? { data: { id: 'import-parent-1', project_id: null, process_id: null }, error: null }
          : { data: null, error: { message: 'falha no segundo grupo' } };
      });
      return chain;
    });
    const groups = [
      {
        title: 'Grupo 1',
        responsible: 'Ana',
        minDate: '2026-07-22',
        maxDate: '2026-07-23',
        totalHours: 2,
        projectName: null,
        processName: null,
        subtasks: [
          {
            title: 'Grupo 1',
            subtaskTitle: 'Sub 1',
            responsible: 'Bruno',
            description: '',
            estimatedHours: 2,
            dueDate: '2026-07-23',
            taskCode: '1.1',
            projectName: '',
            processName: '',
          },
        ],
      },
      {
        title: 'Grupo 2',
        responsible: '',
        minDate: null,
        maxDate: null,
        totalHours: 0,
        projectName: null,
        processName: null,
        subtasks: [],
      },
    ];

    await expect(
      result.current.importDeliverables.mutateAsync({
        sprint,
        taskGroups: groups,
        responsibleMapping: {},
        profiles,
      }),
    ).rejects.toMatchObject({ message: 'falha no segundo grupo' });
    expect(inserts).toHaveLength(3);
    expect(inserts[0]).toMatchObject({ title: 'Grupo 1', assigned_to: 'user-1', parent_id: null });
    expect(inserts[1]).toEqual([
      expect.objectContaining({
        title: 'Sub 1',
        assigned_to: 'user-2',
        parent_id: 'import-parent-1',
        task_code: '1.1',
      }),
    ]);
    expect(inserts[2]).toMatchObject({ title: 'Grupo 2' });
  });
});

describe('EquipeSprintDetalhes: UI pública', () => {
  it('expõe estados de loading, erro/not-found e navegação de retorno', async () => {
    boundary.useDomain.mockReturnValue(pageData({ sprint: null, isLoading: true }));
    const view = renderPage();
    expect(screen.getByRole('heading', { name: 'Carregando...' })).toBeInTheDocument();

    boundary.useDomain.mockReturnValue(
      pageData({ sprint: null, isLoading: false, isNotFound: true, dataUpdatedAt: 20 }),
    );
    view.rerender(
      <MemoryRouter initialEntries={['/equipe/sprints/sprint-1']}>
        <Routes>
          <Route path="/equipe/sprints/:id" element={<EquipeSprintDetalhes />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(boundary.toast).toHaveBeenCalledWith({
        title: 'Sprint não encontrada',
        variant: 'destructive',
      }),
    );
    expect(boundary.navigate).toHaveBeenCalledWith('/equipe/sprints');
    expect(screen.getByRole('heading', { name: 'Sprint não encontrada' })).toBeInTheDocument();
  });

  it('mantém apenas um nível de hierarquia e ordena task_code numericamente', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    boundary.useDomain.mockReturnValue(pageData({ deliverables: deliverables.slice(0, 4) }));
    renderPage();
    expect(boundary.useDomain).toHaveBeenCalledWith('sprint-1');
    expect(screen.getByText('Tarefa Pai')).toBeInTheDocument();
    expect(screen.queryByText('Subtarefa Dois')).not.toBeInTheDocument();

    const parentCard = screen.getByText('Tarefa Pai').closest('[class*="rounded-lg"]');
    expect(parentCard).not.toBeNull();
    await user.click(within(parentCard as HTMLElement).getAllByRole('button')[0]);
    const two = screen.getByText('Subtarefa Dois');
    const ten = screen.getByText('Subtarefa Dez');
    expect(two.compareDocumentPosition(ten) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Terceiro Nível Oculto')).not.toBeInTheDocument();
    expect(screen.getByText('1/2 subtarefas')).toBeInTheDocument();
  });

  it('mantém indicadores de data nos cards e omite responsáveis sem perfil do filtro', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    boundary.useDomain.mockReturnValue(
      pageData({
        deliverables: [
          ...deliverables,
          { ...deliverables[4], id: 'ghost', assigned_to: 'missing-profile', task_code: '11' },
        ],
      }),
    );
    renderPage();

    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(screen.getByText('Amanhã')).toBeInTheDocument();
    expect(screen.getAllByText('Passado')).toHaveLength(2);

    await user.click(screen.getAllByRole('combobox')[0]);
    expect(screen.getByRole('option', { name: 'Ana Silva' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bruno Lima' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Desconhecido' })).not.toBeInTheDocument();
  });

  it('filtra por data/status preservando o pai de uma subtarefa correspondente e limpa filtros', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Hoje (1)' }));
    expect(screen.getByText('Entrega Hoje')).toBeInTheDocument();
    expect(screen.queryByText('Entrega Atrasada')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 7 entregáveis')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Limpar/ }));

    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Concluído' }));
    expect(screen.getByText('Tarefa Pai')).toBeInTheDocument();
    expect(screen.getByText('2 de 7 entregáveis')).toBeInTheDocument();
  });

  it('marca status e cria tarefa com defaults e payload público atuais', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    boundary.useDomain.mockReturnValue(pageData({ deliverables: [deliverables[4]] }));
    renderPage();
    await user.click(screen.getByRole('checkbox'));
    expect(mutations.updateDeliverableStatus.mutateAsync).toHaveBeenCalledWith({
      deliverableId: 'late',
      newStatus: 'completed',
    });

    await user.click(screen.getByRole('button', { name: 'Nova Tarefa' }));
    expect(screen.getByRole('heading', { name: 'Nova Tarefa' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Título *'), 'Nova entrega');
    await user.clear(screen.getByLabelText('Horas Estimadas'));
    await user.type(screen.getByLabelText('Horas Estimadas'), '4.5');
    await user.click(screen.getByRole('button', { name: 'Criar Tarefa' }));
    expect(mutations.createDeliverable.mutateAsync).toHaveBeenCalledWith({
      sprint_id: 'sprint-1',
      title: 'Nova entrega',
      description: null,
      assigned_to: null,
      start_date: '2026-07-01',
      due_date: '2026-07-31',
      estimated_hours: 4.5,
      status: 'pending',
      parent_id: null,
      project_id: null,
      process_id: null,
      task_code: null,
    });
  });

  it('avisa antes de concluir tarefa-mãe com subtarefa aberta e só grava se confirmar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    // parent (pendente) + child-10 (pendente) + child-2 (concluída).
    boundary.useDomain.mockReturnValue(pageData({ deliverables: deliverables.slice(0, 3) }));
    renderPage();

    await user.click(screen.getAllByRole('checkbox')[0]);
    const warning = await screen.findByRole('alertdialog');
    // Lista só o que está aberto — a subtarefa já concluída não entra.
    expect(within(warning).getByText(/Subtarefa Dez/)).toBeInTheDocument();
    expect(within(warning).queryByText(/Subtarefa Dois/)).not.toBeInTheDocument();
    expect(mutations.updateDeliverableStatus.mutateAsync).not.toHaveBeenCalled();

    await user.click(within(warning).getByRole('button', { name: 'Concluir mesmo assim' }));
    expect(mutations.updateDeliverableStatus.mutateAsync).toHaveBeenCalledWith({
      deliverableId: 'parent',
      newStatus: 'completed',
    });
  });

  it('não avisa ao reabrir a mãe nem ao concluir subtarefa folha', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    boundary.useDomain.mockReturnValue(
      pageData({
        deliverables: [
          { ...deliverables[0], status: 'completed' },
          deliverables[1],
          deliverables[2],
        ],
      }),
    );
    renderPage();

    // Desmarcar a mãe concluída não é uma transição para 'completed'.
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mutations.updateDeliverableStatus.mutateAsync).toHaveBeenCalledWith({
      deliverableId: 'parent',
      newStatus: 'pending',
    });

    // A subtarefa folha conclui direto, sem aviso.
    const parentCard = screen.getByText('Tarefa Pai').closest('[class*="rounded-lg"]');
    await user.click(within(parentCard as HTMLElement).getAllByRole('button')[0]);
    await user.click(screen.getAllByRole('checkbox')[2]);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mutations.updateDeliverableStatus.mutateAsync).toHaveBeenCalledWith({
      deliverableId: 'child-10',
      newStatus: 'completed',
    });
  });

  it('salva edição com timestamp de conclusão recalculado e delega exclusão após confirmação', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    boundary.useDomain.mockReturnValue(pageData({ deliverables: [deliverables[4]] }));
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Gantt' }));
    await user.click(screen.getByRole('button', { name: /Ana Silva/ }));
    await user.click(screen.getAllByRole('button', { name: /Entrega Atrasada/ })[0]);
    expect(screen.getByRole('heading', { name: 'Editar Entregável' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Status'));
    await user.click(screen.getByRole('option', { name: 'Concluído' }));
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
    expect(mutations.updateDeliverable.mutateAsync).toHaveBeenCalledWith({
      deliverableId: 'late',
      updates: expect.objectContaining({
        status: 'completed',
        completed_at: expect.stringMatching(/^2026-07-21T12:34:56\.\d{3}Z$/),
      }),
    });

    await user.click(screen.getByRole('tab', { name: 'Gantt' }));
    await user.click(screen.getAllByRole('button', { name: /Entrega Atrasada/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(screen.getByRole('heading', { name: 'Excluir entregável?' })).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }),
    );
    expect(mutations.deleteDeliverable.mutateAsync).toHaveBeenCalledWith('late');
  });

  it('compõe Gantt, agenda, métricas e riscos com os dados filtrados', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Gantt' }));
    expect(screen.getByText('Responsável / Entregável')).toBeInTheDocument();
    expect(screen.getAllByTestId('gantt-day-grid')).toHaveLength(3);
    // Caracteriza inclusive a pluralização pública atual; refatoração não deve corrigi-la incidentalmente.
    expect(
      screen.getByRole('button', { name: /Ana Silva 4 entregávelis • 9h • 1\/4 concluídos/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Agenda' }));
    expect(screen.getByText('CALENDARIO_PUBLICO')).toBeInTheDocument();
    expect(screen.getByText('Daily fiscal')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(boundary.calendarProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ deliverables }),
    );

    await user.click(screen.getByRole('tab', { name: 'Métricas' }));
    expect(screen.getByText('HORAS_PUBLICAS')).toBeInTheDocument();
    expect(screen.getByText('Qualidade fiscal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /1 responsáveis • 1 entregáveis/ }));
    const relatedTitle = screen.getByText('Subtarefa Dez');
    expect(relatedTitle).toHaveClass('text-gray-700');
    expect(relatedTitle.parentElement?.parentElement).toHaveClass('max-h-40', 'overflow-y-auto');
    expect(screen.getByText('○')).toHaveClass('bg-gray-50', 'text-gray-500');
    await user.click(screen.getByRole('button', { name: '+1' }));
    expect(mutations.updateMetric.mutateAsync).toHaveBeenCalledWith({
      metricId: 'metric-1',
      newValue: 2,
    });

    await user.click(screen.getByRole('tab', { name: 'Riscos' }));
    expect(screen.getByText('Entregáveis Atrasados')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Métricas em Risco' })).toBeInTheDocument();
    expect(screen.getByText('Entrega Hoje')).toBeInTheDocument();
    expect(screen.getByText('Entrega Amanhã')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
  });

  it('pré-visualiza e importa Excel pela fronteira, refazendo a consulta após sucesso', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderPage();
    await user.click(screen.getByRole('button', { name: 'Importar Excel' }));
    expect(
      screen.getByText(
        /O arquivo deve conter colunas: Sprint, ID, Título, Subtarefa, Responsável, Descrição, Estimativa \(h\), Data de Entrega/,
      ),
    ).toBeInTheDocument();
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    const file = new File(['planilha'], 'sprint.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    expect(await screen.findByText('Grupo importado')).toBeInTheDocument();
    expect(screen.getByText('Responsáveis não encontrados (1)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Importar 1 tarefas' }));
    expect(mutations.importDeliverables.mutateAsync).toHaveBeenCalledWith({
      sprint,
      taskGroups: expect.arrayContaining([expect.objectContaining({ title: 'Grupo importado' })]),
      responsibleMapping: { 'Sem Cadastro': '' },
      profiles,
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(boundary.toast).toHaveBeenCalledWith({
      title: 'Importação concluída',
      description: '1 tarefas e 0 subtarefas importadas',
    });
  });

  it('mantém título riscado e indicador visual para entregável relacionado concluído', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    boundary.useDomain.mockReturnValue(
      pageData({
        deliverables: [{ ...deliverables[2], description: 'qualidade fiscal' }],
      }),
    );
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Métricas' }));
    await user.click(screen.getByRole('button', { name: /1 responsáveis • 1 entregáveis/ }));
    expect(screen.getByText('Subtarefa Dois')).toHaveClass('line-through', 'text-gray-400');
    expect(screen.getByText('✓')).toHaveClass('bg-green-50', 'text-green-600');
  });

  it('exporta planilha compatível com importação e nomes relacionados', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    boundary.useDomain.mockReturnValue(pageData({ deliverables: deliverables.slice(0, 2) }));
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(boundary.jsonToSheet).toHaveBeenCalledWith([
      expect.objectContaining({
        Sprint: 'Sprint Alfa',
        ID: '7',
        Título: 'Tarefa Pai',
        Subtarefa: '',
        Responsável: 'Ana',
        Projeto: 'Projeto Fiscal',
        Processo: 'Apuração',
      }),
      expect.objectContaining({
        ID: '7.10',
        Título: 'Tarefa Pai',
        Subtarefa: 'Subtarefa Dez',
        Responsável: 'Bruno',
        'Data de Entrega': '24/07/2026',
      }),
    ]);
    expect(boundary.bookAppendSheet).toHaveBeenCalledWith(
      { workbook: true },
      { sheet: true },
      'Entregáveis',
    );
    expect(boundary.writeFile).toHaveBeenCalledWith(
      { workbook: true },
      'Sprint_Alfa_2026-07-21.xlsx',
    );
  });
});

describe('EquipeSprintDetalhes: regras puras extraídas', () => {
  it('preserva filtro com pai visível e hierarquia limitada a um nível com sort numérico', () => {
    const filtered = filterDeliverables(deliverables, {
      responsible: 'user-1',
      status: 'completed',
      date: 'all',
    });
    expect(filtered.map((item) => item.id)).toEqual(['parent', 'child-2']);
    const hierarchy = buildTaskHierarchy(deliverables.slice(0, 4));
    expect(hierarchy).toHaveLength(1);
    expect(hierarchy[0].subtasks.map((item) => item.task_code)).toEqual(['7.2', '7.10']);
    expect(hierarchy[0].subtasks.some((item) => item.id === 'deep')).toBe(false);
  });

  it('calcula riscos, Gantt e reordenação sem alterar os contratos atuais', () => {
    const risks = calculateSprintRisks(
      deliverables,
      pageData().metrics,
      sprint,
      new Date('2026-07-21T12:34:56Z'),
    );
    expect(risks.overdue.map((item) => item.id)).toEqual(['late']);
    expect(Math.round(risks.sprintProgress)).toBe(68);
    const gantt = buildGanttData(sprint, [deliverables[0]]);
    expect(gantt.totalDays).toBe(31);
    expect(gantt.deliverables[0]).toMatchObject({ startOffset: 0, duration: 25 });
    expect(suggestNextTaskCode(deliverables, 'parent')).toBe('7.11');
    expect(siblingShifts(deliverables, 'parent', '7.2')).toEqual([
      { deliverableId: 'child-10', taskCode: '7.11' },
      { deliverableId: 'child-2', taskCode: '7.3' },
    ]);
  });

  it('gera linhas de exportação compatíveis com a importação', () => {
    const rows = buildExportRows(
      sprint,
      deliverables.slice(0, 2),
      profiles,
      pageData().projects,
      pageData().processes,
    );
    expect(rows).toEqual([
      expect.objectContaining({
        Sprint: 'Sprint Alfa',
        ID: '7',
        Título: 'Tarefa Pai',
        Subtarefa: '',
        Responsável: 'Ana',
      }),
      expect.objectContaining({
        ID: '7.10',
        Título: 'Tarefa Pai',
        Subtarefa: 'Subtarefa Dez',
        'Data de Entrega': '24/07/2026',
      }),
    ]);
  });
});
