 import { format, isToday } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Badge } from '@/components/ui/badge';
 import { cn } from '@/lib/utils';
 import { FiscalTask, useUpdateFiscalTask } from '@/hooks/useFiscalTasks';
 
 interface TaskTodayViewProps {
   tasks: FiscalTask[];
   onEdit: (task: FiscalTask) => void;
 }
 
 const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
 
 const priorityColors = {
   urgent: 'text-red-600',
   high: 'text-amber-600',
   medium: 'text-blue-600',
   low: 'text-slate-600',
 };
 
 const priorityLabels = {
   urgent: 'Urgente',
   high: 'Alta',
   medium: 'Média',
   low: 'Baixa',
 };
 
 export const TaskTodayView = ({ tasks, onEdit }: TaskTodayViewProps) => {
   const updateTask = useUpdateFiscalTask();
 
   const todayTasks = tasks
     .filter(task => task.due_date && isToday(new Date(task.due_date)))
     .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
 
   const pendingTasks = todayTasks.filter(t => t.status !== 'done');
   const completedTasks = todayTasks.filter(t => t.status === 'done');
 
   const handleToggleComplete = (task: FiscalTask) => {
     const newStatus = task.status === 'done' ? 'todo' : 'done';
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
             <AlertCircle className="h-4 w-4 inline mr-1 text-amber-500" />
             {pendingTasks.length} pendentes
           </span>
           <span className="text-muted-foreground">
             <CheckCircle2 className="h-4 w-4 inline mr-1 text-emerald-500" />
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