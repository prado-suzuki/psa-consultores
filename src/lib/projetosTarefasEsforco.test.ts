import { describe, expect, it } from 'vitest';
import {
  agregarEsforco,
  esforcoDaTarefa,
  resumoEsforco,
  somarEsforco,
  type TarefaComEsforco,
} from '@/lib/projetosTarefasEsforco';

const tarefa = (overrides: Partial<TarefaComEsforco> = {}): TarefaComEsforco => ({
  status: 'todo',
  estimated_hours: null,
  actual_hours: null,
  ...overrides,
});

describe('esforcoDaTarefa', () => {
  it('acusa a tarefa concluída sem horas realizadas', () => {
    expect(esforcoDaTarefa(tarefa({ status: 'done', estimated_hours: 4 }))).toMatchObject({
      estado: 'sem_apontamento',
      label: 'Sem horas',
    });
  });

  it('trata zero como não apontado — 0h concluída continua pendente', () => {
    expect(esforcoDaTarefa(tarefa({ status: 'done', actual_hours: 0 })).estado).toBe(
      'sem_apontamento',
    );
  });

  it('mostra realizadas sobre estimadas quando as duas existem', () => {
    expect(esforcoDaTarefa(tarefa({ status: 'done', estimated_hours: 4, actual_hours: 6.5 }))).toMatchObject({
      estado: 'apontado',
      label: '6,5h / 4h',
    });
  });

  it('mostra só as realizadas quando não há estimativa', () => {
    expect(esforcoDaTarefa(tarefa({ actual_hours: 3 })).label).toBe('3h');
  });

  it('mostra a estimativa enquanto a tarefa não é apontada', () => {
    expect(esforcoDaTarefa(tarefa({ status: 'in_progress', estimated_hours: 8 }))).toMatchObject({
      estado: 'estimado',
      label: '8h est.',
    });
  });

  it('não cobra horas de tarefa aberta e sem estimativa', () => {
    expect(esforcoDaTarefa(tarefa())).toMatchObject({ estado: 'vazio', label: '—' });
  });
});

describe('agregarEsforco', () => {
  it('conta as concluídas sem horas e soma as realizadas', () => {
    const esforco = agregarEsforco([
      tarefa({ status: 'done', actual_hours: 2 }),
      tarefa({ status: 'done' }),
      tarefa({ status: 'done', actual_hours: 0 }),
      tarefa({ status: 'in_progress', actual_hours: 1.5 }),
      tarefa({ status: 'todo', estimated_hours: 10 }),
    ]);

    expect(esforco).toEqual({ concluidasSemHoras: 2, horasRealizadas: 3.5 });
  });

  it('soma partes de projetos diferentes', () => {
    expect(
      somarEsforco([
        { concluidasSemHoras: 1, horasRealizadas: 2 },
        { concluidasSemHoras: 2, horasRealizadas: 0.5 },
      ]),
    ).toEqual({ concluidasSemHoras: 3, horasRealizadas: 2.5 });
  });
});

describe('resumoEsforco', () => {
  it('a pendência vem antes do total de horas', () => {
    expect(resumoEsforco({ concluidasSemHoras: 3, horasRealizadas: 40 })).toMatchObject({
      estado: 'sem_apontamento',
      label: '3 sem horas',
    });
  });

  it('sem pendência, mostra o total realizado', () => {
    expect(resumoEsforco({ concluidasSemHoras: 0, horasRealizadas: 12.5 })).toMatchObject({
      estado: 'apontado',
      label: '12,5h',
    });
  });

  it('sem nada apontado, fica neutro', () => {
    expect(resumoEsforco({ concluidasSemHoras: 0, horasRealizadas: 0 }).label).toBe('—');
  });
});
