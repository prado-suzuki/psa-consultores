import type { OrgTask } from '@/hooks/useOrgTasks';
import type { TaskProfile } from '@/lib/orgTaskForm';

/**
 * Nome do revisor designado, para mostrar na tarefa.
 *
 * `reviewer_id` não se apaga quando a revisão acaba — fica na tarefa depois de
 * aprovada e depois de concluída. Por isso o nome só aparece enquanto a revisão
 * está de pé: em 'review' (está na mão do revisor) e em 'em_ajuste' (ele
 * devolveu, e é para ele que a tarefa volta). Fora desses dois status seria
 * anunciar como responsável alguém cujo trabalho já terminou.
 *
 * Devolve `null` também quando o perfil não resolve: enquanto `profiles_safe`
 * carrega é melhor não mostrar nada do que um rótulo de revisor sem nome, que
 * apareceria e mudaria sozinho.
 */
export function resolveActiveReviewerName(
  task: Pick<OrgTask, 'status' | 'reviewer_id'>,
  profiles: readonly TaskProfile[],
): string | null {
  if (!task.reviewer_id) return null;
  if (task.status !== 'review' && task.status !== 'em_ajuste') return null;

  const profile = profiles.find((candidate) => candidate.id === task.reviewer_id);
  if (!profile) return null;

  return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || null;
}
