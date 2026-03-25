import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { subDays, format, parseISO, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  tasks: any[];
  days?: number;
  selectedMemberId?: string | null;
}

export const ActivityHeatmap = ({ tasks, days = 90, selectedMemberId }: Props) => {
  const cells = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(now, i));
      const count = tasks.filter(t => {
        if (selectedMemberId && t.assigned_to !== selectedMemberId) return false;
        if (!t.updated_at) return false;
        return isSameDay(parseISO(t.updated_at), day);
      }).length;
      result.push({ date: day, count });
    }
    return result;
  }, [tasks, days, selectedMemberId]);

  const maxCount = Math.max(...cells.map(c => c.count), 1);

  const getHeatClass = (count: number) => {
    if (count === 0) return '';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'h1';
    if (intensity < 0.5) return 'h2';
    if (intensity < 0.75) return 'h3';
    return 'h4';
  };

  // Group into weeks (columns of 7)
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="hm" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) =>
          week.map((cell, di) => (
            <Tooltip key={`${wi}-${di}`}>
              <TooltipTrigger asChild>
                <div className={`hmc ${getHeatClass(cell.count)}`} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {format(cell.date, "dd 'de' MMM", { locale: ptBR })}: {cell.count} mov.
                </p>
              </TooltipContent>
            </Tooltip>
          ))
        )}
      </div>
    </div>
  );
};
