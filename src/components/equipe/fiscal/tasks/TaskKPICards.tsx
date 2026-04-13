import { Card, CardContent } from '@/components/ui/card';
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
