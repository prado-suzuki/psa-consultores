import { UserCheck } from 'lucide-react';

import { TaskStatusDot } from '@/components/equipe/tarefas/TaskStatusDot';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { OrgTask, OrgTaskStatus } from '@/hooks/useOrgTasks';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { formatKanbanDate } from '@/lib/taskKanbanFormat';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

interface TaskKanbanSubtaskRowProps {
  subtask: OrgTask;
  draggedTaskId?: string | null;
  isHighlighted: boolean;
  currentUserId?: string | null;
  canChangeStatus: (task: OrgTask) => boolean;
  /** Nome de quem está com a revisão da subtarefa; nulo quando não há revisão em curso. */
  reviewerName: (task: OrgTask) => string | null;
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
  reviewerName,
  onOpen,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: TaskKanbanSubtaskRowProps) {
  const podeMover = canChangeStatus(subtask);
  const revisor = reviewerName(subtask);
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
      {/* A linha é de um só andar e o título já briga com o prazo pelo
          espaço, então aqui o revisor entra como marca: o nome fica no title,
          que é o mesmo caminho de leitura do prazo ao lado. Nome inteiro só no
          card e no modal. */}
      {revisor && (
        <span
          aria-label={`Em revisão com ${revisor}`}
          title={`Em revisão com ${revisor}`}
          className={cn('flex-shrink-0', statusColors[subtask.status].text)}
        >
          <UserCheck className="h-3.5 w-3.5" />
        </span>
      )}
      {subtask.due_date && (
        <span className="flex-shrink-0 text-xs text-muted-foreground">
          {formatKanbanDate(subtask.due_date)}
        </span>
      )}
    </div>
  );
}
