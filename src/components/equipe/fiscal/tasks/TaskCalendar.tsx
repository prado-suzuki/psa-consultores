 import { useState, useMemo } from 'react';
 import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { ChevronLeft, ChevronRight } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { cn } from '@/lib/utils';
 import { FiscalTask } from '@/hooks/useFiscalTasks';
 import { TaskCard } from './TaskCard';
 
 interface TaskCalendarProps {
   tasks: FiscalTask[];
   onEdit: (task: FiscalTask) => void;
   onDelete: (taskId: string) => void;
   onReassign: (task: FiscalTask) => void;
 }
 
 const priorityColors = {
   urgent: 'bg-red-500',
   high: 'bg-amber-500',
   medium: 'bg-blue-500',
   low: 'bg-slate-400',
 };
 
 export const TaskCalendar = ({ tasks, onEdit, onDelete, onReassign }: TaskCalendarProps) => {
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
 
   const days = useMemo(() => {
     const start = startOfMonth(currentMonth);
     const end = endOfMonth(currentMonth);
     return eachDayOfInterval({ start, end });
   }, [currentMonth]);
 
   const getTasksForDate = (date: Date) => {
     return tasks.filter(task => 
       task.due_date && isSameDay(new Date(task.due_date), date)
     );
   };
 
   const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
 
   const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
   const firstDayOfMonth = startOfMonth(currentMonth).getDay();
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <h3 className="text-lg font-semibold">
           {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
         </h3>
         <div className="flex gap-2">
           <Button
             variant="outline"
             size="icon"
             onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
           >
             <ChevronLeft className="h-4 w-4" />
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => setCurrentMonth(new Date())}
           >
             Hoje
           </Button>
           <Button
             variant="outline"
             size="icon"
             onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
           >
             <ChevronRight className="h-4 w-4" />
           </Button>
         </div>
       </div>
 
       <div className="grid grid-cols-7 gap-1">
         {weekDays.map(day => (
           <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
             {day}
           </div>
         ))}
         
         {Array.from({ length: firstDayOfMonth }).map((_, i) => (
           <div key={`empty-${i}`} className="aspect-square" />
         ))}
 
         {days.map(day => {
           const dayTasks = getTasksForDate(day);
           const isToday = isSameDay(day, new Date());
           const isCurrentMonth = isSameMonth(day, currentMonth);
           
           return (
             <button
               key={day.toISOString()}
               onClick={() => setSelectedDate(day)}
               className={cn(
                 "aspect-square p-1 border rounded-lg hover:bg-muted/50 transition-colors flex flex-col",
                 isToday && "border-emerald-500 bg-emerald-50",
                 !isCurrentMonth && "opacity-50",
                 selectedDate && isSameDay(day, selectedDate) && "ring-2 ring-emerald-500"
               )}
             >
               <span className={cn(
                 "text-sm font-medium",
                 isToday && "text-emerald-700"
               )}>
                 {format(day, 'd')}
               </span>
               {dayTasks.length > 0 && (
                 <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                   {dayTasks.slice(0, 3).map(task => (
                     <div
                       key={task.id}
                       className={cn(
                         "w-2 h-2 rounded-full",
                         task.category === 'fixed_event' ? 'bg-purple-500' : priorityColors[task.priority]
                       )}
                     />
                   ))}
                   {dayTasks.length > 3 && (
                     <span className="text-xs text-muted-foreground">+{dayTasks.length - 3}</span>
                   )}
                 </div>
               )}
             </button>
           );
         })}
       </div>
 
       <Sheet open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
         <SheetContent>
           <SheetHeader>
             <SheetTitle>
               {selectedDate && format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
             </SheetTitle>
           </SheetHeader>
           <ScrollArea className="h-[calc(100vh-100px)] mt-4">
             <div className="space-y-3 pr-4">
               {selectedDateTasks.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">
                   Nenhuma tarefa para este dia
                 </p>
               ) : (
                 selectedDateTasks.map(task => (
                   <TaskCard
                     key={task.id}
                     task={task}
                     onEdit={onEdit}
                     onDelete={onDelete}
                     onReassign={onReassign}
                   />
                 ))
               )}
             </div>
           </ScrollArea>
         </SheetContent>
       </Sheet>
     </div>
   );
 };