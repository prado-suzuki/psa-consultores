import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, ChevronDown, Building2 } from 'lucide-react';
import { OrgTask, OrgTaskStatus, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { statusList } from '@/lib/taskStatusColors';
import { AreaKey } from '@/config/areaCategories';

interface TaskKanbanProps {
  tasks: OrgTask[];
  area: AreaKey;
  onEdit: (task: OrgTask) => void;
  onDelete: (taskId: string) => void;
  onReassign: (task: OrgTask) => void;
}

interface HierarchicalOrgTask extends OrgTask {
  subtasks: OrgTask[];
  subtaskCount: number;
  completedSubtasks: number;
}

const columns = statusList.map(s => ({
  status: s.key,
  label: s.label,
  color: s.bg,
}));

export const TaskKanban = ({ tasks, area, onEdit, onDelete, onReassign }: TaskKanbanProps) => {
  const [draggedTask, setDraggedTask] = useState<OrgTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const updateTask = useUpdateOrgTask(area);

  const subtasksByParent: Record<string, OrgTask[]> = {};
  tasks.filter(t => t.parent_task_id).forEach(t => {
    if (t.parent_task_id) {
      if (!subtasksByParent[t.parent_task_id]) subtasksByParent[t.parent_task_id] = [];
      subtasksByParent[t.parent_task_id].push(t);
    }
  });

  const parentTasks = tasks.filter(t => !t.parent_task_id);

  const getHierarchicalByStatus = (status: OrgTaskStatus): HierarchicalOrgTask[] => {
    return parentTasks
      .filter(t => t.status === status)
      .map(t => ({
        ...t,
        subtasks: subtasksByParent[t.id] || [],
        subtaskCount: subtasksByParent[t.id]?.length || 0,
        completedSubtasks: subtasksByParent[t.id]?.filter(s => s.status === 'done').length || 0,
      }));
  };

  const toggleTaskExpanded = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSubtaskComplete = (subtask: OrgTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: OrgTaskStatus = subtask.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: subtask.id, status: newStatus });
  };

  const handleDragStart = (e: React.DragEvent, task: OrgTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: OrgTaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTask.mutate({ id: draggedTask.id, status: newStatus });
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => setDraggedTask(null);

  const formatDueDate = (date: string | null) => {
    if (!date) return '';
    return format(new Date(date + 'T00:00:00'), 'dd/MM', { locale: ptBR });
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-300px)] overflow-x-auto pb-4">
      {columns.map(column => {
        const columnTasks = getHierarchicalByStatus(column.status);
        return (
          <div
            key={column.status}
            className="flex-shrink-0 w-[340px] flex flex-col bg-muted/30 rounded-lg overflow-visible"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className={cn(
              "px-3 py-2 rounded-t-lg flex items-center justify-between",
              column.color
            )}>
              <span className="font-medium text-sm">{column.label}</span>
              <span className="text-xs bg-card/60 px-2 py-0.5 rounded-full">
                {columnTasks.length}
              </span>
            </div>

            <ScrollArea className="flex-1 p-1">
              <div className="space-y-3 p-1">
                {columnTasks.map(task => (
                  <div key={task.id}>
                    <Card
                      className={cn(
                        "bg-card border-border cursor-pointer hover:shadow-md transition-shadow",
                        draggedTask?.id === task.id && "opacity-50"
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEdit(task)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {task.subtaskCount > 0 && (
                            <button
                              onClick={(e) => toggleTaskExpanded(task.id, e)}
                              className="mt-0.5 p-0.5 hover:bg-muted rounded flex-shrink-0"
                            >
                              {expandedTasks.has(task.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-foreground text-sm font-medium mb-2 line-clamp-3 break-words">
                              {task.title}
                            </h4>
                            {task.project?.name && (
                              <span className="text-xs text-info mb-1 block break-words line-clamp-2">{task.project.name}</span>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="break-words">{task.assigned_to_name || 'Não atribuído'}</span>
                              <span className="flex-shrink-0 ml-1">{formatDueDate(task.due_date)}</span>
                            </div>
                            {(task as any).contribuinte?.nome_razao_social && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3 flex-shrink-0" />
                                <span className="break-words line-clamp-2">{(task as any).contribuinte.nome_razao_social}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-end mt-2">
                              {task.subtaskCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs",
                                    task.completedSubtasks === task.subtaskCount && task.subtaskCount > 0
                                      ? "bg-success/10 text-success"
                                      : ""
                                  )}
                                >
                                  {task.completedSubtasks}/{task.subtaskCount} subtarefas
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {expandedTasks.has(task.id) && task.subtasks.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1 border-l-2 border-border pl-3">
                        {task.subtasks.map(subtask => (
                          <div
                            key={subtask.id}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md bg-card border border-border text-sm cursor-pointer hover:bg-muted",
                              subtask.status === 'done' && "opacity-60"
                            )}
                            onClick={() => onEdit(subtask)}
                          >
                            <Checkbox
                              checked={subtask.status === 'done'}
                              onCheckedChange={() => {}}
                              onClick={(e) => toggleSubtaskComplete(subtask, e as unknown as React.MouseEvent)}
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={cn(
                                "text-foreground",
                                subtask.status === 'done' && "line-through"
                              )}>
                                {subtask.title}
                              </span>
                            </div>
                            {subtask.due_date && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatDueDate(subtask.due_date)}
                              </span>
                            )}
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
