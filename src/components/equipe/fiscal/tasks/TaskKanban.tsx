 import { useState } from 'react';
 import { FiscalTask, FiscalTaskStatus, useUpdateFiscalTask } from '@/hooks/useFiscalTasks';
 import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { statusList } from '@/lib/taskStatusColors';
 
 interface TaskKanbanProps {
   tasks: FiscalTask[];
   onEdit: (task: FiscalTask) => void;
   onDelete: (taskId: string) => void;
   onReassign: (task: FiscalTask) => void;
 }
 
const columns = statusList.map(s => ({
  status: s.key,
  label: s.label,
  color: s.bg,
}));
 
 export const TaskKanban = ({ tasks, onEdit, onDelete, onReassign }: TaskKanbanProps) => {
   const [draggedTask, setDraggedTask] = useState<FiscalTask | null>(null);
   const updateTask = useUpdateFiscalTask();
 
  const tasksWithChildren = new Set(tasks.filter(t => t.parent_task_id).map(t => t.parent_task_id));

  const getTasksByStatus = (status: FiscalTaskStatus) => 
    tasks.filter(t => t.status === status && !tasksWithChildren.has(t.id));
 
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
         const columnTasks = getTasksByStatus(column.status);
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
                       <div
                         key={task.id}
                         draggable
                         onDragStart={(e) => handleDragStart(e, task)}
                         onDragEnd={handleDragEnd}
                         className={cn(
                           "cursor-grab active:cursor-grabbing",
                           draggedTask?.id === task.id && "opacity-50"
                         )}
                       >
                         <TaskCard
                           task={task}
                           onEdit={onEdit}
                           onDelete={onDelete}
                           onReassign={onReassign}
                           allTasks={tasks}
                           compact
                         />
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