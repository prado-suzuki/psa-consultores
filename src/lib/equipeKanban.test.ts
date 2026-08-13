import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildDeliverableStatusPayload,
  buildDeliverableUpdatePayload,
  buildEquipeKanbanFilePath,
  buildEquipeKanbanHierarchy,
  countOpenSubtasksOutsideTodoColumn,
  filterEquipeKanbanDeliverables,
  getEquipeKanbanColumnDeliverables,
  getEquipeKanbanErrorMessage,
  getEquipeKanbanSubtasks,
  hasOpenSubtasksUnderCompletedParent,
  hidesOpenSubtasksOutsideItsColumn,
  selectEquipeKanbanVisibleDeliverables,
  validateEquipeKanbanFile,
  type EquipeKanbanDeliverable,
  type EquipeKanbanFilters,
} from '@/lib/equipeKanban';

const deliverable = (
  id: string,
  overrides: Partial<EquipeKanbanDeliverable> = {},
): EquipeKanbanDeliverable => ({
  id,
  title: id,
  description: null,
  status: 'pending',
  assigned_to: null,
  sprint_id: null,
  estimated_hours: null,
  due_date: null,
  start_date: null,
  parent_id: null,
  task_code: null,
  ...overrides,
});

const filters = (overrides: Partial<EquipeKanbanFilters> = {}): EquipeKanbanFilters => ({
  sprint: 'all',
  responsible: 'all',
  project: 'all',
  process: 'all',
  startDate: undefined,
  endDate: undefined,
  ...overrides,
});

afterEach(() => vi.useRealTimers());

describe('equipeKanban', () => {
  it('combina filtros e preserva a peculiaridade de processo representar o projeto da sprint', () => {
    const items = [
      deliverable('match', {
        sprint_id: 'sprint-a',
        assigned_to: 'user-a',
        start_date: '2026-07-02',
        due_date: '2026-07-20',
      }),
      deliverable('same-project', { sprint_id: 'sprint-b', assigned_to: 'user-a' }),
      deliverable('other-project', { sprint_id: 'sprint-c', assigned_to: 'user-a' }),
    ];
    const sprints = [
      { id: 'sprint-a', name: 'A', project_id: 'project-a' },
      { id: 'sprint-b', name: 'B', project_id: 'project-a' },
      { id: 'sprint-c', name: 'C', project_id: 'project-c' },
    ];
    const processes = [{ id: 'process-a', name: 'Processo A', project_id: 'project-a' }];

    expect(
      filterEquipeKanbanDeliverables(
        items,
        sprints,
        processes,
        filters({ process: 'process-a' }),
      ).map(({ id }) => id),
    ).toEqual(['match', 'same-project']);
    expect(
      filterEquipeKanbanDeliverables(
        items,
        sprints,
        processes,
        filters({
          sprint: 'sprint-a',
          responsible: 'user-a',
          project: 'project-a',
          process: 'process-a',
          startDate: new Date('2026-07-01T00:00:00'),
          endDate: new Date('2026-07-31T00:00:00'),
        }),
      ).map(({ id }) => id),
    ).toEqual(['match']);
    expect(
      filterEquipeKanbanDeliverables(items, sprints, processes, filters({ process: 'missing' })),
    ).toEqual([]);
  });

  it('monta raízes, faz órfã (mãe ausente) aparecer como raiz para não sumir, e ordena subtarefas por código', () => {
    const items = [
      deliverable('child-10', {
        parent_id: 'parent',
        task_code: 'T-10',
        status: 'completed',
        estimated_hours: 4,
      }),
      deliverable('orphan', { parent_id: 'absent', task_code: 'T-1' }),
      deliverable('parent', { task_code: 'T-0', estimated_hours: 99 }),
      deliverable('child-2', { parent_id: 'parent', task_code: 'T-2', estimated_hours: 2.5 }),
    ];

    const hierarchy = buildEquipeKanbanHierarchy(items);
    // parent (T-0) + orphan (mãe 'absent' não está na lista → vira raiz p/ não sumir), por código.
    expect(hierarchy.map((root) => root.id)).toEqual(['parent', 'orphan']);

    const parent = hierarchy.find((root) => root.id === 'parent')!;
    // subtaskHoursTotal soma só as folhas (6.5), ignorando as horas próprias da mãe (99).
    expect(parent).toMatchObject({ subtaskCount: 2, completedSubtasks: 1, subtaskHoursTotal: 6.5 });
    expect(parent.subtasks.map(({ id }) => id)).toEqual(['child-2', 'child-10']);
    expect(parent.subtasks.every((subtask) => subtask.depth === 0)).toBe(true);

    expect(hierarchy.find((root) => root.id === 'orphan')!.subtaskCount).toBe(0);
    expect(getEquipeKanbanSubtasks(items, 'parent').map(({ id }) => id)).toEqual([
      'child-2',
      'child-10',
    ]);
  });

  it('achata netas (2+ níveis) sob a raiz com profundidade e soma só as horas das folhas', () => {
    const items = [
      deliverable('root', { task_code: 'T-1', estimated_hours: 100 }),
      deliverable('child', { parent_id: 'root', task_code: 'T-1.1', estimated_hours: 50 }),
      deliverable('grand-a', {
        parent_id: 'child',
        task_code: 'T-1.1.1',
        estimated_hours: 3,
        status: 'completed',
      }),
      deliverable('grand-b', { parent_id: 'child', task_code: 'T-1.1.2', estimated_hours: 2 }),
      deliverable('leaf', { parent_id: 'root', task_code: 'T-1.2', estimated_hours: 4 }),
    ];

    const hierarchy = buildEquipeKanbanHierarchy(items);
    expect(hierarchy).toHaveLength(1);
    const root = hierarchy[0];

    // Descendentes achatados em DFS por código, com profundidade (neta = 1).
    expect(root.subtasks.map(({ id }) => id)).toEqual(['child', 'grand-a', 'grand-b', 'leaf']);
    expect(root.subtasks.map(({ depth }) => depth)).toEqual([0, 1, 1, 0]);
    expect(root.subtaskCount).toBe(4);
    expect(root.completedSubtasks).toBe(1);
    // Horas do ramo = só folhas: 3 + 2 + 4 = 9 (ignora root 100 e a sub-mãe child 50).
    expect(root.subtaskHoursTotal).toBe(9);

    const child = root.subtasks.find((subtask) => subtask.id === 'child')!;
    expect(child.hasChildren).toBe(true);
    expect(child.hoursDisplay).toBe(5); // soma das folhas do ramo do child (3 + 2)
    const leaf = root.subtasks.find((subtask) => subtask.id === 'leaf')!;
    expect(leaf.hasChildren).toBe(false);
    expect(leaf.hoursDisplay).toBe(4); // horas próprias (é folha)
  });

  it('marca mãe concluída que ainda esconde subtarefa aberta e ignora as demais', () => {
    const hierarchy = buildEquipeKanbanHierarchy([
      deliverable('mae-concluida', { task_code: 'TAX-0', status: 'completed' }),
      deliverable('sub-feita', {
        parent_id: 'mae-concluida',
        task_code: 'TAX-02',
        status: 'completed',
      }),
      deliverable('sub-aberta', { parent_id: 'mae-concluida', task_code: 'TAX-03' }),
      deliverable('mae-quitada', { task_code: 'GED-0', status: 'completed' }),
      deliverable('sub-quitada', {
        parent_id: 'mae-quitada',
        task_code: 'GED-01',
        status: 'completed',
      }),
      deliverable('mae-aberta', { task_code: 'PLT-0' }),
      deliverable('sub-da-aberta', { parent_id: 'mae-aberta', task_code: 'PLT-01' }),
    ]);
    const byId = (id: string) => hierarchy.find((root) => root.id === id)!;

    expect(byId('mae-concluida')).toMatchObject({ openSubtasks: 1, completedSubtasks: 1 });
    expect(hasOpenSubtasksUnderCompletedParent(byId('mae-concluida'))).toBe(true);
    // Tudo concluído: nada escondido.
    expect(hasOpenSubtasksUnderCompletedParent(byId('mae-quitada'))).toBe(false);
    // Mãe aberta fica na coluna certa por si só — não precisa de alerta.
    expect(hasOpenSubtasksUnderCompletedParent(byId('mae-aberta'))).toBe(false);
    expect(byId('mae-aberta').openSubtasks).toBe(1);
    // A mãe concluída continua na coluna "Concluído" (subtarefa segue aninhada, sem card solto).
    expect(
      getEquipeKanbanColumnDeliverables(hierarchy, 'completed', null).map(({ id }) => id),
    ).toEqual(['mae-quitada', 'mae-concluida']);
    expect(getEquipeKanbanColumnDeliverables(hierarchy, 'pending', null).map(({ id }) => id)).toEqual(
      ['mae-aberta'],
    );
  });

  it('traz o grupo inteiro quando a mãe bate no filtro e sobe a cadeia quando é a filha que bate', () => {
    const items = [
      deliverable('mae-do-alexandre', { assigned_to: 'alexandre' }),
      deliverable('sub-sem-responsavel', { parent_id: 'mae-do-alexandre' }),
      deliverable('sub-de-outro', { parent_id: 'mae-do-alexandre', assigned_to: 'bruna' }),
      deliverable('neta-sem-responsavel', { parent_id: 'sub-sem-responsavel' }),
      deliverable('mae-da-bruna', { assigned_to: 'bruna' }),
      deliverable('sub-do-alexandre', { parent_id: 'mae-da-bruna', assigned_to: 'alexandre' }),
      deliverable('sub-irma-de-outro', { parent_id: 'mae-da-bruna', assigned_to: 'bruna' }),
      deliverable('nada-a-ver', { assigned_to: 'carla' }),
    ];
    const visible = selectEquipeKanbanVisibleDeliverables(
      items,
      new Set(['mae-do-alexandre', 'sub-do-alexandre']),
    ).map(({ id }) => id);

    // Mãe é agrupador: entrou na visão, então filhas e netas entram com ela (mesmo sem dono).
    expect(visible).toContain('sub-sem-responsavel');
    expect(visible).toContain('sub-de-outro');
    expect(visible).toContain('neta-sem-responsavel');
    // Filha que bateu no filtro puxa a mãe pra continuar aninhada...
    expect(visible).toContain('mae-da-bruna');
    // ...mas não puxa as irmãs dela, que são de outra pessoa.
    expect(visible).not.toContain('sub-irma-de-outro');
    expect(visible).not.toContain('nada-a-ver');
  });

  // Mãe do Eduardo (em progresso) com filha do Alexandre (a fazer), filtrando por Alexandre.
  const maeDeOutraPessoa = () => [
    deliverable('mae-eduardo', { assigned_to: 'eduardo', status: 'in_progress', task_code: 'X-0' }),
    deliverable('filha-alexandre', {
      parent_id: 'mae-eduardo',
      assigned_to: 'alexandre',
      task_code: 'X-01',
    }),
  ];

  it('sem filtro de pessoa, a filha fica aninhada e o card vai pra coluna da MÃE', () => {
    const visible = selectEquipeKanbanVisibleDeliverables(
      maeDeOutraPessoa(),
      new Set(['filha-alexandre']),
    );
    expect(visible.map(({ id }) => id).sort()).toEqual(['filha-alexandre', 'mae-eduardo']);

    const hierarchy = buildEquipeKanbanHierarchy(visible);
    expect(hierarchy.map(({ id }) => id)).toEqual(['mae-eduardo']);
    expect(hierarchy[0].subtasks.map(({ id }) => id)).toEqual(['filha-alexandre']);
    // Card em "Em Progresso" (status da mãe): nada em "A Fazer" — daí o aviso na barra de filtros.
    expect(getEquipeKanbanColumnDeliverables(hierarchy, 'in_progress', null)).toHaveLength(1);
    expect(getEquipeKanbanColumnDeliverables(hierarchy, 'pending', null)).toHaveLength(0);
    expect(countOpenSubtasksOutsideTodoColumn(hierarchy)).toBe(1);
  });

  it('com filtro de pessoa, a filha vira card próprio na coluna do PRÓPRIO status', () => {
    const visible = selectEquipeKanbanVisibleDeliverables(
      maeDeOutraPessoa(),
      new Set(['filha-alexandre']),
      { keepAncestors: false },
    );
    // A mãe do Eduardo sai da visão — ela é só agrupador, virou etiqueta no card.
    expect(visible.map(({ id }) => id)).toEqual(['filha-alexandre']);

    const hierarchy = buildEquipeKanbanHierarchy(visible);
    expect(getEquipeKanbanColumnDeliverables(hierarchy, 'pending', null).map(({ id }) => id)).toEqual(
      ['filha-alexandre'],
    );
    expect(getEquipeKanbanColumnDeliverables(hierarchy, 'in_progress', null)).toHaveLength(0);
  });

  it('não entra em laço quando o dado tem ciclo de parent_id', () => {
    const items = [
      deliverable('a', { parent_id: 'b' }),
      deliverable('b', { parent_id: 'a' }),
      deliverable('solta'),
    ];
    expect(
      selectEquipeKanbanVisibleDeliverables(items, new Set(['a'])).map(({ id }) => id).sort(),
    ).toEqual(['a', 'b']);
  });

  it('joga status fora das três colunas (e nulo) em "A Fazer" em vez de sumir do quadro', () => {
    const hierarchy = buildEquipeKanbanHierarchy([
      deliverable('sem-status', { status: null as unknown as string }),
      deliverable('status-estranho', { status: 'a_fazer' }),
      deliverable('pendente'),
      deliverable('andando', { status: 'in_progress' }),
      deliverable('feita', { status: 'completed' }),
    ]);
    const columnIds = (columnId: string) =>
      getEquipeKanbanColumnDeliverables(hierarchy, columnId, null).map(({ id }) => id);

    expect(columnIds('pending').sort()).toEqual(['pendente', 'sem-status', 'status-estranho']);
    expect(columnIds('in_progress')).toEqual(['andando']);
    expect(columnIds('completed')).toEqual(['feita']);
    // Nada fica de fora das três colunas.
    expect(
      columnIds('pending').length + columnIds('in_progress').length + columnIds('completed').length,
    ).toBe(hierarchy.length);
  });

  it('conta subtarefa aberta presa em mãe fora de "A Fazer" (em progresso ou concluída)', () => {
    const hierarchy = buildEquipeKanbanHierarchy([
      deliverable('mae-andando', { task_code: 'TAX-0', status: 'in_progress' }),
      deliverable('sub-a-fazer', { parent_id: 'mae-andando', task_code: 'TAX-01' }),
      deliverable('sub-feita', {
        parent_id: 'mae-andando',
        task_code: 'TAX-02',
        status: 'completed',
      }),
      deliverable('mae-concluida', { task_code: 'GED-0', status: 'completed' }),
      deliverable('sub-esquecida', { parent_id: 'mae-concluida', task_code: 'GED-01' }),
      deliverable('mae-a-fazer', { task_code: 'PLT-0' }),
      deliverable('sub-da-a-fazer', { parent_id: 'mae-a-fazer', task_code: 'PLT-01' }),
    ]);
    const byId = (id: string) => hierarchy.find((root) => root.id === id)!;

    expect(hidesOpenSubtasksOutsideItsColumn(byId('mae-andando'))).toBe(true);
    expect(hidesOpenSubtasksOutsideItsColumn(byId('mae-concluida'))).toBe(true);
    // Mãe em "A Fazer": a subtarefa aberta já está na mesma coluna, não há o que avisar.
    expect(hidesOpenSubtasksOutsideItsColumn(byId('mae-a-fazer'))).toBe(false);
    expect(countOpenSubtasksOutsideTodoColumn(hierarchy)).toBe(2);
  });

  it('ordena vencimentos e mantém data nula no fim em asc e no início em desc', () => {
    const hierarchy = buildEquipeKanbanHierarchy([
      deliverable('null-date'),
      deliverable('later', { due_date: '2026-08-10' }),
      deliverable('earlier', { due_date: '2026-07-10' }),
      deliverable('other-column', { status: 'completed', due_date: '2026-01-01' }),
    ]);

    expect(
      getEquipeKanbanColumnDeliverables(hierarchy, 'pending', 'asc').map(({ id }) => id),
    ).toEqual(['earlier', 'later', 'null-date']);
    expect(
      getEquipeKanbanColumnDeliverables(hierarchy, 'pending', 'desc').map(({ id }) => id),
    ).toEqual(['null-date', 'later', 'earlier']);
  });

  it('gera payloads de status e salvamento com completed_at somente nas transições corretas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
    const form = {
      title: 'Entrega',
      description: '',
      assigned_to: '',
      status: 'completed',
      start_date: '',
      due_date: '2026-07-31',
      estimated_hours: '2.5',
      actual_hours: '',
    };

    expect(buildDeliverableStatusPayload('completed')).toEqual({
      status: 'completed',
      completed_at: '2026-07-17T12:00:00.000Z',
    });
    expect(buildDeliverableStatusPayload('pending')).toEqual({
      status: 'pending',
      completed_at: null,
    });
    expect(buildDeliverableUpdatePayload(form, 'pending')).toEqual({
      title: 'Entrega',
      description: null,
      assigned_to: null,
      status: 'completed',
      start_date: null,
      due_date: '2026-07-31',
      estimated_hours: 2.5,
      actual_hours: null,
      completed_at: '2026-07-17T12:00:00.000Z',
    });
    expect(
      buildDeliverableUpdatePayload({ ...form, status: 'in_progress' }, 'completed').completed_at,
    ).toBeNull();
    expect(buildDeliverableUpdatePayload(form, 'completed')).not.toHaveProperty('completed_at');
  });

  it('valida tipo antes do tamanho, aceita o limite e cria caminho com timestamp e extensão', () => {
    const invalidLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'malware.exe', {
      type: 'x/exe',
    });
    const tooLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {
      type: 'application/pdf',
    });
    const allowed = new File([new Uint8Array(10 * 1024 * 1024)], 'report.final.PDF', {
      type: 'application/pdf',
    });
    // Markdown e texto: o navegador manda mime vazio ou 'text/plain' conforme o
    // sistema, então quem decide é a extensão.
    const markdownSemMime = new File(['# retro'], 'retrospectiva.md', { type: '' });
    const markdownComoTexto = new File(['# retro'], 'retrospectiva.markdown', {
      type: 'text/plain',
    });
    // Sem ponto no nome não há extensão para montar o caminho no bucket.
    const semExtensao = new File(['conteudo'], 'anexo', { type: 'application/pdf' });
    expect(validateEquipeKanbanFile(invalidLarge)).toContain('Tipo de arquivo');
    expect(validateEquipeKanbanFile(tooLarge)).toBe('Arquivo muito grande. Máximo 10MB.');
    expect(validateEquipeKanbanFile(allowed)).toBeNull();
    expect(validateEquipeKanbanFile(markdownSemMime)).toBeNull();
    expect(validateEquipeKanbanFile(markdownComoTexto)).toBeNull();
    expect(validateEquipeKanbanFile(semExtensao)).toContain('Tipo de arquivo');

    vi.useFakeTimers();
    vi.setSystemTime(1234);
    expect(buildEquipeKanbanFilePath('delivery-1', allowed)).toBe('delivery-1/1234.PDF');
  });

  it('extrai somente mensagem textual não vazia e usa fallback nos demais erros', () => {
    expect(getEquipeKanbanErrorMessage(new Error('negado pelo RLS'), 'fallback')).toBe(
      'negado pelo RLS',
    );
    expect(getEquipeKanbanErrorMessage({ message: '' }, 'fallback')).toBe('fallback');
    expect(getEquipeKanbanErrorMessage({ message: 42 }, 'fallback')).toBe('fallback');
    expect(getEquipeKanbanErrorMessage('erro', 'fallback')).toBe('fallback');
  });

});
