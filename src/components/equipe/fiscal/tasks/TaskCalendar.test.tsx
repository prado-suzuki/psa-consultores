import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CELULAS, FECHA_A_GRADE, TaskCalendar } from '@/components/equipe/fiscal/tasks/TaskCalendar';
import { statusColors } from '@/lib/taskStatusColors';
import type { OrgTask } from '@/hooks/useOrgTasks';

/**
 * Agosto de 2026 começa num sábado e tem 31 dias: a primeira semana traz seis
 * dias de julho e a última, cinco de setembro. É o mês que mais expõe o buraco
 * que existia antes — o quadro só tinha os dias do próprio mês.
 */
const DENTRO_DE_AGOSTO_DE_2026 = new Date(2026, 7, 12, 9, 0, 0);

const tarefa = (over: Partial<OrgTask> = {}): OrgTask =>
  ({
    id: 'a1',
    title: 'Apurar ICMS de julho',
    description: null,
    status: 'in_progress',
    priority: 'media',
    assigned_to: null,
    assigned_to_name: 'Marina',
    reviewer_id: null,
    created_by: null,
    due_date: '2026-08-12',
    due_time: null,
    is_recurring: false,
    recurrence_type: null,
    category: 'fiscal',
    tags: [],
    estimated_hours: null,
    actual_hours: null,
    parent_task_id: null,
    start_date: null,
    project_id: null,
    client_id: null,
    contribuinte_id: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...over,
  }) as OrgTask;

const semAcoes = { onEdit: vi.fn(), onDelete: vi.fn(), onReassign: vi.fn() };

describe('TaskCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DENTRO_DE_AGOSTO_DE_2026);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fecha o mês em semanas inteiras', () => {
    render(<TaskCalendar tasks={[]} {...semAcoes} />);

    const quadro = screen.getByTestId('calendario-quadro');
    expect(quadro.children).toHaveLength(CELULAS);
  });

  it('a variante que apaga a borda da última linha segue o tamanho do quadro', () => {
    // Tailwind lê classe como texto, então o número dentro do `nth-child` é
    // literal e não pode ser montado a partir de `CELULAS`. Este é o único
    // lugar que prende os dois: mudar SEMANAS_NO_QUADRO sem mudar a classe
    // deixaria uma régua sobrando na base do card.
    expect(FECHA_A_GRADE).toContain(`nth-child(n+${CELULAS - 6})`);
  });

  it('mostra os dias do mês vizinho como contexto, sem oferecer clique', () => {
    render(<TaskCalendar tasks={[]} {...semAcoes} />);

    const deFora = screen.getAllByTestId('calendario-dia-de-fora');
    expect(deFora).toHaveLength(CELULAS - 31);
    // 27 de julho aparece na primeira linha; 1 de setembro, na última.
    expect(deFora.map(celula => celula.textContent)).toContain('27');
    deFora.forEach(celula => expect(celula.tagName).toBe('DIV'));
  });

  it('marca hoje com o primário da área, e não com um papel de status', () => {
    render(<TaskCalendar tasks={[]} {...semAcoes} />);

    const hoje = screen.getByTestId('calendario-hoje');
    expect(hoje).toHaveTextContent('12');
    expect(hoje.className).toContain('bg-primary');
    // `success` é o papel de "concluído": pintar hoje com ele dizia que o dia
    // estava feito. Ver o comentário no componente.
    expect(hoje.className).not.toContain('success');
  });

  it('a seta anda o mês e Hoje volta — a barra é a mesma do Gantt', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TaskCalendar tasks={[]} {...semAcoes} />);

    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Julho de 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();
  });

  it('a tarefa na célula veste o papel do status, que a área resolve', () => {
    render(<TaskCalendar tasks={[tarefa()]} {...semAcoes} />);

    const chip = screen.getByText('Apurar ICMS de julho');
    expect(chip.className).toContain(statusColors.in_progress.combined.split(' ')[0]);
    expect(chip.className).not.toMatch(/bg-(blue|green|purple|orange|pink|red|gray|slate)-/);
  });
});
