import { Building2, ChevronDown, ChevronRight, Crosshair, Layers } from 'lucide-react';

import { TaskKanbanSubtaskRow } from '@/components/equipe/fiscal/tasks/kanban/TaskKanbanSubtaskRow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { OrgTask, OrgTaskStatus } from '@/hooks/useOrgTasks';
import { formatKanbanDate } from '@/lib/taskKanbanFormat';
import { statusColors } from '@/lib/taskStatusColors';
import type { TaskKanbanEntry } from '@/lib/taskKanbanHierarchy';
import { cn } from '@/lib/utils';

interface TaskKanbanCardProps {
  entry: TaskKanbanEntry<OrgTask>;
  /** Card (ou linha da lista) que está sendo arrastado agora. */
  draggedTaskId?: string | null;
  /** Cards em destaque momentâneo — o "onde está" da relação mãe/filha. */
  highlightedTaskIds: Set<string>;
  isExpanded: boolean;
  currentUserId?: string | null;
  canChangeStatus: (task: OrgTask) => boolean;
  onToggleExpanded: (key: string) => void;
  onOpen: (task: OrgTask) => void;
  onReveal: (taskIds: string[]) => void;
  onDragStart: (task: OrgTask) => void;
  onDragEnd: () => void;
  onStatusChange: (task: OrgTask, status: OrgTaskStatus) => void;
}

/**
 * O card do quadro — um só formato para tudo.
 *
 * Quando a tarefa tem filhas em OUTRA coluna, o mesmo card se repete lá como
 * cópia, levando as filhas daquela coluna na lista. A cópia é idêntica ao
 * original de propósito (é assim que se reconhece de quem é o bloco); o que
 * diz que ela é cópia é o rótulo com o **status real** da tarefa, que não bate
 * com a coluna onde ela está. Cópia não arrasta: quem se move é a filha, de
 * dentro da lista.
 */
export function TaskKanbanCard({
  entry,
  draggedTaskId,
  highlightedTaskIds,
  isExpanded,
  currentUserId,
  canChangeStatus,
  onToggleExpanded,
  onOpen,
  onReveal,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: TaskKanbanCardProps) {
  const { task, isCopy, children, subtaskCount, completedSubtasks } = entry;
  const canDrag = !isCopy && canChangeStatus(task);
  const statusReal = statusColors[task.status];

  return (
    <div>
      <Card
        // Só o original leva o marcador: com dois elementos anunciando o mesmo
        // id, "mostrar no quadro" acharia a cópia em vez da tarefa.
        data-task-card={isCopy ? undefined : task.id}
        className={cn(
          'border-border bg-card transition-shadow hover:shadow-md',
          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          draggedTaskId === task.id && !isCopy && 'opacity-50',
          highlightedTaskIds.has(task.id) && !isCopy && 'ring-2 ring-primary ring-offset-1',
        )}
        draggable={canDrag}
        onDragStart={(event) => {
          if (!canDrag) return;
          event.dataTransfer.effectAllowed = 'move';
          onDragStart(task);
        }}
        onDragEnd={onDragEnd}
        onClick={() => onOpen(task)}
      >
        <CardContent className="p-3">
          {/* Só a CÓPIA se anuncia. Card sem esta faixa é a tarefa de verdade —
              é assim que se sabe qual é a tarefa-pai. E o texto diz o que o
              card está fazendo nesta coluna ("subtarefas de X"), em vez de
              reivindicar ser a tarefa-pai. */}
          {isCopy && (
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="h-3 w-3 shrink-0" />
                Subtarefas de
              </span>
              <button
                type="button"
                title={`A tarefa-pai está em ${statusReal.label} — clique para ir até o card dela`}
                onClick={(event) => {
                  event.stopPropagation();
                  onReveal([task.id]);
                }}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-shadow hover:ring-1 hover:ring-current',
                  statusReal.combined,
                )}
              >
                <Crosshair className="h-2.5 w-2.5 shrink-0" />
                {statusReal.label}
              </button>
            </div>
          )}

          <div className="flex items-start gap-2">
            {children.length > 0 && (
              <button
                type="button"
                aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${children.length} subtarefa(s) nesta coluna`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpanded(entry.key);
                }}
                className="mt-0.5 flex flex-shrink-0 items-center gap-0.5 rounded p-0.5 text-xs tabular-nums text-muted-foreground hover:bg-muted"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {/* Quantas estão AQUI: sem isso, a cópia fechada não diz o que
                    guarda, e as cópias de uma mesma mãe ficam indistinguíveis. */}
                {children.length}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="mb-2 line-clamp-3 break-words text-sm font-medium text-foreground">
                {task.title}
              </h4>
              {task.project?.name && (
                <span className="mb-1 block break-words line-clamp-2 text-xs text-info">
                  {task.project.name}
                </span>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="break-words">{task.assigned_to_name || 'Não atribuído'}</span>
                <span className="ml-1 flex-shrink-0">{formatKanbanDate(task.due_date)}</span>
              </div>
              {task.contribuinte?.nome_razao_social && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  <span className="break-words line-clamp-2">
                    {task.contribuinte.nome_razao_social}
                  </span>
                </div>
              )}
              {/* Progresso do conjunto só no card de verdade: repetido em cada
                  cópia era o mesmo número quatro vezes na tela, e ainda dava à
                  cópia um ar de tarefa. Na cópia, quem conta é o número ao lado
                  da setinha — esse sim muda de coluna para coluna. */}
              {subtaskCount > 0 && !isCopy && (
                <div className="mt-2 flex items-center justify-end">
                  <Badge
                    variant="secondary"
                    title={
                      children.length === subtaskCount
                        ? `${completedSubtasks} de ${subtaskCount} concluídas`
                        : `${completedSubtasks} de ${subtaskCount} concluídas · ${children.length} nesta coluna`
                    }
                    className={cn(
                      'text-xs',
                      completedSubtasks === subtaskCount && 'bg-success/10 text-success',
                    )}
                  >
                    {completedSubtasks}/{subtaskCount} subtarefas
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isExpanded && children.length > 0 && (
        <div className="ml-4 mt-2 space-y-1 border-l-2 border-border pl-3">
          {children.map((subtask) => (
            <TaskKanbanSubtaskRow
              key={subtask.id}
              subtask={subtask}
              draggedTaskId={draggedTaskId}
              isHighlighted={highlightedTaskIds.has(subtask.id)}
              currentUserId={currentUserId}
              canChangeStatus={canChangeStatus}
              onOpen={onOpen}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
