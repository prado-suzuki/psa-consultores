import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgTask } from '@/hooks/useOrgTasks';
import { TaskFutureView } from '@/components/equipe/fiscal/tasks/TaskFutureView';

/** Uma quarta-feira: a semana dela vai de domingo 09 a sábado 15 de agosto. */
const QUARTA_12_DE_AGOSTO = new Date(2026, 7, 12, 9, 0, 0);

const tarefa = (title: string, due_date: string): OrgTask =>
  ({
    id: title,
    title,
    due_date,
    status: 'todo',
    priority: 'media',
    assigned_to: null,
    assigned_to_name: null,
    tags: [],
    category: 'fiscal',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  }) as unknown as OrgTask;

const noop = () => {};

describe('TaskFutureView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(QUARTA_12_DE_AGOSTO);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dentro da semana, lista da mais próxima para a mais distante', () => {
    // Entram fora de ordem de propósito: a aba herdava a ordem da consulta, e
    // era dentro do grupo que ela se perdia — os grupos de semana já saíam
    // certos. Ver `ordenarPorVencimento`.
    render(
      <TaskFutureView
        tasks={[
          tarefa('Vence 15 de agosto', '2026-08-15'),
          tarefa('Vence 13 de agosto', '2026-08-13'),
          tarefa('Vence 14 de agosto', '2026-08-14'),
        ]}
        onEdit={noop}
        onDelete={noop}
        onReassign={noop}
      />,
    );

    const titulos = screen.getAllByText(/^Vence \d/).map(no => no.textContent);
    expect(titulos).toEqual([
      'Vence 13 de agosto',
      'Vence 14 de agosto',
      'Vence 15 de agosto',
    ]);
  });

  it('a ordem atravessa os grupos de semana', () => {
    // Titulos que nao repetem rotulo de grupo ("Esta semana", "Proxima
    // semana"), senao a busca por texto pega o cabecalho junto.
    render(
      <TaskFutureView
        tasks={[
          tarefa('Vence 02 de setembro', '2026-09-02'),
          tarefa('Vence 14 de agosto', '2026-08-14'),
          tarefa('Vence 18 de agosto', '2026-08-18'),
        ]}
        onEdit={noop}
        onDelete={noop}
        onReassign={noop}
      />,
    );

    const titulos = screen.getAllByText(/^Vence \d/).map(no => no.textContent);
    expect(titulos).toEqual([
      'Vence 14 de agosto',
      'Vence 18 de agosto',
      'Vence 02 de setembro',
    ]);
  });
});
