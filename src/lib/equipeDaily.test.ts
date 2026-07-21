import { describe, expect, it } from 'vitest';
import {
  appendTaskReference,
  buildDailyBlockerFields,
  createDailyFormDraft,
  groupDailyTasksByParent,
  hydrateDailyForm,
  type DailyFormDraft,
} from '@/lib/equipeDaily';
import type { DailyStandup } from '@/hooks/useDomainEquipeDaily';

interface TestTask {
  id: string;
  title: string;
  task_code: string | null;
  status: string;
  parent_id: string | null;
}
const tk = (id: string, over: Partial<TestTask> = {}): TestTask => ({
  id,
  title: id,
  task_code: null,
  status: 'pending',
  parent_id: null,
  ...over,
});

const draft = (overrides: Partial<DailyFormDraft> = {}): DailyFormDraft => ({
  ...createDailyFormDraft(),
  ...overrides,
});

describe('buildDailyBlockerFields', () => {
  it('sem bloqueio: limpa o texto e NÃO envia as colunas novas (compatível com base pré-migração)', () => {
    expect(buildDailyBlockerFields(draft({ has_blocker: false, blockers: 'ignorar' }))).toEqual({
      blockers: null,
    });
  });

  it('com bloqueio sem tarefa/responsável: envia só o texto do bloqueio', () => {
    expect(
      buildDailyBlockerFields(draft({ has_blocker: true, blockers: 'acesso pendente' })),
    ).toEqual({ blockers: 'acesso pendente' });
  });

  it('com tarefa e responsável: inclui as colunas novas', () => {
    expect(
      buildDailyBlockerFields(
        draft({
          has_blocker: true,
          blockers: 'acesso pendente',
          blocked_deliverable_id: 'deliv-1',
          blocker_owner: 'TI',
        }),
      ),
    ).toEqual({
      blockers: 'acesso pendente',
      blocked_deliverable_id: 'deliv-1',
      blocker_owner: 'TI',
    });
  });
});

describe('appendTaskReference', () => {
  it('em texto vazio, vira a primeira linha (com código quando houver)', () => {
    expect(appendTaskReference('', { id: 'd1', title: 'Conciliação', task_code: 'T-3' })).toBe(
      '- [T-3] Conciliação',
    );
    expect(appendTaskReference('', { id: 'd2', title: 'Sem código', task_code: null })).toBe(
      '- Sem código',
    );
  });

  it('em texto existente, acrescenta em nova linha sem duplicar quebra', () => {
    expect(appendTaskReference('linha 1', { id: 'd1', title: 'Tarefa', task_code: 'T-1' })).toBe(
      'linha 1\n- [T-1] Tarefa',
    );
    expect(appendTaskReference('linha 1\n', { id: 'd1', title: 'Tarefa', task_code: 'T-1' })).toBe(
      'linha 1\n- [T-1] Tarefa',
    );
  });
});

describe('groupDailyTasksByParent', () => {
  it('agrupa filhas sob a mãe, joga concluídas pro fim e separa as avulsas', () => {
    const tasks = [
      tk('mae', { title: 'Sincronização' }),
      tk('f1', { title: 'Parte 1', parent_id: 'mae' }),
      tk('f2', { title: 'Parte 2', parent_id: 'mae', status: 'completed' }),
      tk('f3', { title: 'Parte 3', parent_id: 'mae' }),
      tk('avulsa', { title: 'Tarefa solta', task_code: '1' }),
    ];
    const groups = groupDailyTasksByParent(tasks);

    expect(groups).toHaveLength(2);
    expect(groups[0].header).toBe('Sincronização');
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['f1', 'f3', 'f2']); // concluída (f2) por último
    expect(groups[1].header).toBeNull();
    expect(groups[1].tasks.map((t) => t.id)).toEqual(['avulsa']);
  });

  it('filha cuja mãe não está na lista vira avulsa (não some)', () => {
    const tasks = [tk('orfa', { title: 'Órfã', parent_id: 'ausente' })];
    expect(groupDailyTasksByParent(tasks)).toEqual([{ header: null, tasks: [tasks[0]] }]);
  });

  it('usa código + título no cabeçalho da mãe quando há código', () => {
    const tasks = [tk('mae', { title: 'Projeto X', task_code: 'P7' }), tk('f', { parent_id: 'mae' })];
    expect(groupDailyTasksByParent(tasks)[0].header).toBe('P7 Projeto X');
  });
});

describe('hydrateDailyForm — bloqueio', () => {
  const base: DailyStandup = {
    id: 's1',
    user_id: 'u1',
    date: '2026-07-21',
    did_yesterday: null,
    will_do_today: null,
    blockers: null,
    created_at: '2026-07-21T12:00:00.000Z',
    sprint_id: null,
    project_id: null,
    process_id: null,
  };

  it('sem bloqueio: has_blocker falso', () => {
    expect(hydrateDailyForm(base).has_blocker).toBe(false);
  });

  it('com texto de bloqueio OU tarefa travada: has_blocker verdadeiro e campos preenchidos', () => {
    expect(hydrateDailyForm({ ...base, blockers: 'travou' }).has_blocker).toBe(true);
    const hydrated = hydrateDailyForm({
      ...base,
      blocked_deliverable_id: 'deliv-9',
      blocker_owner: 'cliente',
    });
    expect(hydrated).toMatchObject({
      has_blocker: true,
      blocked_deliverable_id: 'deliv-9',
      blocker_owner: 'cliente',
    });
  });
});
