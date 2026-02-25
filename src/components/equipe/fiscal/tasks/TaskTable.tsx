import { useState, Fragment } from 'react';
import { format } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
 import { ptBR } from 'date-fns/locale';
 import { ChevronDown, ChevronRight, MoreHorizontal, Edit, Trash2, UserPlus, Plus } from 'lucide-react';
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
import { FiscalTask, FiscalTaskStatus, FiscalTaskPriority, useUpdateFiscalTask } from '@/hooks/useFiscalTasks';
import { statusColors } from '@/lib/taskStatusColors';
 
interface TaskTableProps {
  tasks: FiscalTask[];
  onEdit: (task: FiscalTask) => void;
  onDelete: (taskId: string) => void;
  onReassign: (task: FiscalTask) => void;
  onAddSubtask?: (parentTask: FiscalTask) => void;
}
 
 const priorityColors = {
   urgent: 'bg-red-100 text-red-700',
   high: 'bg-amber-100 text-amber-700',
   medium: 'bg-blue-100 text-blue-700',
   low: 'bg-slate-100 text-slate-700',
 };
 
 const priorityLabels = {
   urgent: 'Urgente',
   high: 'Alta',
   medium: 'Média',
   low: 'Baixa',
 };
 
const statusLabels = Object.fromEntries(
  Object.entries(statusColors).map(([k, v]) => [k, v.label])
) as Record<FiscalTaskStatus, string>;
 
 
 export const TaskTable = ({ tasks, onEdit, onDelete, onReassign, onAddSubtask }: TaskTableProps) => {
   const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
   const updateTask = useUpdateFiscalTask();
 
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
 
   const handleStatusChange = (taskId: string, status: FiscalTaskStatus) => {
     updateTask.mutate({ id: taskId, status });
   };
 
   const handlePriorityChange = (taskId: string, priority: FiscalTaskPriority) => {
     updateTask.mutate({ id: taskId, priority });
   };
 
   const getInitials = (name: string | null) => {
     if (!name) return '?';
     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
   };
 
   const renderTaskRow = (task: FiscalTask, isSubtask = false) => {
     const subtasks = getSubtasks(task.id);
     const hasSubtasks = subtasks.length > 0;
     const isExpanded = expandedTasks.has(task.id);
 
     return (
       <>
         <TableRow key={task.id} className={cn(isSubtask && "bg-muted/30")}>
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
                 task.category === 'fixed_event' && "text-purple-700"
               )}>
                 {task.title}
               </span>
               {task.category === 'fixed_event' && (
                 <Badge variant="outline" className="border-purple-300 text-purple-700 text-xs">
                   Fixo
                 </Badge>
               )}
             </div>
           </TableCell>
            <TableCell>
              <Select
                value={task.status}
                onValueChange={(value) => handleStatusChange(task.id, value as FiscalTaskStatus)}
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
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", statusColors[value as FiscalTaskStatus].combined)}>
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
               onValueChange={(value) => handlePriorityChange(task.id, value as FiscalTaskPriority)}
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
                   <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
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
                  <DropdownMenuItem 
                    onClick={() => onDelete(task.id)}
                    className="text-red-600"
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
 
   return (
     <div className="border rounded-lg">
       <Table>
         <TableHeader>
           <TableRow>
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
               <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                 Nenhuma tarefa encontrada
               </TableCell>
             </TableRow>
           ) : (
             parentTasks.map(task => <Fragment key={task.id}>{renderTaskRow(task)}</Fragment>)
           )}
         </TableBody>
       </Table>
     </div>
   );
 };