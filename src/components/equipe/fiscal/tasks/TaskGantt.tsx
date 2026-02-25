import { useMemo, useState } from 'react';
import { format, eachDayOfInterval, differenceInDays, isSameDay, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate, getTodayBrazil } from '@/lib/dateUtils';
import { FiscalTask, FiscalTaskStatus } from '@/hooks/useFiscalTasks';
import { statusColors } from '@/lib/taskStatusColors';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskGanttProps {
  tasks: FiscalTask[];
  onEdit: (task: FiscalTask) => void;
}

const getBarColor = (status: FiscalTaskStatus) => {
  const cfg = statusColors[status];
  return cfg?.bgSolid || 'bg-gray-400';
};

export const TaskGantt = ({ tasks, onEdit }: TaskGanttProps) => {
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());

  // Calculate date range from tasks
  const dateRange = useMemo(() => {
    const tasksWithDates = tasks.filter(t => t.due_date);
    if (tasksWithDates.length === 0) return null;

    const today = getTodayBrazil();
    let minDate = today;
    let maxDate = today;

    tasksWithDates.forEach(t => {
      const start = t.start_date ? parseDate(t.start_date) : (t.due_date ? parseDate(t.due_date) : today);
      const end = t.due_date ? parseDate(t.due_date) : today;
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    // Add padding
    const rangeStart = subDays(minDate, 1);
    const rangeEnd = addDays(maxDate, 2);
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    return { start: rangeStart, end: rangeEnd, days, totalDays: days.length };
  }, [tasks]);

  // Build gantt data grouped by person
  const ganttByPerson = useMemo(() => {
    if (!dateRange) return [];

    const { start: rangeStart, totalDays } = dateRange;

    // Prepare task bars - show subtasks individually, hide parents that have children
    const parentIds = new Set(tasks.filter(t => t.parent_task_id).map(t => t.parent_task_id));
    const visibleTasks = tasks.filter(t => !parentIds.has(t.id) && t.due_date);

    const taskBars = visibleTasks.map(t => {
      const startDate = t.start_date ? parseDate(t.start_date) : parseDate(t.due_date!);
      const endDate = parseDate(t.due_date!);
      const startOffset = Math.max(0, differenceInDays(startDate, rangeStart));
      const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);

      // Find parent name
      const parent = t.parent_task_id ? tasks.find(p => p.id === t.parent_task_id) : null;

      return {
        ...t,
        startDate,
        endDate,
        startOffset,
        duration,
        barLeft: (startOffset / totalDays) * 100,
        barWidth: (duration / totalDays) * 100,
        parentTitle: parent?.title || null,
      };
    });

    // Group by assigned person
    const grouped: Record<string, typeof taskBars> = {};
    taskBars.forEach(t => {
      const key = t.assigned_to || 'unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    return Object.entries(grouped).map(([personId, items]) => {
      const personName = items[0]?.assigned_to_name || (personId === 'unassigned' ? 'Sem responsável' : 'Desconhecido');
      const totalCount = items.length;
      const doneCount = items.filter(i => i.status === 'done').length;

      // Consolidated bar
      let minStart = items[0].startDate;
      let maxEnd = items[0].endDate;
      items.forEach(i => {
        if (i.startDate < minStart) minStart = i.startDate;
        if (i.endDate > maxEnd) maxEnd = i.endDate;
      });

      const cStartOffset = Math.max(0, differenceInDays(minStart, rangeStart));
      const cDuration = Math.max(1, differenceInDays(maxEnd, minStart) + 1);

      return {
        personId,
        personName,
        items: items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
        totalCount,
        doneCount,
        consolidatedBarLeft: (cStartOffset / totalDays) * 100,
        consolidatedBarWidth: (cDuration / totalDays) * 100,
        minStart,
        maxEnd,
      };
    }).sort((a, b) => a.personName.localeCompare(b.personName));
  }, [tasks, dateRange]);

  const togglePerson = (id: string) => {
    setExpandedPersons(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (!dateRange || ganttByPerson.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma tarefa com data de vencimento para exibir no Gantt.
        </CardContent>
      </Card>
    );
  }

  const today = getTodayBrazil();

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-auto bg-background">
            {/* Header */}
            <div className="sticky top-0 bg-muted/50 border-b z-10">
              <div className="flex">
                <div className="w-[300px] flex-shrink-0 px-4 py-3 font-medium text-sm border-r">
                  Responsável / Tarefa
                </div>
                <div className="flex-1 flex min-w-[500px]">
                  {dateRange.days.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 text-center py-2 text-xs border-r last:border-r-0",
                        isSameDay(day, today) ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
                      )}
                      style={{ minWidth: '40px' }}
                    >
                      <div>{format(day, "EEE", { locale: ptBR })}</div>
                      <div className="font-medium">{format(day, "dd")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {ganttByPerson.map((group) => {
                const isExpanded = expandedPersons.has(group.personId);

                return (
                  <div key={group.personId}>
                    {/* Person header */}
                    <button
                      onClick={() => togglePerson(group.personId)}
                      className="w-full flex hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-[300px] flex-shrink-0 px-4 py-3 border-r bg-muted/20 text-left">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !isExpanded && '-rotate-90')} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{group.personName}</div>
                            <div className="text-xs text-muted-foreground">
                              {group.totalCount} tarefa{group.totalCount !== 1 ? 's' : ''} • {group.doneCount}/{group.totalCount} concluídas
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Consolidated bar */}
                      <div className="flex-1 relative h-12 min-w-[500px]">
                        <div className="absolute inset-0 flex">
                          {dateRange.days.map((day, i) => (
                            <div
                              key={i}
                              className={cn("flex-1 border-r last:border-r-0", isSameDay(day, today) && 'bg-primary/5')}
                              style={{ minWidth: '40px' }}
                            />
                          ))}
                        </div>
                        {!isExpanded && (
                          <div
                            className="absolute top-4 h-4 rounded-full bg-primary/30 border border-primary/50"
                            style={{
                              left: `${group.consolidatedBarLeft}%`,
                              width: `${Math.max(group.consolidatedBarWidth, 3)}%`,
                              minWidth: '20px',
                            }}
                            title={`${format(group.minStart, "dd/MM")} - ${format(group.maxEnd, "dd/MM")}`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Expanded tasks */}
                    {isExpanded && (
                      <div className="divide-y divide-border/50">
                        {group.items.map((t) => (
                          <div key={t.id} className="flex hover:bg-muted/20 group/row">
                            <div className="w-[300px] flex-shrink-0 px-4 py-2 pl-10 border-r">
                              <button
                                onClick={() => onEdit(t)}
                                className="w-full text-left group-hover/row:text-primary transition-colors"
                              >
                                <div className={cn(
                                  "text-sm leading-tight",
                                  t.status === 'done' ? 'line-through text-muted-foreground' : ''
                                )}>
                                  {t.title}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  {t.parentTitle && (
                                    <span className="text-primary/70">↑ {t.parentTitle} •</span>
                                  )}
                                  {format(t.startDate, "dd/MM")} - {format(t.endDate, "dd/MM")}
                                </div>
                              </button>
                            </div>

                            <div className="flex-1 relative h-10 min-w-[500px]">
                              <div className="absolute inset-0 flex">
                                {dateRange.days.map((day, i) => (
                                  <div
                                    key={i}
                                    className={cn("flex-1 border-r last:border-r-0", isSameDay(day, today) && 'bg-primary/5')}
                                    style={{ minWidth: '40px' }}
                                  />
                                ))}
                              </div>
                              <button
                                onClick={() => onEdit(t)}
                                className={cn(
                                  "absolute top-3 h-4 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-y-125",
                                  getBarColor(t.status)
                                )}
                                style={{
                                  left: `${t.barLeft}%`,
                                  width: `${Math.max(t.barWidth, 3)}%`,
                                  minWidth: '16px',
                                }}
                                title={`${t.title} (${format(t.startDate, "dd/MM")} - ${format(t.endDate, "dd/MM")})`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {Object.values(statusColors).map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", s.bgSolid)} />
            <span>{s.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded-full bg-primary/30 border border-primary/50" />
          <span>Período consolidado</span>
        </div>
      </div>
    </div>
  );
};
