import { differenceInDays, format } from 'date-fns';
import { AlertTriangle, CalendarClock, Clock, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TabsContent } from '@/components/ui/tabs';
import { parseDate } from '@/lib/dateUtils';
import type { SprintDetalhesDeliverable as Deliverable } from '@/hooks/useDomainEquipeSprintDetalhes';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

function DueCard({
  title,
  items,
  color,
  icon,
  controller: c,
}: {
  title: string;
  items: Deliverable[];
  color: string;
  icon: React.ReactNode;
  controller: EquipeSprintDetalhesController;
}) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm flex gap-2 ${color}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-gray-500">
                {c.getProfileName(item.assigned_to)} •{' '}
                {item.estimated_hours ? `${item.estimated_hours}h estimadas` : 'Sem estimativa'}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {item.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => c.openEditModal(item)}>
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RisksTab({ controller: c }: { controller: EquipeSprintDetalhesController }) {
  const r = c.sprintRisks;
  return (
    <TabsContent value="risks" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          [r.overdue.length, 'Atrasados', 'text-red-600'],
          [r.dueToday.length, 'Vencendo Hoje', 'text-amber-600'],
          [r.dueTomorrow.length, 'Vencendo Amanhã', 'text-yellow-600'],
          [r.metricsAtRisk.length, 'Métricas em Risco', 'text-purple-600'],
        ].map(([count, label, color]) => (
          <Card key={String(label)}>
            <CardContent className="py-4 text-center">
              <div className={`text-3xl font-bold ${color}`}>{count}</div>
              <div className="text-sm">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progresso da Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Progress value={r.sprintProgress} />
            <span>{Math.round(r.sprintProgress)}%</span>
          </div>
          {c.sprint && (
            <p className="text-xs mt-2">
              {format(parseDate(c.sprint.start_date), 'dd/MM')} -{' '}
              {format(parseDate(c.sprint.end_date), 'dd/MM')}
            </p>
          )}
        </CardContent>
      </Card>
      {!!r.overdue.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-red-700 flex gap-2">
              <AlertTriangle className="h-4 w-4" />
              Entregáveis Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.overdue.map((item) => {
              const days = Math.abs(differenceInDays(parseDate(item.due_date), new Date()));
              return (
                <div key={item.id} className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs">
                      {c.getProfileName(item.assigned_to)} • Venceu em{' '}
                      {format(parseDate(item.due_date), 'dd/MM')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>
                      {days} dia{days !== 1 ? 's' : ''} atraso
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => c.openEditModal(item)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      <DueCard
        title="Vencendo Hoje"
        items={r.dueToday}
        color="text-amber-700"
        icon={<Clock className="h-4 w-4" />}
        controller={c}
      />
      <DueCard
        title="Vencendo Amanhã"
        items={r.dueTomorrow}
        color="text-yellow-700"
        icon={<CalendarClock className="h-4 w-4" />}
        controller={c}
      />
      {!!r.metricsAtRisk.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-purple-700">Métricas em Risco</CardTitle>
            <p className="text-xs">
              Sprint está em {Math.round(r.sprintProgress)}% do tempo, mas estas métricas estão
              abaixo de 50%
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.metricsAtRisk.map((metric) => {
              const percentage = metric.target_value
                ? Math.round(((metric.current_value ?? 0) / metric.target_value) * 100)
                : 0;
              return (
                <div key={metric.id} className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex justify-between">
                    <p>{metric.name}</p>
                    <span>
                      {metric.current_value ?? 0} / {metric.target_value} {metric.unit}
                    </span>
                  </div>
                  <Progress value={percentage} />
                  <p className="text-xs">{percentage}% concluído</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {!r.overdue.length &&
        !r.dueToday.length &&
        !r.dueTomorrow.length &&
        !r.metricsAtRisk.length && (
          <Card>
            <CardContent className="py-8 text-center">
              Tudo em dia!<p>Nenhum risco identificado para esta sprint.</p>
            </CardContent>
          </Card>
        )}
    </TabsContent>
  );
}
