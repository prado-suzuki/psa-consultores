import { useState, useMemo } from 'react';
import { format, startOfMonth, startOfWeek, addDays, isSameDay, isSameMonth, addMonths } from 'date-fns';
import { parseDate, getTodayBrazil } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarraDePeriodo } from '@/components/shared/BarraDePeriodo';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { OrgTask } from '@/hooks/useOrgTasks';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { Badge } from '@/components/ui/badge';

interface TaskCalendarProps {
  tasks: OrgTask[];
  onEdit: (task: OrgTask) => void;
  onDelete: (taskId: string) => void;
  onReassign: (task: OrgTask) => void;
}

/**
 * O quadro tem semanas fixas, e é isso que faz o mês FECHAR. Antes as células
 * eram só os dias do mês, com `div` vazias no lugar dos dias anteriores ao dia
 * 1: a primeira linha começava no vazio e a última terminava no meio do nada.
 *
 * As duas variantes `nth-child` de `FECHA_A_GRADE` dependem deste número, e
 * Tailwind lê classe como TEXTO — classe montada em template string não entra
 * no bundle. Por isso elas são literais, e quem garante que continuam casando
 * com `CELULAS` é o teste, não um comentário.
 */
const SEMANAS_NO_QUADRO = 6;
export const CELULAS = SEMANAS_NO_QUADRO * 7;

/** Sem borda na coluna da direita nem na última linha: a do card fecha ali. */
export const FECHA_A_GRADE = '[&:nth-child(7n)]:border-r-0 [&:nth-child(n+36)]:border-b-0';

const TAREFAS_VISIVEIS_NA_CELULA = 2;

export const TaskCalendar = ({ tasks, onEdit, onDelete, onReassign }: TaskCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    return Array.from({ length: CELULAS }, (_, i) => addDays(inicio, i));
  }, [currentMonth]);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task =>
      task.due_date && isSameDay(parseDate(task.due_date), date)
    );
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = getTodayBrazil();

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {/* A mesma barra do Gantt, no mesmo lugar: `Hoje · ‹ › · título`, à
            esquerda. Antes o título ficava solto à esquerda e os controles na
            direita, grudados na legenda — duas telas que andam no tempo, duas
            aparências. */}
        <BarraDePeriodo
          titulo={format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          onHoje={() => setCurrentMonth(new Date())}
          onPasso={direcao => setCurrentMonth(addMonths(currentMonth, direcao))}
          rotuloAnterior="Mês anterior"
          rotuloProximo="Próximo mês"
        />

        <div className="grid grid-cols-7 border-b bg-muted/40">
          {weekDays.map(day => (
            <div
              key={day}
              className="border-r py-2 text-center text-xs font-medium text-muted-foreground [&:nth-child(7n)]:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7" data-testid="calendario-quadro">
          {days.map(day => {
            /* Dia de outro mês é CONTEXTO: existe para o mês fechar em semanas
               inteiras, não para oferecer um clique que troca de mês por
               acidente. Quem recua é o FUNDO da célula, não a cor do número —
               `muted-foreground` sobre `bg-muted/30` mede 5,03:1 nas três
               áreas, contra os 2,5:1 do cinza cru que vivia aqui. */
            if (!isSameMonth(day, currentMonth)) {
              return (
                <div
                  key={day.toISOString()}
                  data-testid="calendario-dia-de-fora"
                  className={cn(
                    'min-h-[80px] border-b border-r bg-muted/30 p-1 sm:min-h-[100px] sm:p-2',
                    FECHA_A_GRADE,
                  )}
                >
                  <span className="text-sm text-muted-foreground">{format(day, 'd')}</span>
                </div>
              );
            }

            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, today);
            const isSelected = !!selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                data-testid="calendario-dia"
                onClick={() => dayTasks.length > 0 && setSelectedDate(day)}
                className={cn(
                  'flex min-h-[80px] flex-col items-start overflow-hidden border-b border-r p-1 text-left transition-colors sm:min-h-[100px] sm:p-2',
                  FECHA_A_GRADE,
                  dayTasks.length > 0 ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default',
                  isSelected && 'bg-muted/60 ring-2 ring-inset ring-primary',
                )}
              >
                {/* Hoje é uma MARCA, não um estado da tarefa. Era `success` —
                    que é o papel de "concluído" — e dizia que o dia estava
                    feito. `primary` sobre `primary-foreground` mede 5,54:1 na
                    casa, 9,90:1 na Tax e 7,92:1 na OSG. */}
                <span
                  data-testid={isToday ? 'calendario-hoje' : undefined}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium',
                    isToday && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <div className="mt-1 flex w-full flex-col gap-0.5">
                    {dayTasks.slice(0, TAREFAS_VISIVEIS_NA_CELULA).map(task => {
                      const papel = statusColors[task.status];
                      return (
                        <HoverCard key={task.id} openDelay={120}>
                          <HoverCardTrigger asChild>
                            <div
                              className={cn(
                                'w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight',
                                papel?.combined || 'bg-muted text-muted-foreground',
                              )}
                            >
                              {task.title}
                            </div>
                          </HoverCardTrigger>
                          {/* A tira de 10px truncada não dizia o que era a
                              tarefa: para ler o título tinha que abrir o Sheet
                              e perder o mês de vista. */}
                          <HoverCardContent align="start" className="w-64 space-y-2">
                            <p className="text-sm font-semibold leading-tight">{task.title}</p>
                            <Badge className={cn('text-xs', papel?.combined)}>
                              {papel?.label || task.status}
                            </Badge>
                            {task.assigned_to_name && (
                              <p className="text-xs text-muted-foreground">{task.assigned_to_name}</p>
                            )}
                            {task.project?.name && (
                              <p className="text-xs text-muted-foreground">{task.project.name}</p>
                            )}
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })}
                    {dayTasks.length > TAREFAS_VISIVEIS_NA_CELULA && (
                      <span className="pl-1.5 text-[10px] text-muted-foreground">
                        +{dayTasks.length - TAREFAS_VISIVEIS_NA_CELULA} mais
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* A legenda saiu da linha de controles e foi para baixo do quadro, que é
          onde o Gantt já a põe (prop `legenda`). Ela vivia grudada nas setas, e
          uma legenda não é um controle: ocupava a barra e empurrava o título. */}
      <div className="hidden flex-wrap items-center gap-4 text-sm text-muted-foreground sm:flex">
        {statusList.map(s => (
          <span key={s.key} className="flex items-center gap-2">
            <span className={cn('h-3 w-3 rounded-full', s.bgSolid)} />
            {s.label}
          </span>
        ))}
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
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onEdit(task)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEdit(task);
                      }
                    }}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-xs", statusColors[task.status]?.combined)}>
                            {statusColors[task.status]?.label || task.status}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm break-words">{task.title}</p>
                        {task.assigned_to_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.assigned_to_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
