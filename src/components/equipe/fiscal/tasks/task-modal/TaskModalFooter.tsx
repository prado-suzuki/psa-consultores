import { CheckCircle2, RotateCcw, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface TaskModalFooterProps {
  isEditing: boolean;
  isSaving: boolean;
  /** O usuário atual é o revisor delegado desta tarefa. */
  isReviewer: boolean;
  /** A tarefa é do próprio usuário e ainda não está em revisão. */
  canSendForReview: boolean;
  onCancel: () => void;
  onRequestAdjustments: () => void;
  onSendForReview: () => void;
  onApprove: () => void;
}

/**
 * Barra de ações do modal. Decide o que cada papel pode fazer: o revisor
 * aprova ou devolve, o responsável salva ou envia para revisão.
 */
export function TaskModalFooter({
  isEditing,
  isSaving,
  isReviewer,
  canSendForReview,
  onCancel,
  onRequestAdjustments,
  onSendForReview,
  onApprove,
}: TaskModalFooterProps) {
  return (
    <div className="sticky -bottom-6 z-20 -mx-6 -mb-6 flex flex-wrap justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
        Cancelar
      </Button>
      {isReviewer && (
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
          onClick={onRequestAdjustments}
          disabled={isSaving}
        >
          <RotateCcw className="h-4 w-4" />
          Solicitar ajustes
        </Button>
      )}
      {isEditing && !isReviewer && canSendForReview && (
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
          onClick={onSendForReview}
          disabled={isSaving}
        >
          <Send className="h-4 w-4" />
          Enviar para revisão
        </Button>
      )}
      {!isReviewer && (
        <Button type="submit" disabled={isSaving}>
          {isEditing ? 'Salvar' : 'Criar'}
        </Button>
      )}
      {isReviewer && (
        <Button
          type="button"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={isSaving}
          onClick={onApprove}
        >
          <CheckCircle2 className="h-4 w-4" />
          Aprovar
        </Button>
      )}
    </div>
  );
}
