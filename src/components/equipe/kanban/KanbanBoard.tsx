import type { MouseEvent } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  formatEquipeKanbanDueDate,
  hasOpenSubtasksUnderCompletedParent,
  type EquipeKanbanDeliverable,
  type HierarchicalEquipeKanbanDeliverable,
} from '@/lib/equipeKanban';
import { formatBlockerTooltip, type DeliverableBlocker } from '@/hooks/useDeliverableBlockers';

const columns = [
  { id: 'pending', title: 'A Fazer', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'Em Progresso', color: 'bg-yellow-500' },
  { id: 'completed', title: 'Concluído', color: 'bg-green-500' },
];

interface KanbanBoardProps {
  expandedTasks: Set<string>;
  sortByDueDate: 'asc' | 'desc' | null;
  getColumnDeliverables: (columnId: string) => HierarchicalEquipeKanbanDeliverable[];
  getProfileName: (profileId: string | null) => string;
  getBlocker: (deliverable: EquipeKanbanDeliverable) => DeliverableBlocker | undefined;
  /** Nome da tarefa-mãe quando ela não está no quadro (card promovido pelo filtro por pessoa). */
  getGroupLabel: (deliverable: EquipeKanbanDeliverable) => string | null;
  onSortToggle: () => void;
  onStatusChange: (id: string, status: 'pending' | 'in_progress' | 'completed') => void;
  onToggleExpanded: (taskId: string, event?: MouseEvent) => void;
  onToggleSubtask: (subtask: EquipeKanbanDeliverable, event: MouseEvent) => void;
  onOpenDeliverable: (deliverable: EquipeKanbanDeliverable) => void;
}

export function KanbanBoard(props: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-4 w-full">
      {columns.map((column) => (
        <div key={column.id} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${column.color}`} />
            <h3 className="text-gray-900 font-semibold text-sm">{column.title}</h3>
            <Badge variant="outline" className="border-gray-300 text-gray-600">
              {props.getColumnDeliverables(column.id).length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className={cn('ml-auto h-7 w-7 p-0', props.sortByDueDate && 'text-primary')}
              onClick={props.onSortToggle}
              title={
                props.sortByDueDate === 'asc'
                  ? 'Ordenado: mais antigo primeiro'
                  : props.sortByDueDate === 'desc'
                    ? 'Ordenado: mais recente primeiro'
                    : 'Ordenar por data de vencimento'
              }
            >
              {props.sortByDueDate === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : props.sortByDueDate === 'desc' ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              )}
            </Button>
          </div>

          <div
            className="space-y-3 min-h-[calc(100vh-420px)]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              props.onStatusChange(
                event.dataTransfer.getData('deliverableId'),
                column.id as 'pending' | 'in_progress' | 'completed',
              );
            }}
          >
            {props.getColumnDeliverables(column.id).map((deliverable) => (
              <div key={deliverable.id}>
                <Card
                  className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData('deliverableId', deliverable.id)
                  }
                  onClick={() => props.onOpenDeliverable(deliverable)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {deliverable.subtaskCount > 0 && (
                        <button
                          onClick={(event) => props.onToggleExpanded(deliverable.id, event)}
                          className="mt-0.5 p-0.5 hover:bg-gray-100 rounded"
                        >
                          {props.expandedTasks.has(deliverable.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        {props.getGroupLabel(deliverable) && (
                          <div
                            className="mb-1 truncate text-xs text-gray-400"
                            title={props.getGroupLabel(deliverable) ?? undefined}
                          >
                            {props.getGroupLabel(deliverable)}
                          </div>
                        )}
                        <h4 className="text-gray-900 text-sm font-medium mb-2 line-clamp-2">
                          {deliverable.task_code && (
                            <span className="text-gray-500 font-normal mr-1">
                              {deliverable.task_code}
                            </span>
                          )}
                          {deliverable.title}
                        </h4>
                        {props.getBlocker(deliverable) && (
                          <div
                            title={formatBlockerTooltip(props.getBlocker(deliverable)!)}
                            className="mb-2 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700"
                          >
                            🚩 Bloqueada
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{props.getProfileName(deliverable.assigned_to)}</span>
                          <span>{formatEquipeKanbanDueDate(deliverable.due_date)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {deliverable.subtaskCount > 0
                              ? deliverable.subtaskHoursTotal > 0
                                ? `${deliverable.subtaskHoursTotal}h estimadas`
                                : ''
                              : deliverable.estimated_hours
                                ? `${deliverable.estimated_hours}h estimadas`
                                : ''}
                          </span>
                          <div className="flex items-center gap-1">
                            {hasOpenSubtasksUnderCompletedParent(deliverable) && (
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-50 text-xs text-amber-800"
                                title="Tarefa concluída, mas ainda tem subtarefa aberta aqui dentro"
                              >
                                {deliverable.openSubtasks} aberta
                                {deliverable.openSubtasks > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {deliverable.subtaskCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {deliverable.completedSubtasks}/{deliverable.subtaskCount} subtarefas
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {props.expandedTasks.has(deliverable.id) && deliverable.subtasks.length > 0 && (
                  <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                    {deliverable.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        style={{ marginLeft: subtask.depth * 14 }}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md bg-white border border-gray-100 text-sm cursor-pointer hover:bg-gray-50',
                          subtask.status === 'completed' && 'opacity-60',
                        )}
                        onClick={() => props.onOpenDeliverable(subtask)}
                      >
                        <Checkbox
                          checked={subtask.status === 'completed'}
                          onCheckedChange={() => {}}
                          onClick={(event) => props.onToggleSubtask(subtask, event)}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              'text-gray-700',
                              subtask.status === 'completed' && 'line-through',
                            )}
                          >
                            {subtask.task_code && (
                              <span className="text-gray-400 mr-1">{subtask.task_code}</span>
                            )}
                            {subtask.title}
                          </span>
                          {props.getBlocker(subtask) && (
                            <span title={formatBlockerTooltip(props.getBlocker(subtask)!)} className="ml-1">
                              🚩
                            </span>
                          )}
                        </div>
                        {subtask.hoursDisplay ? (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {subtask.hoursDisplay}h
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
