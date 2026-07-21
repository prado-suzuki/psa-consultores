import { describe, expect, it } from 'vitest';
import {
  appendTaskReference,
  buildDailyBlockerFields,
  createDailyFormDraft,
  hydrateDailyForm,
  type DailyFormDraft,
} from '@/lib/equipeDaily';
import type { DailyStandup } from '@/hooks/useDomainEquipeDaily';

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
