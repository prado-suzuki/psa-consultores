import { describe, expect, it } from 'vitest';
import {
  buildTaskHierarchy,
  clampDatesToSprint,
  collectDeliverableSubtree,
  describeMoveEffect,
} from '@/lib/equipeSprintDetalhes';
import type { SprintDetalhesDeliverable } from '@/hooks/useDomainEquipeSprintDetalhes';

const deliverable = (
  id: string,
  overrides: Partial<SprintDetalhesDeliverable> = {},
): SprintDetalhesDeliverable => ({
  id,
  title: id,
  description: null,
  assigned_to: null,
  start_date: null,
  due_date: '2026-07-27',
  status: 'pending',
  estimated_hours: null,
  parent_id: null,
  task_code: null,
  project_id: null,
  process_id: null,
  ...overrides,
});

const sprintWindow = { start_date: '2026-08-03', end_date: '2026-08-07' };

describe('buildTaskHierarchy', () => {
  it('aninha subtarefa sob a mãe presente na lista', () => {
    const roots = buildTaskHierarchy([
      deliverable('mae'),
      deliverable('filha', { parent_id: 'mae', task_code: '1' }),
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('mae');
    expect(roots[0].subtaskCount).toBe(1);
  });

  it('promove a raiz a subtarefa cuja mãe não está na lista, para ela não desaparecer da tela', () => {
    // Caso criado pelo move entre sprints: a filha veio para esta sprint e a mãe ficou na outra.
    // Antes da correção a filha não era raiz e não tinha mãe para ser pendurada: sumia da aba.
    const roots = buildTaskHierarchy([
      deliverable('filha-orfa', { parent_id: 'mae-em-outra-sprint' }),
    ]);

    expect(roots.map((item) => item.id)).toEqual(['filha-orfa']);
    expect(roots[0].subtaskCount).toBe(0);
  });

  it('promove a mãe intermediária quando a avó não está na lista, sem perder a neta', () => {
    const roots = buildTaskHierarchy([
      deliverable('mae-intermediaria', { parent_id: 'avo-ausente' }),
      deliverable('neta', { parent_id: 'mae-intermediaria' }),
    ]);

    expect(roots.map((item) => item.id)).toEqual(['mae-intermediaria']);
    expect(roots[0].subtaskCount).toBe(1);
  });

  it('CARACTERIZAÇÃO: totalHours soma mãe + filhas e duplica quando a mãe guarda o agregado', () => {
    // Comportamento preexistente, mantido de propósito. Na base real a mãe guarda a soma das
    // filhas em estimated_hours (20 de 23 mães da Sprint 10), então este número sai dobrado.
    // Corrigir aqui mudaria valor exibido sem relação com o move: fica registrado, não corrigido.
    const roots = buildTaskHierarchy([
      deliverable('mae', { estimated_hours: 8 }),
      deliverable('filha-a', { parent_id: 'mae', estimated_hours: 5 }),
      deliverable('filha-b', { parent_id: 'mae', estimated_hours: 3 }),
    ]);

    expect(roots[0].totalHours).toBe(16);
  });
});

describe('collectDeliverableSubtree', () => {
  it('devolve a raiz separada dos descendentes', () => {
    const subtree = collectDeliverableSubtree(
      [
        deliverable('mae'),
        deliverable('filha-a', { parent_id: 'mae' }),
        deliverable('filha-b', { parent_id: 'mae' }),
        deliverable('sem-relacao'),
      ],
      'mae',
    );

    expect(subtree.rootId).toBe('mae');
    expect(subtree.descendantIds.sort()).toEqual(['filha-a', 'filha-b']);
  });

  it('desce em todos os níveis sem repetir id', () => {
    const subtree = collectDeliverableSubtree(
      [
        deliverable('mae'),
        deliverable('filha', { parent_id: 'mae' }),
        deliverable('neta', { parent_id: 'filha' }),
        deliverable('bisneta', { parent_id: 'neta' }),
      ],
      'mae',
    );

    expect(subtree.descendantIds).toEqual(['filha', 'neta', 'bisneta']);
    expect(new Set(subtree.descendantIds).size).toBe(subtree.descendantIds.length);
  });

  it('folha sem filhos devolve lista de descendentes vazia', () => {
    const subtree = collectDeliverableSubtree([deliverable('folha')], 'folha');

    expect(subtree).toEqual({ rootId: 'folha', descendantIds: [] });
  });

  it('não entra em laço infinito quando o parent_id forma ciclo', () => {
    // O banco não impede ciclo. Sem o controle de visitados isto travaria o navegador.
    const subtree = collectDeliverableSubtree(
      [deliverable('a', { parent_id: 'b' }), deliverable('b', { parent_id: 'a' })],
      'a',
    );

    expect(subtree.descendantIds).toEqual(['b']);
  });
});

describe('clampDatesToSprint', () => {
  it('não altera datas que já cabem na janela da sprint', () => {
    const result = clampDatesToSprint(
      { start_date: '2026-08-04', due_date: '2026-08-06' },
      sprintWindow,
    );

    expect(result).toEqual({ start_date: '2026-08-04', due_date: '2026-08-06' });
  });

  it('traz para a janela a tarefa que está toda no passado, preservando a duração', () => {
    const result = clampDatesToSprint(
      { start_date: '2026-07-27', due_date: '2026-07-29' },
      sprintWindow,
    );

    expect(result).toEqual({ start_date: '2026-08-03', due_date: '2026-08-05' });
  });

  it('encosta no fim da sprint quando a duração não cabe na janela', () => {
    const result = clampDatesToSprint(
      { start_date: '2026-07-01', due_date: '2026-07-30' },
      sprintWindow,
    );

    expect(result).toEqual({ start_date: '2026-08-03', due_date: '2026-08-07' });
  });

  it('recua para dentro da janela a tarefa com prazo depois do fim da sprint', () => {
    const result = clampDatesToSprint(
      { start_date: '2026-08-20', due_date: '2026-08-22' },
      sprintWindow,
    );

    expect(result).toEqual({ start_date: '2026-08-05', due_date: '2026-08-07' });
  });

  it('ajusta só o início quando o prazo já está na janela', () => {
    const result = clampDatesToSprint(
      { start_date: '2026-07-20', due_date: '2026-08-05' },
      sprintWindow,
    );

    expect(result).toEqual({ start_date: '2026-08-03', due_date: '2026-08-05' });
  });

  it('preserva início nulo', () => {
    const result = clampDatesToSprint({ start_date: null, due_date: '2026-07-27' }, sprintWindow);

    expect(result).toEqual({ start_date: null, due_date: '2026-08-03' });
  });

  it('devolve as datas originais quando a janela da sprint é inconsistente', () => {
    const result = clampDatesToSprint(
      { start_date: '2026-07-27', due_date: '2026-07-29' },
      { start_date: '2026-08-07', end_date: '2026-08-03' },
    );

    expect(result).toEqual({ start_date: '2026-07-27', due_date: '2026-07-29' });
  });
});

describe('describeMoveEffect', () => {
  const base = {
    targetSprintName: '11_Sprint',
    detachingFromParentTitle: null,
    descendantCount: 0,
    currentDates: { start_date: '2026-08-04', due_date: '2026-08-06' },
    nextDates: { start_date: '2026-08-04', due_date: '2026-08-06' },
    crossProject: false,
  };

  it('descreve o move simples com uma frase só', () => {
    expect(describeMoveEffect(base)).toEqual(['A tarefa passa para a sprint "11_Sprint".']);
  });

  it('avisa que a subtarefa vira tarefa principal, citando a mãe', () => {
    const lines = describeMoveEffect({ ...base, detachingFromParentTitle: 'Área do Cliente' });

    expect(lines[1]).toBe(
      'Esta subtarefa deixa de ser subtarefa de "Área do Cliente" e passa a ser tarefa principal na sprint de destino.',
    );
  });

  it('conta as subtarefas que vão junto, no singular e no plural', () => {
    expect(describeMoveEffect({ ...base, descendantCount: 1 })).toContain(
      '1 subtarefa será movida junto.',
    );
    expect(describeMoveEffect({ ...base, descendantCount: 3 })).toContain(
      '3 subtarefas serão movidas junto.',
    );
  });

  it('mostra a mudança de prazo e de início em formato brasileiro', () => {
    const lines = describeMoveEffect({
      ...base,
      currentDates: { start_date: '2026-07-27', due_date: '2026-07-29' },
      nextDates: { start_date: '2026-08-03', due_date: '2026-08-05' },
    });

    expect(lines).toContain('O prazo passa de 29/07/2026 para 05/08/2026.');
    expect(lines).toContain('O início passa de 27/07/2026 para 03/08/2026.');
  });

  it('avisa que as datas das subtarefas também são ajustadas', () => {
    const lines = describeMoveEffect({ ...base, descendantCount: 2, adjustsSubtaskDates: true });

    expect(lines).toContain(
      'As datas das subtarefas também são encaixadas na janela da sprint de destino.',
    );
  });

  it('não fala de datas de subtarefa quando nenhuma precisa de ajuste', () => {
    const lines = describeMoveEffect({ ...base, descendantCount: 2 });

    expect(lines.some((line) => line.includes('datas das subtarefas'))).toBe(false);
  });

  it('avisa sobre perda de visibilidade quando a sprint destino é de outro projeto', () => {
    const lines = describeMoveEffect({ ...base, crossProject: true });

    expect(lines).toContain(
      'A sprint de destino é de outro projeto. Quem não tem acesso a esse projeto deixa de ver a tarefa.',
    );
  });
});
