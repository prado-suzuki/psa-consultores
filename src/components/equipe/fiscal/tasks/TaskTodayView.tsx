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
 import { TaskCompletionHoursDialog } from '@/components/equipe/fiscal/tasks/TaskCompletionHoursDialog';
 import { useTaskCompletionHours } from '@/hooks/useTaskCompletionHours';
 import { tarefaRichTextToPlain } from '@/lib/tarefaRichText';
 import { toast } from 'sonner';
import { taskPriorityConfig } from '@/lib/taskPriorityColors';

 interface TaskTodayViewProps {
   tasks: OrgTask[];
    area: AreaKey;
    onEdit: (task: OrgTask) => void;
    currentUserId?: string | null;
 }
 
 const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
 
 /* Os dois mapas locais de prioridade sairam daqui em 11/09/2026, na mesma
    passada do TaskCard e do TaskTable. O de COR era o unico dos quatro que
    pintava SO a letra (`text-destructive`, sem fundo): a pilula ficava
    diferente da do cartao e da do modal para a mesma tarefa. O mapa passou a
    ter um campo `texto` para este caso, entao a tela continua so-de-letra e a
    ESCADA passa a ser a mesma das outras tres: neutro -> fila -> alerta ->
    ajuste. O `medium` era --info, azul que nao pertence a area nenhuma. */
 
 export const TaskTodayView = ({ tasks, area, onEdit, currentUserId }: TaskTodayViewProps) => {
   const updateTask = useUpdateOrgTask(area);
   const conclusao = useTaskCompletionHours();

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
      if (newStatus === 'done' && !conclusao.pedirHoras(task)) return;
      updateTask.mutate({ id: task.id, status: newStatus });
   };
 
   return (
     <div className="space-y-6">
       {/* `flex-wrap`: a data por extenso mais os dois contadores passam de 450px,
           e sem quebra o "concluídas" era CORTADO na borda — o `<main>` do layout
           é `overflow-hidden`, então não havia nem rolagem para alcançá-lo.
           Apareceu na validação da fase 1, que é justamente a tela em que o
           celular passou a abrir. */}
       <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
         <h2 className="text-lg font-semibold sm:text-xl">
           {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
         </h2>
         <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
           {todayTasks.map(task => {
             const descricaoPreview = tarefaRichTextToPlain(task.description);
             return (
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
                     {/* Uma linha só: a descrição pode ser rich text (da tarefa
                         ou do chamado que a gerou), então vai em texto plano. */}
                     {descricaoPreview && (
                       <p className="text-sm text-muted-foreground truncate">
                         {descricaoPreview}
                       </p>
                     )}
                   </div>
                   <div className="flex items-center gap-2">
                     {task.due_time && (
                       <span className="text-sm text-muted-foreground">
                         {task.due_time.slice(0, 5)}
                       </span>
                     )}
                     <Badge variant="outline" className={taskPriorityConfig(task.priority).texto}>
                       {taskPriorityConfig(task.priority).label}
                     </Badge>
                     {task.category === 'fixed_event' && (
                       <Badge variant="outline" className="border-tag-c/40 text-tag-c">
                         Fixo
                       </Badge>
                     )}
                   </div>
                 </div>
               </CardContent>
             </Card>
             );
           })}
         </div>
       )}
       <TaskCompletionHoursDialog
         task={conclusao.taskPendente}
         area={area}
         onClose={conclusao.fechar}
       />
     </div>
   );
 };
