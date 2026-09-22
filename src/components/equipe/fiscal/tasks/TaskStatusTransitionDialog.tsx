import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RequiredMark } from '@/components/ui/required-mark';
import { AreaKey } from '@/config/areaCategories';
import {
  OrgTask,
  useCreateOrgTaskComment,
  useUpdateOrgTask,
} from '@/hooks/useOrgTasks';
import { useOrgProjectClusterIds } from '@/hooks/useOrgProjects';
import { useReviewerCandidates } from '@/hooks/useReviewerCandidates';
import { somaHorasDeRevisao } from '@/lib/orgTaskForm';

type TransitionStatus = 'review' | 'em_ajuste';

interface TaskStatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: OrgTask | null;
  status: TransitionStatus;
  area: AreaKey;
}

/**
 * Sem transição pendente não há o que montar. Os hooks internos (revisor,
 * cluster do projeto) só fazem sentido com a tarefa em mãos, e mantê-los vivos
 * à toa ainda emplacava uma consulta de cluster com `undefined` no wiring de
 * quem hospeda o diálogo (a seção de subtarefas mora dentro do TaskModal).
 */
export function TaskStatusTransitionDialog(props: TaskStatusTransitionDialogProps) {
  if (!props.open || !props.task) return null;
  return <TransitionDialog {...props} task={props.task} />;
}

function TransitionDialog({
  open,
  onOpenChange,
  task,
  status,
  area,
}: TaskStatusTransitionDialogProps & { task: OrgTask }) {
  const { user } = useAuth();
  const updateTask = useUpdateOrgTask(area, { showToasts: false });
  const createComment = useCreateOrgTaskComment({ showToasts: false, area });
  const [reviewerId, setReviewerId] = useState('');
  const [details, setDetails] = useState('');
  const [reviewHours, setReviewHours] = useState('');
  const [validationError, setValidationError] = useState('');
  const transitionSavedRef = useRef(false);

  /**
   * Devolver para ajustes é despacho de revisão, e arrastar o cartão é o mesmo
   * ato que clicar em "Solicitar ajustes" dentro da tarefa. Sem o campo aqui, a
   * hora do revisor se perdia em silêncio por este caminho.
   *
   * A pergunta só aparece para QUEM REVISA: a coluna é dele, e o gatilho da
   * RLS-06 só a libera no ramo do revisor. Perguntar a um `team_member` que
   * devolve a própria tarefa renderia um 42501 no salvamento.
   */
  const perguntaHoras = status === 'em_ajuste' && !!user?.id && task.reviewer_id === user.id;

  const { data: clusterIds = [] } = useOrgProjectClusterIds(task?.project_id || undefined);
  const { data: candidates = [], isLoading: candidatesLoading } = useReviewerCandidates(clusterIds);
  const reviewerOptions = useMemo(
    () => candidates.filter(candidate => candidate.id !== task?.assigned_to),
    [candidates, task?.assigned_to],
  );

  useEffect(() => {
    if (!open) return;
    setReviewerId(status === 'review' ? task?.reviewer_id || '' : '');
    setDetails('');
    setReviewHours('');
    setValidationError('');
    transitionSavedRef.current = false;
  }, [open, status, task?.id, task?.reviewer_id]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDetails('');
      setReviewHours('');
      setValidationError('');
      transitionSavedRef.current = false;
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!task) return;
    const trimmedDetails = details.trim();
    if (status === 'review' && !reviewerId) {
      setValidationError('Selecione quem fará a revisão');
      return;
    }
    if (!trimmedDetails) {
      setValidationError(
        status === 'review'
          ? 'Informe o que precisa ser revisado'
          : 'Informe o que precisa ser ajustado',
      );
      return;
    }

    setValidationError('');
    try {
      if (!transitionSavedRef.current) {
        /*
          O total acumulado sai da tarefa salva, nunca do campo: somar em cima
          do próprio valor dobraria a conta. E só entra no payload quando mudou
          de fato, porque o hook grava tudo o que difere do estado atual, e o
          espelho da RLS-06 lá dentro só admite `status` e `review_hours`.
        */
        const totalDeHoras = perguntaHoras
          ? somaHorasDeRevisao(task.review_hours, reviewHours)
          : null;
        const gravaHoras = perguntaHoras && totalDeHoras !== (task.review_hours ?? null);

        await updateTask.mutateAsync({
          id: task.id,
          status,
          ...(status === 'review' ? { reviewer_id: reviewerId } : {}),
          ...(gravaHoras ? { review_hours: totalDeHoras } : {}),
          reviewTransitionValidated: true,
        });
        transitionSavedRef.current = true;
      }

      const reviewerName = reviewerOptions.find(candidate => candidate.id === reviewerId)?.name || 'revisor';
      const currentUserName = user?.user_metadata?.first_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
        : user?.email || 'Usuário';
      const comment = status === 'review'
        ? `Enviado para revisão de ${reviewerName}: ${trimmedDetails}`
        : `Devolvido para ajustes: ${trimmedDetails}`;

      await createComment.mutateAsync({
        taskId: task.id,
        comment,
        userName: currentUserName,
        isSystem: true,
      });

      toast.success(status === 'review' ? 'Tarefa enviada para revisão' : 'Tarefa devolvida para ajustes');
      handleClose(false);
    } catch (error) {
      if (transitionSavedRef.current) {
        toast.error('A tarefa foi atualizada, mas o detalhamento não foi registrado. Tente confirmar novamente.');
      } else {
        toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a tarefa');
      }
    }
  };

  const isReview = status === 'review';
  const isPending = updateTask.isPending || createComment.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={isReview
              ? 'rounded-full bg-status-revisao-soft p-2 text-status-revisao'
              : 'rounded-full bg-status-ajuste-soft p-2 text-status-ajuste'}
            >
              {isReview ? <Send className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle>{isReview ? 'Enviar para revisão' : 'Devolver para ajustes'}</DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2">{task?.title}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isReview ? (
            <div className="space-y-2">
              <Label>Revisor <RequiredMark /></Label>
              <Select value={reviewerId} onValueChange={setReviewerId} disabled={candidatesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={candidatesLoading ? 'Carregando...' : 'Selecione o revisor'} />
                </SelectTrigger>
                <SelectContent>
                  {reviewerOptions.map(candidate => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Responsável pelos ajustes</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                {task?.assigned_to_name || 'Responsável não definido'}
              </div>
            </div>
          )}

          {perguntaHoras && (
            <div className="space-y-2">
              <Label htmlFor="transition-review-hours">Horas desta revisão</Label>
              <Input
                id="transition-review-hours"
                type="number"
                min={0}
                step="0.25"
                inputMode="decimal"
                placeholder="Ex: 1,5"
                aria-describedby="transition-review-hours-ajuda"
                value={reviewHours}
                onChange={event => setReviewHours(event.target.value)}
              />
              {/* Mesmas palavras do diálogo dos botões da tarefa: é o mesmo
                  despacho, e duas explicações diferentes para o mesmo campo
                  fariam parecer que são coisas diferentes. */}
              <p id="transition-review-hours-ajuda" className="text-sm text-muted-foreground">
                O tempo que você levou nesta revisão. Soma ao total e fica separado das horas de
                quem executou.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transition-details">
              {isReview ? 'O que precisa ser revisado?' : 'O que precisa ser ajustado?'} <RequiredMark />
            </Label>
            <Textarea
              id="transition-details"
              value={details}
              onChange={event => setDetails(event.target.value)}
              placeholder="Descreva de forma objetiva"
              rows={4}
              autoFocus={!isReview}
            />
          </div>

          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={isReview ? 'bg-status-revisao hover:bg-status-revisao/90' : 'bg-status-ajuste hover:bg-status-ajuste/90'}
          >
            {isReview ? 'Enviar para revisão' : 'Confirmar ajustes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
