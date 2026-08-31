import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgTask } from '@/hooks/useOrgTasks';
import { TaskTable } from '@/components/equipe/fiscal/tasks/TaskTable';

// Radix (Select/DropdownMenu) usa APIs de pointer ausentes no jsdom.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => {} },
  releasePointerCapture: { configurable: true, value: () => {} },
});

const mocks = vi.hoisted(() => ({
  updateTask: vi.fn(),
  updateTaskAsync: vi.fn(),
  createComment: vi.fn(),
}));

vi.mock('@/hooks/useOrgTasks', () => ({
  useUpdateOrgTask: () => ({
    mutate: mocks.updateTask,
    mutateAsync: mocks.updateTaskAsync,
    isPending: false,
  }),
  useCreateOrgTaskComment: () => ({ mutateAsync: mocks.createComment, isPending: false }),
}));

// Dependências do diálogo de transição (revisor + detalhamento).
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'U1' } }) }));
vi.mock('@/hooks/useOrgProjects', () => ({
  useOrgProjectClusterIds: () => ({ data: ['CL1'] }),
}));
vi.mock('@/hooks/useReviewerCandidates', () => ({
  useReviewerCandidates: () => ({ data: [{ id: 'U2', name: 'Rita Rev' }], isLoading: false }),
}));

const noop = () => {};

const tarefa = (overrides: Partial<OrgTask> = {}) =>
  ({
    id: 'T1',
    title: 'Apuração de ICMS',
    status: 'todo',
    priority: 'medium',
    assigned_to: null,
    assigned_to_name: 'Geizi Andrade',
    reviewer_id: null,
    parent_task_id: null,
    project_id: 'PRJ1',
    client_id: 'CLI1',
    due_date: null,
    actual_hours: 4,
    ...overrides,
  }) as unknown as OrgTask;

function renderTable(tasks: OrgTask[]) {
  return render(
    <TaskTable
      tasks={tasks}
      area="tax"
      onEdit={noop}
      onDelete={noop}
      onReassign={noop}
      currentUserId="U1"
      periodo={periodoParado}
    />,
  );
}

/** O primeiro combobox da linha é o de status; o segundo, o de prioridade. */
const statusSelect = () => screen.getAllByRole('combobox')[0];

beforeEach(() => {
  mocks.updateTask.mockClear();
  mocks.updateTaskAsync.mockClear();
  mocks.createComment.mockClear();
});

/** O mês não é o assunto deste teste: um período parado basta. */
const periodoParado = {
  mes: new Date(2026, 7, 1),
  tarefas: [],
  onPasso: () => {},
  onHoje: () => {},
};

describe('TaskTable — barra de período', () => {
  it('a Tabela ganhou a mesma barra da Lista, do Calendário e do Gantt', () => {
    renderTable([]);

    expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeInTheDocument();
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();
  });
});

describe('TaskTable — troca de status pelo seletor', () => {
  it('mandar para revisão abre o diálogo e não grava direto', async () => {
    const user = userEvent.setup();
    renderTable([tarefa()]);

    await user.click(statusSelect());
    await user.click(await screen.findByRole('option', { name: 'Revisão' }));

    // Quem grava é o diálogo, depois de exigir revisor e detalhamento.
    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Enviar para revisão' })).toBeInTheDocument();
    expect(screen.getByText('Revisor')).toBeInTheDocument();
    expect(screen.getByText('O que precisa ser revisado?')).toBeInTheDocument();
  });

  it('devolver para ajuste também passa pelo diálogo', async () => {
    const user = userEvent.setup();
    renderTable([tarefa({ status: 'review', reviewer_id: 'U2' })]);

    await user.click(statusSelect());
    await user.click(await screen.findByRole('option', { name: 'Em Ajuste' }));

    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Devolver para ajustes' })).toBeInTheDocument();
  });

  it('o diálogo grava status, revisor e o comentário de sistema', async () => {
    const user = userEvent.setup();
    renderTable([tarefa()]);

    await user.click(statusSelect());
    await user.click(await screen.findByRole('option', { name: 'Revisão' }));

    await user.click(within(screen.getByRole('dialog')).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Rita Rev' }));
    await user.type(screen.getByLabelText(/O que precisa ser revisado\?/), 'Conferir a base');
    await user.click(screen.getByRole('button', { name: 'Enviar para revisão' }));

    await waitFor(() => expect(mocks.updateTaskAsync).toHaveBeenCalledTimes(1));
    expect(mocks.updateTaskAsync).toHaveBeenCalledWith({
      id: 'T1',
      status: 'review',
      reviewer_id: 'U2',
      reviewTransitionValidated: true,
    });
    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledTimes(1));
    expect(mocks.createComment.mock.calls[0][0]).toMatchObject({
      taskId: 'T1',
      comment: 'Enviado para revisão de Rita Rev: Conferir a base',
      isSystem: true,
    });
  });

  it('status sem transição de revisão continua gravando direto', async () => {
    const user = userEvent.setup();
    renderTable([tarefa()]);

    await user.click(statusSelect());
    await user.click(await screen.findByRole('option', { name: 'Em Progresso' }));

    expect(mocks.updateTask).toHaveBeenCalledWith({ id: 'T1', status: 'in_progress' });
  });
});
