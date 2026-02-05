 import { useMemo } from 'react';
 import { format, addWeeks, startOfWeek, endOfWeek, isWithinInterval, addMonths, startOfMonth, endOfMonth, isAfter } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { ChevronDown } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { FiscalTask } from '@/hooks/useFiscalTasks';
 import { TaskCard } from './TaskCard';
 
 interface TaskFutureViewProps {
   tasks: FiscalTask[];
   onEdit: (task: FiscalTask) => void;
   onDelete: (taskId: string) => void;
   onReassign: (task: FiscalTask) => void;
 }
 
 export const TaskFutureView = ({ tasks, onEdit, onDelete, onReassign }: TaskFutureViewProps) => {
   const today = new Date();
 
   const futureTasks = useMemo(() => {
     return tasks.filter(task => 
       task.due_date && 
       isAfter(new Date(task.due_date), today) &&
       task.status !== 'done'
     );
   }, [tasks, today]);
 
   const weekGroups = useMemo(() => {
     const groups: { label: string; start: Date; end: Date; tasks: FiscalTask[] }[] = [];
     
     for (let i = 0; i < 12; i++) {
       const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 0 });
       const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 0 });
       
       const weekTasks = futureTasks.filter(task => 
         task.due_date && isWithinInterval(new Date(task.due_date), { start: weekStart, end: weekEnd })
       );
 
       if (i === 0) {
         groups.push({
           label: 'Esta semana',
           start: weekStart,
           end: weekEnd,
           tasks: weekTasks,
         });
       } else if (i === 1) {
         groups.push({
           label: 'Próxima semana',
           start: weekStart,
           end: weekEnd,
           tasks: weekTasks,
         });
       } else {
         groups.push({
           label: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
           start: weekStart,
           end: weekEnd,
           tasks: weekTasks,
         });
       }
     }
 
     return groups.filter(g => g.tasks.length > 0);
   }, [futureTasks, today]);
 
   if (futureTasks.length === 0) {
     return (
       <Card>
         <CardContent className="py-12 text-center">
           <p className="text-muted-foreground">
             Nenhuma tarefa futura programada
           </p>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <h2 className="text-xl font-semibold">Tarefas Futuras</h2>
         <Badge variant="secondary">{futureTasks.length} tarefas</Badge>
       </div>
 
       <div className="space-y-3">
         {weekGroups.map((group, index) => (
           <Collapsible key={index} defaultOpen={index < 3}>
             <Card>
               <CollapsibleTrigger className="w-full">
                 <CardHeader className="pb-3">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-base font-medium flex items-center gap-2">
                       <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180" />
                       {group.label}
                     </CardTitle>
                     <Badge variant="outline">{group.tasks.length}</Badge>
                   </div>
                 </CardHeader>
               </CollapsibleTrigger>
               <CollapsibleContent>
                 <CardContent className="pt-0 space-y-2">
                   {group.tasks.map(task => (
                     <TaskCard
                       key={task.id}
                       task={task}
                       onEdit={onEdit}
                       onDelete={onDelete}
                       onReassign={onReassign}
                       compact
                     />
                   ))}
                 </CardContent>
               </CollapsibleContent>
             </Card>
           </Collapsible>
         ))}
       </div>
     </div>
   );
 };