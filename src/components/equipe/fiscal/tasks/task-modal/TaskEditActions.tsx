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
          className="gap-2 border-status-ajuste/30 text-status-ajuste hover:bg-status-ajuste-soft hover:text-status-ajuste"
          onClick={onRequestAdjustments}
          disabled={isSaving}
        >
          <RotateCcw className="h-4 w-4" />
          Solicitar ajustes
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-2 bg-status-feito hover:bg-status-feito/90"
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
          className="gap-2 border-status-revisao/30 text-status-revisao hover:bg-status-revisao-soft hover:text-status-revisao"
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
