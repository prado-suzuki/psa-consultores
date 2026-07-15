import { format, isToday } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
 import { ptBR } from 'date-fns/locale';
 import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Badge } from '@/components/ui/badge';
 import { cn } from '@/lib/utils';
 import { OrgTask, useUpdateOrgTask } from '@/hooks/useOrgTasks';
 import { AreaKey } from '@/config/areaCategories';
 import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
 import { toast } from 'sonner';

 interface TaskTodayViewProps {
   tasks: OrgTask[];
    area: AreaKey;
    onEdit: (task: OrgTask) => void;
    currentUserId?: string | null;
 }
 
 const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
 
 const priorityColors = {
   urgent: 'text-destructive',
   high: 'text-warning',
   medium: 'text-info',
   low: 'text-muted-foreground',
 };
 
 const priorityLabels = {
   urgent: 'Urgente',
   high: 'Alta',
   medium: 'Média',
   low: 'Baixa',
 };
 
 export const TaskTodayView = ({ tasks, area, onEdit, currentUserId }: TaskTodayViewProps) => {
   const updateTask = useUpdateOrgTask(area);
 
   const todayTasks = tasks
     .filter(task => task.due_date && isToday(parseDate(task.due_date)))
     .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
 
   const pendingTasks = todayTasks.filter(t => t.status !== 'done');
   const completedTasks = todayTasks.filter(t => t.status === 'done');
 
    const handleToggleComplete = (task: OrgTask) => {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      if (newStatus === 'done' && isDelegatedOrgTaskReviewer(task, currentUserId)) {
        toast.error('O revisor não pode concluir a tarefa. Devolva-a para ajustes.');
        return;
      }
      updateTask.mutate({ id: task.id, status: newStatus });
   };
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h2 className="text-xl font-semibold">
           {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
         </h2>
         <div className="flex gap-4 text-sm">
           <span className="text-muted-foreground">
             <AlertCircle className="h-4 w-4 inline mr-1 text-warning" />
             {pendingTasks.length} pendentes
           </span>
           <span className="text-muted-foreground">
             <CheckCircle2 className="h-4 w-4 inline mr-1 text-success" />
             {completedTasks.length} concluídas
           </span>
         </div>
       </div>
 
       {todayTasks.length === 0 ? (
         <Card>
           <CardContent className="py-12 text-center">
             <p className="text-muted-foreground">
               Nenhuma tarefa para hoje. Aproveite!
             </p>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-3">
           {todayTasks.map(task => (
             <Card 
               key={task.id}
               className={cn(
                 "transition-all cursor-pointer hover:shadow-md",
                 task.status === 'done' && "opacity-60"
               )}
               onClick={() => onEdit(task)}
             >
               <CardContent className="p-4">
                 <div className="flex items-center gap-4">
                   <Checkbox
                      checked={task.status === 'done'}
                      disabled={task.status !== 'done' && isDelegatedOrgTaskReviewer(task, currentUserId)}
                     onCheckedChange={() => handleToggleComplete(task)}
                     onClick={(e) => e.stopPropagation()}
                   />
                   <div className="flex-1 min-w-0">
                     <p className={cn(
                       "font-medium",
                       task.status === 'done' && "line-through text-muted-foreground"
                     )}>
                       {task.title}
                     </p>
                     {task.description && (
                       <p className="text-sm text-muted-foreground truncate">
                         {task.description}
                       </p>
                     )}
                   </div>
                   <div className="flex items-center gap-2">
                     {task.due_time && (
                       <span className="text-sm text-muted-foreground">
                         {task.due_time.slice(0, 5)}
                       </span>
                     )}
                     <Badge variant="outline" className={priorityColors[task.priority]}>
                       {priorityLabels[task.priority]}
                     </Badge>
                     {task.category === 'fixed_event' && (
                       <Badge variant="outline" className="border-purple-300 text-purple-700">
                         Fixo
                       </Badge>
                     )}
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
     </div>
   );
 };
