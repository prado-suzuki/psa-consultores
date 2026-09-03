import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DailyQuickStatusDialog } from '@/components/equipe/daily/DailyQuickStatusDialog';
import type { DailySprintTask } from '@/hooks/useDailySprintTasks';

Object.defineProperty(window, 'ResizeObserver', {
  configurable: true,
  value: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

const tasks: DailySprintTask[] = [
  {
    id: 'task-1',
    title: 'Apuração de créditos',
    task_code: 'TR-12',
    status: 'pending',
    parent_id: null,
    assigned_to: 'user-1',
    estimated_hours: 4,
    actual_hours: null,
    completed_at: null,
  },
  {
    id: 'task-2',
    title: 'Revisar relatório',
    task_code: 'TR-20',
    status: 'in_progress',
    parent_id: 'task-1',
    assigned_to: 'user-1',
    estimated_hours: 3,
    actual_hours: null,
    completed_at: null,
  },
  {
    id: 'task-3',
    title: 'Tarefa já encerrada',
    task_code: 'TR-03',
    status: 'completed',
    parent_id: null,
    assigned_to: 'user-1',
    estimated_hours: 2,
    actual_hours: 2,
    completed_at: '2026-08-06T12:00:00.000Z',
  },
];

describe('DailyQuickStatusDialog', () => {
  it('filtra tarefas e exige horas realizadas antes de concluir', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);
    render(
      <DailyQuickStatusDialog
        open
        sprintName="Sprint Agosto"
        tasks={tasks}
        loading={false}
        updating={false}
        onOpenChange={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    await user.type(screen.getByPlaceholderText('Pesquisar por nome ou código...'), 'apuracao');
    expect(screen.getByText('Apuração de créditos')).toBeInTheDocument();
    expect(screen.queryByText('Revisar relatório')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Alterar Apuração de créditos para Concluído' }));
    expect(screen.getByText('4h estimadas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Concluir tarefa' }));
    expect(screen.getByText('Informe um valor igual ou maior que zero.')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Horas realizadas/), '3.5');
    await user.click(screen.getByRole('button', { name: 'Concluir tarefa' }));
    expect(onUpdate).toHaveBeenCalledWith(tasks[0], 'completed', 3.5);
  });

  it('agrupa concluídas no final e não oferece alteração de status para elas', () => {
    render(
      <DailyQuickStatusDialog
        open
        sprintName="Sprint Agosto"
        tasks={tasks}
        loading={false}
        updating={false}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getAllByText('A fazer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Em Andamento').length).toBeGreaterThan(0);
    // O rótulo do grupo passou a sair do mapa do entregável (03/09/2026), então ele
    // é o MESMO texto do botão de status de cada tarefa — daí `getAllByText`.
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);
    expect(screen.getByText('Tarefa já encerrada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Alterar Tarefa já encerrada/ })).not.toBeInTheDocument();
  });
});
