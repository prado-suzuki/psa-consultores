import { ChevronDown, Package, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { TabsContent } from '@/components/ui/tabs';
import { SprintHoursDashboard } from '@/components/sprint/SprintHoursDashboard';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

export function MetricsTab({ controller: c }: { controller: EquipeSprintDetalhesController }) {
  return (
    <TabsContent value="metrics" className="space-y-6">
      <SprintHoursDashboard deliverables={c.metricsFilteredDeliverables} profiles={c.profiles} />
      {!!c.metrics.length && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {c.metrics.map((metric) => {
            const percentage = metric.target_value
              ? Math.round(((metric.current_value ?? 0) / metric.target_value) * 100)
              : 0;
            const related = c.relatedDeliverables(metric.name, metric.category);
            const responsibles = [
              ...new Set(related.map((item) => item.assigned_to).filter(Boolean)),
            ] as string[];
            const expanded = c.expandedMetrics.has(metric.id);
            return (
              <Card key={metric.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{metric.name}</CardTitle>
                  {metric.category && (
                    <Badge variant="outline" className="w-fit">
                      {metric.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-3xl font-bold">{metric.current_value ?? 0}</span>
                    {metric.target_value && (
                      <span>
                        {' '}
                        / {metric.target_value} {metric.unit}
                      </span>
                    )}
                  </div>
                  {metric.target_value && (
                    <>
                      <Progress value={percentage} />
                      <p className="text-xs">{percentage}% concluído</p>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => c.updateMetric(metric.id, (metric.current_value ?? 0) + 1)}
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        c.updateMetric(metric.id, Math.max(0, (metric.current_value ?? 0) - 1))
                      }
                    >
                      -1
                    </Button>
                  </div>
                  <Collapsible open={expanded} onOpenChange={() => c.toggleMetric(metric.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex gap-2">
                          <Users className="h-4 w-4" />
                          {responsibles.length} responsáveis • {related.length} entregáveis
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-3">
                      {responsibles.map((id) => (
                        <Badge key={id} variant="secondary">
                          {c.getProfileName(id)}
                        </Badge>
                      ))}
                      {!!related.length && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {related.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <Package className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span
                                className={
                                  item.status === 'completed'
                                    ? 'line-through text-gray-400'
                                    : 'text-gray-700'
                                }
                              >
                                {item.title}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ml-auto flex-shrink-0 ${
                                  item.status === 'completed'
                                    ? 'bg-green-50 text-green-600'
                                    : item.status === 'in_progress'
                                      ? 'bg-yellow-50 text-yellow-600'
                                      : 'bg-gray-50 text-gray-500'
                                }`}
                              >
                                {item.status === 'completed'
                                  ? '✓'
                                  : item.status === 'in_progress'
                                    ? '→'
                                    : '○'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      {!related.length && (
                        <p className="text-xs italic">Nenhum entregável relacionado encontrado</p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}
