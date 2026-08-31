import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { getTodayBrazil } from '@/lib/dateUtils';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

const statusColor = (status: string) =>
  status === 'completed'
    ? 'bg-green-500'
    : status === 'in_progress'
      ? 'bg-yellow-500'
      : 'bg-gray-400';

function GanttDayGrid({ days }: { days: Date[] }) {
  return (
    <div className="absolute inset-0 flex" data-testid="gantt-day-grid">
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`flex-1 border-r border-border last:border-r-0 ${
            isSameDay(day, getTodayBrazil()) ? 'bg-primary/5' : ''
          }`}
          style={{ minWidth: '45px' }}
        />
      ))}
    </div>
  );
}

export function GanttTab({ controller: c }: { controller: EquipeSprintDetalhesController }) {
  return (
    <TabsContent value="gantt" className="space-y-4">
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="border border-border rounded-lg overflow-auto bg-white">
            <div className="sticky top-0 bg-gray-50 border-b border-border z-10">
              <div className="flex">
                <div className="w-[340px] flex-shrink-0 px-4 py-3 font-medium text-gray-700 border-r">
                  Responsável / Entregável
                </div>
                <div className="flex-1 flex min-w-[500px]">
                  {c.ganttChartData.days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={`flex-1 text-center py-2 text-xs border-r ${isSameDay(day, getTodayBrazil()) ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-500'}`}
                      style={{ minWidth: 45 }}
                    >
                      <div>{format(day, 'EEE', { locale: ptBR })}</div>
                      <div>{format(day, 'dd')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="divide-y">
              {!c.ganttByPerson.length ? (
                <div className="py-12 text-center text-gray-500">Nenhum entregável encontrado</div>
              ) : (
                c.ganttByPerson.map((person) => {
                  const expanded = c.expandedPersons.has(person.personId);
                  return (
                    <div key={person.personId}>
                      <button
                        onClick={() => c.togglePerson(person.personId)}
                        className="w-full flex hover:bg-gray-50/80"
                      >
                        <div className="w-[340px] flex-shrink-0 px-4 py-3 border-r bg-gray-50/50 text-left">
                          <div className="flex gap-2">
                            <ChevronDown className={`h-4 w-4 ${expanded ? '' : '-rotate-90'}`} />
                            <div>
                              <div className="font-medium">{person.personName}</div>
                              <div className="text-xs text-gray-500">
                                {person.count} entregável{person.count !== 1 ? 'is' : ''} •{' '}
                                {person.totalHours}h • {person.completedCount}/{person.count}{' '}
                                concluídos
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 relative h-12 min-w-[500px]">
                          <GanttDayGrid days={c.ganttChartData.days} />
                          {!expanded && (
                            <div
                              className="absolute top-4 h-4 rounded-full bg-primary/30 border border-primary/50"
                              style={{
                                left: `${person.consolidatedBarLeft}%`,
                                width: `${Math.max(person.consolidatedBarWidth, 3)}%`,
                                minWidth: 20,
                              }}
                            />
                          )}
                        </div>
                      </button>
                      {expanded && (
                        <div className="divide-y bg-white">
                          {person.deliverables.map((item) => (
                            <div key={item.id} className="flex group">
                              <div className="w-[340px] flex-shrink-0 px-4 py-2 pl-10 border-r">
                                <button
                                  onClick={() => c.openEditModal(item)}
                                  className="w-full text-left"
                                >
                                  <div
                                    className={
                                      item.status === 'completed'
                                        ? 'line-through text-gray-400'
                                        : 'text-gray-900'
                                    }
                                  >
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(item.startDate, 'dd/MM')} -{' '}
                                    {format(item.endDate, 'dd/MM')}
                                  </div>
                                </button>
                              </div>
                              <div className="flex-1 relative h-10 min-w-[500px]">
                                <GanttDayGrid days={c.ganttChartData.days} />
                                <button
                                  aria-label={item.title}
                                  onClick={() => c.openEditModal(item)}
                                  className={`absolute top-3 h-4 rounded-full ${statusColor(item.status)}`}
                                  style={{
                                    left: `${item.barLeft}%`,
                                    width: `${Math.max(item.barWidth, 3)}%`,
                                    minWidth: 20,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-4 text-sm text-gray-600">
        <span>● Pendente</span>
        <span className="text-yellow-600">● Em Progresso</span>
        <span className="text-green-600">● Concluído</span>
        <span>Período consolidado</span>
      </div>
    </TabsContent>
  );
}
