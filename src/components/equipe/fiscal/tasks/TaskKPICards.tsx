import { Card, CardContent } from '@/components/ui/card';
import { useFiscalTasks } from '@/hooks/useFiscalTasks';
import { statusList } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

export const TaskKPICards = () => {
  const { data: tasks = [] } = useFiscalTasks({});

  const counts = statusList.reduce((acc, s) => {
    acc[s.key] = tasks.filter(t => t.status === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-6 gap-3">
      {statusList.map(status => (
        <Card key={status.key} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{status.label}</span>
              <span className={cn(
                "text-2xl font-bold rounded-lg px-3 py-1",
                status.combined
              )}>
                {counts[status.key] ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
