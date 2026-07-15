import type { OrgTask } from '@/hooks/useOrgTasks';

export function isDelegatedOrgTaskReviewer(
  task: Pick<OrgTask, 'assigned_to' | 'reviewer_id'>,
  userId?: string | null,
) {
  return !!userId && task.reviewer_id === userId && task.assigned_to !== userId;
}
