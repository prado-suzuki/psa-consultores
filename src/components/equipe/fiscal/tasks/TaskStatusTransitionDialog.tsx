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

type TransitionStatus = 'review' | 'em_ajuste';

interface TaskStatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: OrgTask | null;
  status: TransitionStatus;
  area: AreaKey;
}

export function TaskStatusTransitionDialog({
  open,
  onOpenChange,
  task,
  status,
  area,
}: TaskStatusTransitionDialogProps) {
  const { user } = useAuth();
  const updateTask = useUpdateOrgTask(area, { showToasts: false });
  const createComment = useCreateOrgTaskComment({ showToasts: false, area });
  const [reviewerId, setReviewerId] = useState('');
  const [details, setDetails] = useState('');
  const [validationError, setValidationError] = useState('');
  const transitionSavedRef = useRef(false);

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
    setValidationError('');
    transitionSavedRef.current = false;
  }, [open, status, task?.id, task?.reviewer_id]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDetails('');
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
        await updateTask.mutateAsync({
          id: task.id,
          status,
          ...(status === 'review' ? { reviewer_id: reviewerId } : {}),
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
              ? 'rounded-full bg-purple-100 p-2 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
              : 'rounded-full bg-rose-100 p-2 text-rose-700 dark:bg-rose-900 dark:text-rose-200'}
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
            className={isReview ? 'bg-purple-600 hover:bg-purple-700' : 'bg-rose-600 hover:bg-rose-700'}
          >
            {isReview ? 'Enviar para revisão' : 'Confirmar ajustes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
