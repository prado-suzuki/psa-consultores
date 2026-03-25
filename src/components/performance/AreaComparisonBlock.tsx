import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PerformanceProject } from '@/hooks/usePerformanceData';
import { subMonths, format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AREAS = [
  { key: 'tax', label: 'Tax', color: '#3B82F6', icon: '📊' },
  { key: 'osg', label: 'OSG', color: '#10B981', icon: '⚡' },
  { key: 'dev', label: 'Dev', color: '#8B5CF6', icon: '💻' },
];

interface Props {
  projects: PerformanceProject[];
  periodTasks: any[];
  isLoading: boolean;
}

export const AreaComparisonBlock = ({ projects, periodTasks, isLoading }: Props) => {
  if (isLoading) return <Skeleton className="h-[400px] rounded-xl" />;

  const now = new Date();
  const months = [subMonths(now, 2), subMonths(now, 1), now];

  const chartData = months.map(m => {
    const monthLabel = format(m, 'MMM', { locale: ptBR });
    const monthStart = new Date(m.getFullYear(), m.getMonth(), 1);
    const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);

    const entry: any = { month: monthLabel };
    for (const area of AREAS) {
      entry[area.label] = periodTasks.filter(t => {
        if (t.status !== 'concluida' || !t.updated_at) return false;
        const d = parseISO(t.updated_at);
        if (d < monthStart || d > monthEnd) return false;
        const proj = projects.find(p => p.id === t.project_id);
        return proj?.area_name?.toLowerCase().includes(area.key);
      }).length;
    }
    return entry;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Comparativo por Área</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AREAS.map(area => {
          const areaProjects = projects.filter(p => p.area_name?.toLowerCase().includes(area.key));
          const areaTasks = periodTasks.filter(t => {
            const proj = projects.find(p => p.id === t.project_id);
            return proj?.area_name?.toLowerCase().includes(area.key);
          });
          const completed = areaTasks.filter(t => t.status === 'concluida').length;

          return (
            <Card key={area.key} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: area.color }} />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{area.icon}</span>
                  <h3 className="font-semibold" style={{ color: area.color }}>{area.label}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projetos ativos</span>
                    <span className="font-medium">{areaProjects.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarefas concluídas</span>
                    <span className="font-medium">{completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total tarefas</span>
                    <span className="font-medium">{areaTasks.length}</span>
                  </div>
                  {areaTasks.length > 0 && (
                    <Progress value={Math.round((completed / areaTasks.length) * 100)} className="h-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Tarefas concluídas por área — últimos 3 meses</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {AREAS.map(area => (
                  <Bar key={area.key} dataKey={area.label} fill={area.color} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
