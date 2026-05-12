import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Loader2, Workflow } from 'lucide-react';
import type { ProcessMetrics } from '@/hooks/useProcessMapping';

interface MetricsCardsProps {
  metrics: ProcessMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      label: 'Total de Processos',
      value: metrics.total,
      icon: Workflow,
      iconClass: 'text-slate-500',
      bgClass: 'bg-slate-50',
    },
    {
      label: 'Não Iniciados',
      value: metrics.not_started,
      icon: Circle,
      iconClass: 'text-amber-500',
      bgClass: 'bg-amber-50',
    },
    {
      label: 'Em Andamento',
      value: metrics.in_progress,
      icon: Loader2,
      iconClass: 'text-blue-500',
      bgClass: 'bg-blue-50',
    },
    {
      label: 'Concluídos',
      value: metrics.completed,
      icon: CheckCircle2,
      iconClass: 'text-teal-600',
      bgClass: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${c.bgClass} flex items-center justify-center`}>
                <c.icon className={`h-6 w-6 ${c.iconClass}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span><strong className="text-slate-900">{metrics.mapped}</strong> mapeados</span>
              <span>·</span>
              <span><strong className="text-slate-900">{metrics.with_roi}</strong> com ROI</span>
              <span>·</span>
              <span><strong className="text-slate-900">{metrics.with_sop}</strong> com SOP</span>
            </div>
            <span className="font-medium text-slate-900">
              {metrics.fully_complete}/{metrics.total} completos ({metrics.overall_progress_percent}%)
            </span>
          </div>
          <Progress value={metrics.overall_progress_percent} className="h-2" />
        </CardContent>
      </Card>
    </div>
  );
}
