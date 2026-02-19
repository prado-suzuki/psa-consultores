import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserPlus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Repeat,
  Plus,
  ListTree,
  ArrowUp,
  Building2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FiscalTask } from '@/hooks/useFiscalTasks';

interface TaskCardProps {
  task: FiscalTask;
  onEdit: (task: FiscalTask) => void;
  onDelete: (taskId: string) => void;
  onReassign: (task: FiscalTask) => void;
  onStatusChange?: (taskId: string, status: FiscalTask['status']) => void;
  onAddSubtask?: (parentTask: FiscalTask) => void;
  allTasks?: FiscalTask[];
  compact?: boolean;
}

const priorityColors = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

const priorityLabels = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const statusIcons = {
  backlog: Circle,
  todo: Circle,
  in_progress: AlertCircle,
  review: Clock,
  done: CheckCircle2,
};

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export const TaskCard = ({ 
  task, 
  onEdit, 
  onDelete, 
  onReassign, 
  onStatusChange,
  onAddSubtask,
  allTasks = [],
  compact = false 
}: TaskCardProps) => {
  const StatusIcon = statusIcons[task.status];
  const isFixedEvent = task.category === 'fixed_event';

  const subtasks = allTasks.filter(t => t.parent_task_id === task.id);
  const totalSubtasks = subtasks.length;
  const doneSubtasks = subtasks.filter(s => s.status === 'done').length;

  const parentTask = task.parent_task_id
    ? allTasks.find(t => t.id === task.parent_task_id)
    : null;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const tags = task.tags?.filter(Boolean) || [];

  if (compact) {
    return (
      <div 
        className={cn(
          "p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow",
          isFixedEvent && "border-l-4 border-l-purple-500"
        )}
      >
        <div 
          className="cursor-pointer"
          onClick={() => onEdit(task)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{task.title}</p>
              {task.due_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", getTagColor(tag))}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {task.assigned_to_name && (
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
                  {getInitials(task.assigned_to_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {task.assigned_to_name}
              </span>
            </div>
          )}

          {/* Contribuinte */}
          {task.contribuinte?.nome_razao_social && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {task.contribuinte.nome_razao_social}
              </span>
            </div>
          )}
        </div>

        {/* Parent task badge for subtasks */}
        {parentTask && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground flex items-center gap-0.5 truncate max-w-full">
              <ArrowUp className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{parentTask.title}</span>
            </span>
          </div>
        )}

        {/* Priority badge below parent badge */}
        <div className="mt-2">
          <Badge className={cn("text-xs", priorityColors[task.priority])}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>

        {/* Subtasks count (non-expandable) */}
        {totalSubtasks > 0 && (
          <div className="mt-2 border-t pt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListTree className="h-3 w-3" />
            <span>{doneSubtasks}/{totalSubtasks} subtarefa{totalSubtasks > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      isFixedEvent && "border-l-4 border-l-purple-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={cn(
                "h-4 w-4",
                task.status === 'done' ? 'text-emerald-500' : 'text-muted-foreground'
              )} />
              <h4 className="font-medium truncate">{task.title}</h4>
              {task.is_recurring && (
                <Repeat className="h-3 w-3 text-muted-foreground" />
              )}
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {task.description}
              </p>
            )}

            <div className="flex items-center flex-wrap gap-2">
              <Badge className={cn(priorityColors[task.priority])}>
                {priorityLabels[task.priority]}
              </Badge>
              
              {isFixedEvent && (
                <Badge variant="outline" className="border-purple-300 text-purple-700">
                  Evento Fixo
                </Badge>
              )}

              {totalSubtasks > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ListTree className="h-3 w-3" />
                  {doneSubtasks}/{totalSubtasks} subtarefa{totalSubtasks > 1 ? 's' : ''}
                </div>
              )}

              {task.due_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                  {task.due_time && (
                    <>
                      <Clock className="h-3 w-3 ml-1" />
                      {task.due_time.slice(0, 5)}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getTagColor(tag))}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Contribuinte */}
            {task.contribuinte?.nome_razao_social && (
              <div className="flex items-center gap-1.5 mt-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {task.contribuinte.nome_razao_social}
                </span>
              </div>
            )}

            {/* Parent task badge for subtasks */}
            {parentTask && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground flex items-center gap-1 truncate max-w-full">
                  <ArrowUp className="h-3 w-3 shrink-0" />
                  <span className="truncate">{parentTask.title}</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task.assigned_to_name && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                  {getInitials(task.assigned_to_name)}
                </AvatarFallback>
              </Avatar>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {!task.parent_task_id && onAddSubtask && (
                  <DropdownMenuItem onClick={() => onAddSubtask(task)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Subtarefa
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onReassign(task)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Reatribuir
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(task.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};