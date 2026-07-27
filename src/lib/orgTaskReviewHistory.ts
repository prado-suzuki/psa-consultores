import type { OrgTaskComment } from '@/hooks/useOrgTasks';

/**
 * Leitura do histórico de revisão a partir dos comentários de sistema da
 * tarefa. Os eventos não têm tabela própria: são inferidos do prefixo do texto
 * gravado por `buildReviewSystemComment` (ver `@/lib/orgTaskForm`).
 */

export type ReviewEventType = 'submitted' | 'adjustments' | 'approved';

export interface ReviewEvent extends OrgTaskComment {
  type: ReviewEventType;
}

export function getReviewEventType(comment: string): ReviewEventType | null {
  if (comment.startsWith('Enviado para revisão')) return 'submitted';
  if (comment.startsWith('Devolvido para ajustes')) return 'adjustments';
  if (comment === 'Tarefa aprovada') return 'approved';
  return null;
}

/** Texto do evento sem o prefixo; aprovação não tem corpo. */
export function getReviewEventContent(comment: string, type: string): string {
  if (type === 'submitted') {
    return comment.replace(/^Enviado para revisão(?: de [^:]+)?:\s*/, '');
  }
  if (type === 'adjustments') {
    return comment.replace(/^Devolvido para ajustes:\s*/, '');
  }
  return '';
}

/** Mantém apenas comentários de sistema reconhecidos, na ordem recebida. */
export function buildReviewHistory(comments: readonly OrgTaskComment[]): ReviewEvent[] {
  return comments.flatMap((comment) => {
    const type = comment.is_system ? getReviewEventType(comment.comment) : null;
    return type ? [{ ...comment, type }] : [];
  });
}

export const reviewEventTitles: Record<ReviewEventType, string> = {
  submitted: 'Enviado para revisão',
  approved: 'Revisão aprovada',
  adjustments: 'Retornado para ajustes',
};
