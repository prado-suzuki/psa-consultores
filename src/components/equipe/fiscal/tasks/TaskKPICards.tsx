import { statusList } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

interface TaskKPICardsProps {
  tasks: { status: string }[];
}

export const TaskKPICards = ({ tasks }: TaskKPICardsProps) => {

  const counts = statusList.reduce((acc, s) => {
    acc[s.key] = tasks.filter(t => t.status === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex overflow-x-auto rounded-xl border bg-card p-1 shadow-sm">
      {statusList.map((status, index) => (
        <div
          key={status.key}
          className={cn('flex min-w-[120px] flex-1 items-center justify-between gap-3 px-3 py-2', index > 0 && 'border-l')}
        >
          <span className="whitespace-nowrap text-xs text-muted-foreground">{status.label}</span>
          <span className={cn('rounded-md px-2 py-0.5 text-sm font-bold tabular-nums', status.combined)}>
            {counts[status.key] ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
};
