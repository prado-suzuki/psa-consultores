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

  const getColor = (count: number) => {
    if (count === 0) return 'hsl(var(--muted))';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return '#86EFAC';
    if (intensity < 0.5) return '#4ADE80';
    if (intensity < 0.75) return '#22C55E';
    return '#16A34A';
  };

  // Group into weeks (7 rows)
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) => (
              <Tooltip key={di}>
                <TooltipTrigger asChild>
                  <div
                    className="w-3 h-3 rounded-[2px] transition-colors"
                    style={{ backgroundColor: getColor(cell.count) }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {format(cell.date, "dd 'de' MMM", { locale: ptBR })}: {cell.count} movimentação(ões)
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
