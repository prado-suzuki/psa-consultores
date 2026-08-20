import type { UseFormReturn } from 'react-hook-form';
import { RotateCcw, Send, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReviewRichTextEditor } from '@/components/equipe/fiscal/tasks/ReviewRichText';
import { cn } from '@/lib/utils';
import type { ReviewAction, TaskFormValues, TaskTeamMember } from '@/lib/orgTaskForm';

interface ReviewActionDialogProps {
  /** `null` mantém o diálogo fechado; o valor define o modo (envio ou ajuste). */
  action: ReviewAction | null;
  form: UseFormReturn<TaskFormValues>;
  taskTitle?: string;
  assignedToName?: string | null;
  reviewerOptions: TaskTeamMember[];
  reviewerOptionsLoading: boolean;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmação de "Enviar para revisão" / "Solicitar ajustes": escolhe o revisor
 * (só no envio) e coleta o comentário obrigatório da transição.
 */
export function ReviewActionDialog({
  action,
  form,
  taskTitle,
  assignedToName,
  reviewerOptions,
  reviewerOptionsLoading,
  isSaving,
  onClose,
  onConfirm,
}: ReviewActionDialogProps) {
  const isSending = action === 'send';

  return (
    <Dialog open={action !== null} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-full p-2',
                isSending
                  ? 'bg-status-revisao-soft text-status-revisao'
                  : 'bg-status-ajuste-soft text-status-ajuste',
              )}
            >
              {isSending ? <Send className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle>{isSending ? 'Enviar para revisão' : 'Solicitar ajustes'}</DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2">{taskTitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isSending ? (
            <div className="space-y-2">
              <Label>
                Revisor <RequiredMark />
              </Label>
              <Select
                value={form.watch('reviewer_id') || ''}
                onValueChange={(value) => {
                  form.setValue('reviewer_id', value);
                  form.clearErrors('reviewer_id');
                }}
                disabled={reviewerOptionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={reviewerOptionsLoading ? 'Carregando...' : 'Selecione o revisor'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {reviewerOptions.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.reviewer_id && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.reviewer_id.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Responsável pelos ajustes</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                {assignedToName || 'Responsável não definido'}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="review-action-comment">
              {isSending ? 'Orientações para revisão' : 'O que precisa ser ajustado?'}{' '}
              <RequiredMark />
            </Label>
            <ReviewRichTextEditor
              value={form.watch('review_comment') || ''}
              onChange={(value) => {
                form.setValue('review_comment', value);
                form.clearErrors('review_comment');
              }}
              placeholder={
                isSending
                  ? 'Descreva os pontos que merecem atenção'
                  : 'Descreva objetivamente as correções necessárias'
              }
              autoFocus={action === 'adjustments'}
            />
            {form.formState.errors.review_comment && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.review_comment.message}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={
              isSending ? 'bg-status-revisao hover:bg-status-revisao/90' : 'bg-status-ajuste hover:bg-status-ajuste/90'
            }
          >
            {isSending ? 'Confirmar envio' : 'Devolver para ajustes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
