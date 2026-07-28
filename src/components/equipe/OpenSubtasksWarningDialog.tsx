import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatOpenSubtasksLabel, type CompletableTask } from '@/lib/deliverableCompletion';

interface OpenSubtasksWarningDialogProps {
  /** null = fechado. */
  taskTitle: string | null;
  openSubtasks: CompletableTask[];
  confirming?: boolean;
  getProfileName?: (profileId: string | null) => string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Aviso antes de concluir uma tarefa-mãe que ainda tem subtarefa aberta — a subtarefa
 * continuaria pendente para alguém, escondida dentro de um card já riscado.
 */
export function OpenSubtasksWarningDialog(props: OpenSubtasksWarningDialogProps) {
  const open = props.taskTitle !== null && props.openSubtasks.length > 0;
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && props.onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Concluir com {formatOpenSubtasksLabel(props.openSubtasks.length)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{props.taskTitle}&rdquo; ainda tem trabalho pendente abaixo dela. Se concluir
            assim, a subtarefa continua aberta para o responsável, mas escondida dentro de um card
            já concluído.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {props.openSubtasks.map((subtask) => (
            <li key={subtask.id}>
              {subtask.task_code && (
                <span className="mr-1 font-mono text-xs text-amber-700">{subtask.task_code}</span>
              )}
              {subtask.title}
              {props.getProfileName && 'assigned_to' in subtask && (
                <span className="text-xs text-amber-700">
                  {' '}
                  · {props.getProfileName((subtask as { assigned_to: string | null }).assigned_to)}
                </span>
              )}
            </li>
          ))}
        </ul>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.confirming}>
            Cancelar e resolver antes
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={props.confirming}
            onClick={(event) => {
              event.preventDefault();
              props.onConfirm();
            }}
          >
            {props.confirming ? 'Concluindo...' : 'Concluir mesmo assim'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
