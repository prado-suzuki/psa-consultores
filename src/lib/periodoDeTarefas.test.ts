import { describe, expect, it } from 'vitest';
import { passoDeMes, tarefasNoPeriodo, tituloDoMes } from '@/lib/periodoDeTarefas';
import type { OrgTask } from '@/hooks/useOrgTasks';

const tarefa = (id: string, due_date: string | null): OrgTask =>
  ({ id, title: id, due_date, status: 'todo' }) as OrgTask;

const AGOSTO = new Date(2026, 7, 1);

describe('tituloDoMes', () => {
  it('usa o formato do Gantt, e devolve o mês em minúscula', () => {
    // A maiúscula da primeira letra é da `BarraDePeriodo`, não daqui — é ela
    // que sabe que o título dela começa frase.
    expect(tituloDoMes(AGOSTO)).toBe('agosto de 2026');
  });
});

describe('passoDeMes', () => {
  it('anda para os dois lados e vira o ano', () => {
    expect(tituloDoMes(passoDeMes(AGOSTO, 1))).toBe('setembro de 2026');
    expect(tituloDoMes(passoDeMes(new Date(2026, 0, 1), -1))).toBe('dezembro de 2025');
  });
});

describe('tarefasNoPeriodo', () => {
  it('mantém só quem vence no mês', () => {
    const tarefas = [
      tarefa('julho', '2026-07-31'),
      tarefa('agosto-1', '2026-08-01'),
      tarefa('agosto-31', '2026-08-31'),
      tarefa('setembro', '2026-09-01'),
    ];

    expect(tarefasNoPeriodo(tarefas, AGOSTO).map(t => t.id)).toEqual(['agosto-1', 'agosto-31']);
  });

  it('tarefa sem prazo entra em todo mês', () => {
    // Se a Lista e a Tabela a escondessem, ela não apareceria em aba nenhuma:
    // Calendário e Gantt já dependem de `due_date`. Ver o comentário da função.
    const tarefas = [tarefa('sem-prazo', null), tarefa('setembro', '2026-09-01')];

    expect(tarefasNoPeriodo(tarefas, AGOSTO).map(t => t.id)).toEqual(['sem-prazo']);
    expect(tarefasNoPeriodo(tarefas, new Date(2026, 11, 1)).map(t => t.id)).toEqual(['sem-prazo']);
  });

  it('o mês compara ano também', () => {
    const tarefas = [tarefa('agosto-2025', '2025-08-15'), tarefa('agosto-2026', '2026-08-15')];

    expect(tarefasNoPeriodo(tarefas, AGOSTO).map(t => t.id)).toEqual(['agosto-2026']);
  });
});
