import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, ChevronDown, Calendar, User } from 'lucide-react';
import { FiscalTask, FiscalTaskStatus, useUpdateFiscalTask } from '@/hooks/useFiscalTasks';
import { TaskCard } from './TaskCard';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { statusList } from '@/lib/taskStatusColors';

interface TaskKanbanProps {
  tasks: FiscalTask[];
  onEdit: (task: FiscalTask) => void;
  onDelete: (taskId: string) => void;
  onReassign: (task: FiscalTask) => void;
}

interface HierarchicalFiscalTask extends FiscalTask {
  subtasks: FiscalTask[];
  subtaskCount: number;
  completedSubtasks: number;
}

const columns = statusList.map(s => ({
  status: s.key,
  label: s.label,
  color: s.bg,
}));

export const TaskKanban = ({ tasks, onEdit, onDelete, onReassign }: TaskKanbanProps) => {
  const [draggedTask, setDraggedTask] = useState<FiscalTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const updateTask = useUpdateFiscalTask();

  // Build hierarchy
  const subtasksByParent: Record<string, FiscalTask[]> = {};
  tasks.filter(t => t.parent_task_id).forEach(t => {
    if (t.parent_task_id) {
      if (!subtasksByParent[t.parent_task_id]) subtasksByParent[t.parent_task_id] = [];
      subtasksByParent[t.parent_task_id].push(t);
    }
  });

  const parentTasks = tasks.filter(t => !t.parent_task_id);

  const getHierarchicalByStatus = (status: FiscalTaskStatus): HierarchicalFiscalTask[] => {
    return parentTasks
      .filter(t => t.status === status)
      .map(t => ({
        ...t,
        subtasks: subtasksByParent[t.id] || [],
        subtaskCount: subtasksByParent[t.id]?.length || 0,
        completedSubtasks: subtasksByParent[t.id]?.filter(s => s.status === 'done').length || 0,
      }));
  };

  const toggleTaskExpanded = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSubtaskComplete = (subtask: FiscalTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: FiscalTaskStatus = subtask.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: subtask.id, status: newStatus });
  };

  const handleDragStart = (e: React.DragEvent, task: FiscalTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: FiscalTaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTask.mutate({ id: draggedTask.id, status: newStatus });
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-300px)] overflow-x-auto pb-4">
      {columns.map(column => {
        const columnTasks = getHierarchicalByStatus(column.status);
        return (
          <div
            key={column.status}
            className="flex-shrink-0 w-80 flex flex-col bg-muted/30 rounded-lg overflow-visible"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className={cn(
              "px-3 py-2 rounded-t-lg flex items-center justify-between",
              column.color
            )}>
              <span className="font-medium text-sm">{column.label}</span>
              <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">
                {columnTasks.length}
              </span>
            </div>

            <ScrollArea className="flex-1 p-1">
              <div className="space-y-2 p-1">
                {columnTasks.map(task => (
                  <div key={task.id}>
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "cursor-grab active:cursor-grabbing relative",
                        draggedTask?.id === task.id && "opacity-50"
                      )}
                    >
                      {task.subtaskCount > 0 && (
                        <button
                          onClick={(e) => toggleTaskExpanded(task.id, e)}
                          className="absolute top-3 left-2 z-10 p-0.5 hover:bg-muted rounded"
                        >
                          {expandedTasks.has(task.id) ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <TaskCard
                        task={task}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onReassign={onReassign}
                        allTasks={tasks}
                        compact
                      />
                    </div>

                    {expandedTasks.has(task.id) && task.subtasks.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted-foreground/20 pl-3">
                        {task.subtasks.map(subtask => (
                          <div
                            key={subtask.id}
                            className="flex items-start gap-2 p-2 bg-white rounded border text-xs hover:bg-muted/40 cursor-pointer transition-colors"
                            onClick={() => onEdit(subtask)}
                          >
                            <Checkbox
                              checked={subtask.status === 'done'}
                              onCheckedChange={() => {}}
                              onClick={(e) => toggleSubtaskComplete(subtask, e as unknown as React.MouseEvent)}
                              className="flex-shrink-0 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={cn(
                                "block truncate font-medium",
                                subtask.status === 'done' && "line-through text-muted-foreground"
                              )}>
                                {subtask.title}
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                {subtask.assigned_to_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {subtask.assigned_to_name}
                                  </span>
                                )}
                                {subtask.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(subtask.due_date + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Arraste tarefas aqui
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};
