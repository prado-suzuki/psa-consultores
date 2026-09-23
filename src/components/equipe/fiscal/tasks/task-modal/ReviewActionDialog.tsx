import type { UseFormReturn } from 'react-hook-form';
import { CheckCircle2, RotateCcw, Send, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  /** `null` mantém o diálogo fechado; o valor define o modo. */
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
 * O que muda de um modo para o outro.
 *
 * **Tabela e não ternário aninhado**, porque desde 21/09 são três modos e o
 * encadeamento já estava ilegível com dois. As classes vêm escritas por inteiro
 * de propósito: o Tailwind não enxerga nome de classe montado em tempo de
 * execução, então `bg-status-${cor}` sairia sem estilo nenhum.
 */
const MODOS = {
  send: {
    titulo: 'Enviar para revisão',
    confirmar: 'Confirmar envio',
    Icone: Send,
    classeDoIcone: 'bg-status-revisao-soft text-status-revisao',
    classeDoBotao: 'bg-status-revisao hover:bg-status-revisao/90',
    rotuloDoComentario: 'Orientações para revisão',
    exemploDoComentario: 'Descreva os pontos que merecem atenção',
    pedeComentario: true,
    pedeHoras: false,
  },
  adjustments: {
    titulo: 'Solicitar ajustes',
    confirmar: 'Devolver para ajustes',
    Icone: RotateCcw,
    classeDoIcone: 'bg-status-ajuste-soft text-status-ajuste',
    classeDoBotao: 'bg-status-ajuste hover:bg-status-ajuste/90',
    rotuloDoComentario: 'O que precisa ser ajustado?',
    exemploDoComentario: 'Descreva objetivamente as correções necessárias',
    pedeComentario: true,
    pedeHoras: true,
  },
  /**
   * Aprovar **não pede comentário**, e isso não é esquecimento: o texto do
   * evento é fixo ("Tarefa aprovada"), montado no `TaskModal`. Um editor aqui
   * pediria algo que não seria gravado em lugar nenhum.
   */
  approved: {
    titulo: 'Aprovar a revisão',
    confirmar: 'Confirmar aprovação',
    Icone: CheckCircle2,
    classeDoIcone: 'bg-status-feito-soft text-status-feito',
    classeDoBotao: 'bg-status-feito hover:bg-status-feito/90',
    rotuloDoComentario: '',
    exemploDoComentario: '',
    pedeComentario: false,
    pedeHoras: true,
  },
} as const satisfies Record<ReviewAction, unknown>;

/**
 * Confirmação das três ações de revisão: enviar, devolver e aprovar.
 *
 * **Aprovar passou a abrir este diálogo em 21/09/2026**, e antes gravava direto
 * no clique. Foi o único lugar possível para perguntar a hora do revisor, que é
 * o que a tarefa pedia, e de quebra a aprovação ganhou a confirmação que não
 * tinha.
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
  const modo = action ? MODOS[action] : null;
  const isSending = action === 'send';

  return (
    <Dialog open={action !== null} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {modo && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={cn('rounded-full p-2', modo.classeDoIcone)}>
                  <modo.Icone className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>{modo.titulo}</DialogTitle>
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
                        placeholder={
                          reviewerOptionsLoading ? 'Carregando...' : 'Selecione o revisor'
                        }
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

              {modo.pedeHoras && (
                <div className="space-y-2">
                  <Label htmlFor="review-action-hours">Horas desta revisão</Label>
                  <Input
                    id="review-action-hours"
                    type="number"
                    min={0}
                    step="0.25"
                    inputMode="decimal"
                    placeholder="Ex: 1,5"
                    aria-describedby="review-action-hours-ajuda"
                    value={form.watch('review_hours') ?? ''}
                    onChange={(event) => {
                      /* O input devolve string e o formulário guarda número ou
                         vazio, como o campo de horas realizadas já faz. */
                      const digitado = event.target.value;
                      form.setValue('review_hours', digitado === '' ? '' : Number(digitado));
                    }}
                  />
                  {/*
                    O texto diz as duas coisas que evitam o erro de preenchimento:
                    que é o tempo DESTA revisão, não o acumulado, e que ele não se
                    mistura com a hora de quem executou.
                  */}
                  <p id="review-action-hours-ajuda" className="text-sm text-muted-foreground">
                    O tempo que você levou nesta revisão. Soma ao total e fica separado das horas
                    de quem executou.
                  </p>
                </div>
              )}

              {modo.pedeComentario && (
                <div className="space-y-2">
                  <Label htmlFor="review-action-comment">
                    {modo.rotuloDoComentario} <RequiredMark />
                  </Label>
                  <ReviewRichTextEditor
                    value={form.watch('review_comment') || ''}
                    onChange={(value) => {
                      form.setValue('review_comment', value);
                      form.clearErrors('review_comment');
                    }}
                    placeholder={modo.exemploDoComentario}
                    autoFocus={action === 'adjustments'}
                  />
                  {form.formState.errors.review_comment && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.review_comment.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={isSaving}
                className={modo.classeDoBotao}
              >
                {modo.confirmar}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
