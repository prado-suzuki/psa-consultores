import { describe, expect, it } from 'vitest';
import type { OrgTask } from '@/hooks/useOrgTasks';
import type { TaskProfile } from '@/lib/orgTaskForm';
import { resolveActiveReviewerName } from '@/lib/orgTaskReviewer';

const profiles: TaskProfile[] = [
  { id: 'bia', first_name: 'Bia', last_name: 'Nunes' },
  { id: 'caio', first_name: 'Caio', last_name: null },
  { id: 'sem-nome', first_name: null, last_name: null },
];

const tarefa = (
  overrides: Partial<Pick<OrgTask, 'status' | 'reviewer_id'>> = {},
): Pick<OrgTask, 'status' | 'reviewer_id'> => ({
  status: 'review',
  reviewer_id: 'bia',
  ...overrides,
});

describe('resolveActiveReviewerName', () => {
  it('nomeia o revisor da tarefa em revisão', () => {
    expect(resolveActiveReviewerName(tarefa(), profiles)).toBe('Bia Nunes');
  });

  it('nomeia o revisor da tarefa devolvida para ajuste', () => {
    expect(resolveActiveReviewerName(tarefa({ status: 'em_ajuste' }), profiles)).toBe('Bia Nunes');
  });

  it('cala nos status em que a revisão não está de pé, mesmo com reviewer_id gravado', () => {
    for (const status of ['todo', 'in_progress', 'done', 'backlog'] as const) {
      expect(resolveActiveReviewerName(tarefa({ status }), profiles)).toBeNull();
    }
  });

  it('cala quando a tarefa não tem revisor', () => {
    expect(resolveActiveReviewerName(tarefa({ reviewer_id: null }), profiles)).toBeNull();
  });

  it('cala enquanto os perfis não chegaram', () => {
    expect(resolveActiveReviewerName(tarefa(), [])).toBeNull();
  });

  it('usa só o primeiro nome quando é o que existe', () => {
    expect(resolveActiveReviewerName(tarefa({ reviewer_id: 'caio' }), profiles)).toBe('Caio');
  });

  it('cala quando o perfil existe mas não tem nome', () => {
    expect(resolveActiveReviewerName(tarefa({ reviewer_id: 'sem-nome' }), profiles)).toBeNull();
  });
});
