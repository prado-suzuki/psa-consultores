/**
 * O diálogo de transição por ATALHO: arrastar o cartão no quadro, e os selects
 * de status da tabela, da árvore de Projetos & Tarefas e das subtarefas.
 *
 * Ele grava o MESMO despacho que os botões dentro da tarefa, e até 22/09/2026
 * era o único caminho que não perguntava a hora de quem revisa: o revisor
 * devolvia arrastando e a hora se perdia em silêncio.
 *
 * Estes testes travam as duas metades da regra, que pergunta a quem revisa e a
 * mais ninguém, e o formato do payload: o espelho da RLS-06 dentro do
 * `useUpdateOrgTask` só admite `status` e `review_hours` num despacho de
 * devolução, e qualquer campo a mais faz o salvamento morrer antes do banco.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgTask } from '@/hooks/useOrgTasks';

const mocks = vi.hoisted(() => ({
  user: { id: 'U-REV' } as { id: string } | null,
  updateTask: vi.fn(),
  createComment: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useOrgTasks', () => ({
  useUpdateOrgTask: () => ({ mutateAsync: mocks.updateTask, isPending: false }),
  useCreateOrgTaskComment: () => ({ mutateAsync: mocks.createComment, isPending: false }),
}));
vi.mock('@/hooks/useOrgProjects', () => ({
  useOrgProjectClusterIds: () => ({ data: ['C1'] }),
}));
vi.mock('@/hooks/useReviewerCandidates', () => ({
  useReviewerCandidates: () => ({
    data: [{ id: 'U-REV', name: 'Ana Revisora' }],
    isLoading: false,
  }),
}));

import { TaskStatusTransitionDialog } from '@/components/equipe/fiscal/tasks/TaskStatusTransitionDialog';

const REVISOR = 'U-REV';
const EXECUTOR = 'U-EXEC';

function tarefa(overrides: Partial<OrgTask> = {}): OrgTask {
  return {
    id: 'T1',
    title: 'Relatório do cliente',
    status: 'review',
    assigned_to: EXECUTOR,
    assigned_to_name: 'Eduardo Nogueira',
    reviewer_id: REVISOR,
    project_id: 'P1',
    review_hours: null,
    ...overrides,
  } as unknown as OrgTask;
}

function montar(status: 'review' | 'em_ajuste', task: OrgTask) {
  return render(
    <TaskStatusTransitionDialog
      open
      onOpenChange={() => undefined}
      task={task}
      status={status}
      area="tax"
    />,
  );
}

const campoDeHoras = () => screen.queryByLabelText('Horas desta revisão');

/** O payload do `updateTask`, sem o `id` e sem a bandeira de validação. */
function payloadDoDespacho() {
  const { id, reviewTransitionValidated, ...resto } = mocks.updateTask.mock.calls[0][0];
  return resto;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: REVISOR };
  mocks.updateTask.mockResolvedValue({});
  mocks.createComment.mockResolvedValue({});
});

describe('TaskStatusTransitionDialog: a hora de quem revisa', () => {
  it('pergunta a hora quando quem devolve para ajustes é o revisor', () => {
    montar('em_ajuste', tarefa());

    expect(campoDeHoras()).toBeInTheDocument();
    expect(
      screen.getByText(/Soma ao total e fica separado das horas de quem executou/i),
    ).toBeInTheDocument();
  });

  it('NÃO pergunta a hora para quem não é o revisor da tarefa', () => {
    // O ramo do revisor no gatilho da RLS-06 é o único que libera a coluna:
    // perguntar aqui renderia um 42501 no salvamento.
    mocks.user = { id: EXECUTOR };
    montar('em_ajuste', tarefa());

    expect(campoDeHoras()).not.toBeInTheDocument();
  });

  it('NÃO pergunta a hora ao enviar para revisão', () => {
    // Quem manda revisar ainda não revisou nada.
    montar('review', tarefa({ status: 'todo' }));

    expect(campoDeHoras()).not.toBeInTheDocument();
  });

  it('soma a hora informada ao total já gravado na tarefa', async () => {
    const usuario = userEvent.setup();
    montar('em_ajuste', tarefa({ review_hours: 2 } as Partial<OrgTask>));

    await usuario.type(campoDeHoras()!, '1');
    await usuario.type(screen.getByLabelText(/O que precisa ser ajustado/i), 'Refazer o quadro 3');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar ajustes' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadDoDespacho()).toEqual({ status: 'em_ajuste', review_hours: 3 });
  });

  it('grava a primeira revisão quando a tarefa ainda não tem hora nenhuma', async () => {
    const usuario = userEvent.setup();
    montar('em_ajuste', tarefa());

    await usuario.type(campoDeHoras()!, '0.5');
    await usuario.type(screen.getByLabelText(/O que precisa ser ajustado/i), 'Falta a conclusão');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar ajustes' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadDoDespacho()).toEqual({ status: 'em_ajuste', review_hours: 0.5 });
  });

  it('não manda `review_hours` quando o revisor deixa o campo vazio', async () => {
    // Mandar o total inalterado faria o hook gravar à toa, e o campo é opcional:
    // devolver sem apontar hora continua valendo.
    const usuario = userEvent.setup();
    montar('em_ajuste', tarefa({ review_hours: 2 } as Partial<OrgTask>));

    await usuario.type(screen.getByLabelText(/O que precisa ser ajustado/i), 'Sem apontar hora');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar ajustes' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadDoDespacho()).toEqual({ status: 'em_ajuste' });
  });

  it('ignora valor que não é hora, em vez de gravar lixo', async () => {
    const usuario = userEvent.setup();
    montar('em_ajuste', tarefa({ review_hours: 2 } as Partial<OrgTask>));

    await usuario.type(campoDeHoras()!, '0');
    await usuario.type(screen.getByLabelText(/O que precisa ser ajustado/i), 'Zero não é hora');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar ajustes' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadDoDespacho()).toEqual({ status: 'em_ajuste' });
  });
});
