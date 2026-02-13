 import { useState } from 'react';
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
  ListTree
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
  subtaskCount?: number;
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
 
export const TaskCard = ({ 
  task, 
  onEdit, 
  onDelete, 
  onReassign, 
  onStatusChange,
  onAddSubtask,
  subtaskCount = 0,
  compact = false 
}: TaskCardProps) => {
   const StatusIcon = statusIcons[task.status];
   const isFixedEvent = task.category === 'fixed_event';
 
   const getInitials = (name: string | null) => {
     if (!name) return '?';
     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
   };
 
   if (compact) {
     return (
       <div 
         className={cn(
           "p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer",
           isFixedEvent && "border-l-4 border-l-purple-500"
         )}
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
           <Badge className={cn("text-xs shrink-0", priorityColors[task.priority])}>
             {priorityLabels[task.priority]}
           </Badge>
         </div>
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

                {subtaskCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ListTree className="h-3 w-3" />
                    {subtaskCount} subtarefa{subtaskCount > 1 ? 's' : ''}
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