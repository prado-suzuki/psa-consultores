import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { parseDate, getTodayBrazil } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FiscalTask } from '@/hooks/useFiscalTasks';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { TaskCard } from './TaskCard';

interface TaskCalendarProps {
  tasks: FiscalTask[];
  onEdit: (task: FiscalTask) => void;
  onDelete: (taskId: string) => void;
  onReassign: (task: FiscalTask) => void;
}

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
      task.due_date && isSameDay(parseDate(task.due_date), date)
    );
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const today = getTodayBrazil();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-3 mr-4 text-xs text-muted-foreground">
            {statusList.map(s => (
              <span key={s.key} className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", s.bgSolid)} />
                {s.label}
              </span>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
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
          <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px]" />
        ))}

        {days.map(day => {
          const dayTasks = getTasksForDate(day);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => dayTasks.length > 0 && setSelectedDate(day)}
              className={cn(
                "min-h-[80px] sm:min-h-[100px] p-1 border rounded-lg transition-colors flex flex-col items-start overflow-hidden",
                isToday && "border-emerald-500 bg-emerald-50",
                dayTasks.length > 0 && "hover:bg-muted/50 cursor-pointer",
                dayTasks.length === 0 && "cursor-default",
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
                <div className="flex flex-col gap-0.5 mt-1 w-full">
                  {dayTasks.slice(0, 2).map(task => (
                    <div key={task.id} className="flex items-center gap-1 w-full">
                      <div className={cn("w-1 h-4 rounded-full flex-shrink-0", statusColors[task.status]?.bgSolid || 'bg-slate-400')} />
                      <span className="text-[10px] leading-tight truncate">{task.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[10px] text-muted-foreground pl-2">+{dayTasks.length - 2} mais</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Sheet open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <SheetContent className="sm:max-w-md">
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
