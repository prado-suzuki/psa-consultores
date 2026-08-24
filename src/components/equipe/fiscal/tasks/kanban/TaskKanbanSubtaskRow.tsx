import { TaskStatusDot } from '@/components/equipe/tarefas/TaskStatusDot';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { OrgTask, OrgTaskStatus } from '@/hooks/useOrgTasks';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { formatKanbanDate } from '@/lib/taskKanbanFormat';
import { statusList } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

interface TaskKanbanSubtaskRowProps {
  subtask: OrgTask;
  draggedTaskId?: string | null;
  isHighlighted: boolean;
  currentUserId?: string | null;
  canChangeStatus: (task: OrgTask) => boolean;
  onOpen: (task: OrgTask) => void;
  onDragStart: (task: OrgTask) => void;
  onDragEnd: () => void;
  onStatusChange: (task: OrgTask, status: OrgTaskStatus) => void;
}

/**
 * Linha da lista de subtarefas de um card — o mesmo formato de sempre: recuo,
 * marcador de status, título e prazo.
 *
 * Duas diferenças em relação ao que existia: o marcador virou seletor dos 7
 * status (era um checkbox que só sabia concluir/reabrir, e jogava para
 * "concluída" uma subtarefa que estava em revisão), e a linha arrasta — é por
 * aqui que uma filha sai para outra coluna sem levar as irmãs junto.
 */
export function TaskKanbanSubtaskRow({
  subtask,
  draggedTaskId,
  isHighlighted,
  currentUserId,
  canChangeStatus,
  onOpen,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: TaskKanbanSubtaskRowProps) {
  const podeMover = canChangeStatus(subtask);
  const opcoes = statusList.filter(
    (status) => !(status.key === 'done' && isDelegatedOrgTaskReviewer(subtask, currentUserId)),
  );

  return (
    <div
      data-task-card={subtask.id}
      draggable={podeMover}
      onDragStart={(event) => {
        if (!podeMover) return;
        // A linha vive dentro de um card arrastável: sem parar a propagação, o
        // dragstart do card sobrescreveria a tarefa arrastada.
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(subtask);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(subtask)}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border bg-card p-2 text-sm hover:bg-muted',
        podeMover ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        draggedTaskId === subtask.id && 'opacity-50',
        isHighlighted && 'ring-2 ring-primary ring-offset-1',
        subtask.status === 'done' && 'opacity-60',
      )}
    >
      <Select
        value={subtask.status}
        onValueChange={(value) => onStatusChange(subtask, value as OrgTaskStatus)}
        disabled={!podeMover}
      >
        <SelectTrigger
          aria-label={`Status de ${subtask.title}`}
          onClick={(event) => event.stopPropagation()}
          className="h-5 w-5 shrink-0 justify-center border-0 bg-transparent p-0 shadow-none focus:ring-0 disabled:opacity-100 [&>span]:!flex [&>span]:items-center [&>svg]:hidden"
        >
          <span>
            <TaskStatusDot status={subtask.status} />
          </span>
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((status) => (
            <SelectItem key={status.key} value={status.key}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-foreground',
          subtask.status === 'done' && 'line-through',
        )}
      >
        {subtask.title}
      </span>
      {subtask.due_date && (
        <span className="flex-shrink-0 text-xs text-muted-foreground">
          {formatKanbanDate(subtask.due_date)}
        </span>
      )}
    </div>
  );
}
