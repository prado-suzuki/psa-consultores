import { CheckCircle2, RotateCcw, Save, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface TaskEditActionsProps {
  isSaving: boolean;
  /** O usuário atual é o revisor delegado desta tarefa. */
  isReviewer: boolean;
  /** A tarefa é do próprio usuário e ainda não está em revisão. */
  canSendForReview: boolean;
  onRequestAdjustments: () => void;
  onSendForReview: () => void;
  onApprove: () => void;
}

/**
 * Ações do modo edição, na barra do topo. Quem revisa aprova ou devolve; quem
 * executa salva ou envia para revisão.
 */
export function TaskEditActions({
  isSaving,
  isReviewer,
  canSendForReview,
  onRequestAdjustments,
  onSendForReview,
  onApprove,
}: TaskEditActionsProps) {
  if (isReviewer) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
          onClick={onRequestAdjustments}
          disabled={isSaving}
        >
          <RotateCcw className="h-4 w-4" />
          Solicitar ajustes
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={isSaving}
          onClick={onApprove}
        >
          <CheckCircle2 className="h-4 w-4" />
          Aprovar
        </Button>
      </>
    );
  }

  return (
    <>
      {canSendForReview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
          onClick={onSendForReview}
          disabled={isSaving}
        >
          <Send className="h-4 w-4" />
          Enviar para revisão
        </Button>
      )}
      <Button type="submit" size="sm" className="gap-2" disabled={isSaving}>
        <Save className="h-4 w-4" />
        Salvar
      </Button>
    </>
  );
}
