import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { parseDate, getTodayBrazil } from '@/lib/dateUtils';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string;
  status: string;
  estimated_hours: number | null;
  task_code: string | null;
  profile?: { first_name: string; last_name: string };
}

interface SprintCalendarProps {
  deliverables: Deliverable[];
  onEdit: (deliverable: Deliverable) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-slate-400',
  in_progress: 'bg-amber-500',
  completed: 'bg-green-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
};

export const SprintCalendar = ({ deliverables, onEdit }: SprintCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDeliverablesForDate = (date: Date) => {
    return deliverables.filter(d =>
      d.due_date && isSameDay(parseDate(d.due_date), date)
    );
  };

  const selectedDateDeliverables = selectedDate ? getDeliverablesForDate(selectedDate) : [];

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
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Pendente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Em Progresso</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Concluído</span>
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

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[700px]">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map(day => {
            const dayDeliverables = getDeliverablesForDate(day);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={day.toISOString()}
                onClick={() => dayDeliverables.length > 0 && setSelectedDate(day)}
                className={cn(
                  "min-h-[80px] sm:min-h-[100px] p-1 border rounded-lg transition-colors flex flex-col items-start overflow-hidden",
                  isToday && "border-emerald-500 bg-emerald-50",
                  dayDeliverables.length > 0 && "hover:bg-muted/50 cursor-pointer",
                  dayDeliverables.length === 0 && "cursor-default",
                  selectedDate && isSameDay(day, selectedDate) && "ring-2 ring-emerald-500"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  isToday && "text-emerald-700"
                )}>
                  {format(day, 'd')}
                </span>
                {dayDeliverables.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1 w-full">
                    {dayDeliverables.slice(0, 2).map(d => (
                      <div key={d.id} className="flex items-center gap-1 w-full">
                        <div className={cn("w-1 h-4 rounded-full flex-shrink-0", statusColors[d.status] || 'bg-slate-400')} />
                        <span className="text-[10px] leading-tight truncate">{d.title}</span>
                      </div>
                    ))}
                    {dayDeliverables.length > 2 && (
                      <span className="text-[10px] text-muted-foreground pl-2">+{dayDeliverables.length - 2} mais</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
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
              {selectedDateDeliverables.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum entregável para este dia
                </p>
              ) : (
                selectedDateDeliverables.map(d => (
                  <div
                    key={d.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {d.task_code && (
                            <span className="text-xs font-mono text-muted-foreground">{d.task_code}</span>
                          )}
                          <Badge
                            className={cn(
                              "text-white text-xs",
                              statusColors[d.status] || 'bg-slate-400'
                            )}
                          >
                            {statusLabels[d.status] || d.status}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{d.title}</p>
                        {d.profile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {d.profile.first_name} {d.profile.last_name}
                          </p>
                        )}
                        {d.estimated_hours != null && (
                          <p className="text-xs text-muted-foreground">{d.estimated_hours}h estimadas</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => onEdit(d as any)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};
