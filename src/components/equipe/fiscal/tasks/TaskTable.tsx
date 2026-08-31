import { useState, Fragment } from 'react';
import { format } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
 import { ptBR } from 'date-fns/locale';
 import { ChevronDown, ChevronRight, FolderInput, MoreHorizontal, Edit, Trash2, UserPlus, Plus } from 'lucide-react';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { OrgTask, OrgTaskStatus, OrgTaskPriority, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { statusColors } from '@/lib/taskStatusColors';
import { AreaKey } from '@/config/areaCategories';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { TaskCompletionHoursDialog } from '@/components/equipe/fiscal/tasks/TaskCompletionHoursDialog';
import { TaskStatusTransitionDialog } from '@/components/equipe/fiscal/tasks/TaskStatusTransitionDialog';
 import { useTaskCompletionHours } from '@/hooks/useTaskCompletionHours';
 import { useTaskStatusTransition } from '@/hooks/useTaskStatusTransition';
import { toast } from 'sonner';
import { BarraDeMes } from '@/components/shared/BarraDeMes';
import type { PeriodoDeTarefas } from '@/hooks/usePeriodoDeTarefas';

interface TaskTableProps {
  tasks: OrgTask[];
  area: AreaKey;
  onEdit: (task: OrgTask) => void;
  onDelete: (taskId: string) => void;
  onReassign: (task: OrgTask) => void;
  onMove?: (task: OrgTask) => void;
  onAddSubtask?: (parentTask: OrgTask) => void;
  currentUserId?: string | null;
  /** O mes e do painel: ele atravessa Lista, Tabela e Calendario. */
  periodo: PeriodoDeTarefas;
}
 
 const priorityColors = {
   urgent: 'bg-destructive/10 text-destructive',
   high: 'bg-warning/10 text-warning',
   medium: 'bg-info/10 text-info',
   low: 'bg-muted text-foreground',
 };
 
 const priorityLabels = {
   urgent: 'Urgente',
   high: 'Alta',
   medium: 'Média',
   low: 'Baixa',
 };
 
const statusLabels = Object.fromEntries(
  Object.entries(statusColors).map(([k, v]) => [k, v.label])
) as Record<OrgTaskStatus, string>;
 
 
 export const TaskTable = ({ tasks, area, onEdit, onDelete, onReassign, onMove, onAddSubtask, currentUserId, periodo }: TaskTableProps) => {
   const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
   const updateTask = useUpdateOrgTask(area);
   const conclusao = useTaskCompletionHours();
   const transicao = useTaskStatusTransition();
 
   const parentTasks = tasks.filter(t => !t.parent_task_id);
   const getSubtasks = (parentId: string) => tasks.filter(t => t.parent_task_id === parentId);
 
   const toggleExpand = (taskId: string) => {
     setExpandedTasks(prev => {
       const next = new Set(prev);
       if (next.has(taskId)) {
         next.delete(taskId);
       } else {
         next.add(taskId);
       }
       return next;
     });
   };
 
   const handleStatusChange = (task: OrgTask, status: OrgTaskStatus) => {
     if (status === task.status) return;
     // Revisão e ajuste passam pelo diálogo (revisor e detalhamento obrigatórios),
     // igual ao quadro: é ele quem grava.
     if (!transicao.pedirDetalhes(task, status)) return;
     if (status === 'done' && isDelegatedOrgTaskReviewer(task, currentUserId)) {
       toast.error('O revisor não pode concluir a tarefa. Devolva-a para ajustes.');
       return;
     }
     if (status === 'done' && !conclusao.pedirHoras(task)) return;
     updateTask.mutate({ id: task.id, status });
   };
 
   const handlePriorityChange = (taskId: string, priority: OrgTaskPriority) => {
     updateTask.mutate({ id: taskId, priority });
   };
 
   const getInitials = (name: string | null) => {
     if (!name) return '?';
     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
   };
 
   const renderTaskRow = (task: OrgTask, isSubtask = false) => {
     const subtasks = getSubtasks(task.id);
     const hasSubtasks = subtasks.length > 0;
     const isExpanded = expandedTasks.has(task.id);
 
     return (
       <>
         <TableRow key={task.id} className={cn(isSubtask && "bg-muted/30")}>
           <TableCell>
             {task.client?.nome ? (
               <span className="text-sm">{task.client.nome}</span>
             ) : (
               <span className="text-muted-foreground">-</span>
             )}
           </TableCell>
           <TableCell className={cn("font-medium", isSubtask && "pl-10")}>
             <div className="flex items-center gap-2">
               {hasSubtasks && (
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-6 w-6"
                   onClick={() => toggleExpand(task.id)}
                 >
                   {isExpanded ? (
                     <ChevronDown className="h-4 w-4" />
                   ) : (
                     <ChevronRight className="h-4 w-4" />
                   )}
                 </Button>
               )}
               <span className={cn(
                 task.category === 'fixed_event' && "text-tag-c"
               )}>
                 {task.title}
               </span>
               {task.category === 'fixed_event' && (
                 <Badge variant="outline" className="border-tag-c/40 text-tag-c text-xs">
                   Fixo
                 </Badge>
               )}
             </div>
           </TableCell>
            <TableCell>
              <Select
                value={task.status}
                 onValueChange={(value) => handleStatusChange(task, value as OrgTaskStatus)}
              >
                <SelectTrigger className="h-8 w-36">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-medium",
                    statusColors[task.status].combined
                  )}>
                    {statusLabels[task.status]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                   {Object.entries(statusLabels)
                     .filter(([value]) => !(value === 'done' && isDelegatedOrgTaskReviewer(task, currentUserId)))
                     .map(([value, label]) => (
                     <SelectItem key={value} value={value}>
                       <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", statusColors[value as OrgTaskStatus].combined)}>
                         {label}
                       </span>
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </TableCell>
           <TableCell>
             <Select
               value={task.priority}
               onValueChange={(value) => handlePriorityChange(task.id, value as OrgTaskPriority)}
             >
               <SelectTrigger className="h-8 w-28">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {Object.entries(priorityLabels).map(([value, label]) => (
                   <SelectItem key={value} value={value}>{label}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </TableCell>
           <TableCell>
             {task.assigned_to_name ? (
               <div className="flex items-center gap-2">
                 <Avatar className="h-6 w-6">
                   <AvatarFallback className="text-xs bg-success/10 text-success">
                     {getInitials(task.assigned_to_name)}
                   </AvatarFallback>
                 </Avatar>
                 <span className="text-sm">{task.assigned_to_name}</span>
               </div>
             ) : (
               <span className="text-muted-foreground">-</span>
             )}
           </TableCell>
           <TableCell>
             {task.due_date ? (
               <span className="text-sm">
                 {format(parseDate(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
               </span>
             ) : (
               <span className="text-muted-foreground">-</span>
             )}
           </TableCell>
           <TableCell>
             {task.project?.name ? (
               <span className="text-sm">{task.project.name}</span>
             ) : (
               <span className="text-muted-foreground">-</span>
             )}
           </TableCell>
           <TableCell>
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
                  {!isSubtask && onAddSubtask && (
                    <DropdownMenuItem onClick={() => onAddSubtask(task)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Subtarefa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onReassign(task)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Reatribuir
                  </DropdownMenuItem>
                  {onMove && (
                    <DropdownMenuItem onClick={() => onMove(task)}>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Mover para outro projeto
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(task.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
           </TableCell>
         </TableRow>
         {hasSubtasks && isExpanded && subtasks.map(subtask => <Fragment key={subtask.id}>{renderTaskRow(subtask, true)}</Fragment>)}
       </>
     );
   };
 
   // `bg-card` explicito: o container da tabela sempre foi transparente, e isso
   // nao aparecia porque as linhas da Table carregam fundo proprio. Com a barra
   // do mes em cima, a faixa dela ficava no fundo da PAGINA — a tabela era a
   // unica das quatro abas sem a superficie do card.
   return (
     <div className="border rounded-lg overflow-hidden bg-card">
       <BarraDeMes periodo={periodo} />
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead className="w-[180px]">Cliente</TableHead>
             <TableHead className="w-[300px]">Título</TableHead>
             <TableHead className="w-[140px]">Status</TableHead>
             <TableHead className="w-[120px]">Prioridade</TableHead>
             <TableHead className="w-[180px]">Responsável</TableHead>
              <TableHead className="w-[120px]">Data de Vencimento</TableHead>
              <TableHead className="w-[160px]">Projeto</TableHead>
              <TableHead className="w-[60px]"></TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {parentTasks.length === 0 ? (
             <TableRow>
               <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                 Nenhuma tarefa encontrada
               </TableCell>
             </TableRow>
           ) : (
             parentTasks.map(task => <Fragment key={task.id}>{renderTaskRow(task)}</Fragment>)
           )}
         </TableBody>
       </Table>
       <TaskCompletionHoursDialog
         task={conclusao.taskPendente}
         area={area}
         onClose={conclusao.fechar}
       />
       <TaskStatusTransitionDialog
         open={!!transicao.transicaoPendente}
         onOpenChange={nextOpen => { if (!nextOpen) transicao.fechar(); }}
         task={transicao.transicaoPendente?.task || null}
         status={transicao.transicaoPendente?.status || 'review'}
         area={area}
       />
     </div>
   );
 };
