import { describe, expect, it } from 'vitest';
import type { OrgTask } from '@/hooks/useOrgTasks';
import { canUpdateOrgTaskStatus, isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';

type StatusTarget = Pick<
  OrgTask,
  'assigned_to' | 'created_by' | 'reviewer_id' | 'status' | 'project_id'
>;

const target = (overrides: Partial<StatusTarget> = {}): StatusTarget => ({
  assigned_to: 'outra-pessoa',
  created_by: 'outra-pessoa',
  reviewer_id: null,
  status: 'todo',
  project_id: 'projeto-1',
  ...overrides,
});

describe('isDelegatedOrgTaskReviewer', () => {
  it('reconhece o revisor que não é o responsável', () => {
    expect(isDelegatedOrgTaskReviewer({ assigned_to: 'ana', reviewer_id: 'bia' }, 'bia')).toBe(true);
  });

  it('não considera revisor quem revisa a própria tarefa', () => {
    expect(isDelegatedOrgTaskReviewer({ assigned_to: 'bia', reviewer_id: 'bia' }, 'bia')).toBe(false);
  });
});

describe('canUpdateOrgTaskStatus', () => {
  it('libera admin', () => {
    expect(canUpdateOrgTaskStatus(target(), { userId: 'ana', isAdmin: true })).toBe(true);
  });

  it('libera líder e sublíder quando a tarefa tem projeto', () => {
    expect(canUpdateOrgTaskStatus(target(), { userId: 'ana', isLider: true })).toBe(true);
    expect(canUpdateOrgTaskStatus(target(), { userId: 'ana', isSublider: true })).toBe(true);
  });

  it('não libera líder em tarefa sem projeto (a RLS exige project_id)', () => {
    expect(
      canUpdateOrgTaskStatus(target({ project_id: null }), { userId: 'ana', isLider: true }),
    ).toBe(false);
  });

  it('libera o responsável e o criador', () => {
    expect(canUpdateOrgTaskStatus(target({ assigned_to: 'ana' }), { userId: 'ana' })).toBe(true);
    expect(canUpdateOrgTaskStatus(target({ created_by: 'ana' }), { userId: 'ana' })).toBe(true);
  });

  it('libera o revisor só enquanto a tarefa está em revisão', () => {
    expect(
      canUpdateOrgTaskStatus(target({ reviewer_id: 'ana', status: 'review' }), { userId: 'ana' }),
    ).toBe(true);
    expect(
      canUpdateOrgTaskStatus(target({ reviewer_id: 'ana', status: 'todo' }), { userId: 'ana' }),
    ).toBe(false);
  });

  it('nega membro comum em tarefa de outra pessoa e usuário sem sessão', () => {
    expect(canUpdateOrgTaskStatus(target(), { userId: 'ana' })).toBe(false);
    expect(canUpdateOrgTaskStatus(target({ assigned_to: 'ana' }), { userId: null })).toBe(false);
  });
});
