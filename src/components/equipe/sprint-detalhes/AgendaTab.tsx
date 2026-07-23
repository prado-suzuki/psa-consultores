import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { SprintCalendar } from '@/components/sprint/SprintCalendar';
import { isPastBrazil, isTodayBrazil, isTomorrowBrazil, parseDate } from '@/lib/dateUtils';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

const dateBadge = (date: string) =>
  isTodayBrazil(parseDate(date)) ? (
    <Badge className="text-xs">Hoje</Badge>
  ) : isTomorrowBrazil(parseDate(date)) ? (
    <Badge variant="outline">Amanhã</Badge>
  ) : isPastBrazil(parseDate(date)) ? (
    <Badge variant="secondary">Passado</Badge>
  ) : null;
const eventStyles: Record<string, string> = {
  daily: 'bg-blue-100 text-blue-800',
  meeting: 'bg-purple-100 text-purple-800',
  session: 'bg-green-100 text-green-800',
  presentation: 'bg-amber-100 text-amber-800',
  planning: 'bg-indigo-100 text-indigo-800',
  retrospective: 'bg-rose-100 text-rose-800',
};
const eventLabels: Record<string, string> = {
  daily: 'Daily',
  meeting: 'Reunião',
  session: 'Sessão',
  presentation: 'Apresentação',
  planning: 'Planning',
  retrospective: 'Retro',
};
const eventBadge = (type: string) => (
  <Badge className={eventStyles[type] || 'bg-gray-100 text-gray-800'}>
    {eventLabels[type] || type}
  </Badge>
);

export function AgendaTab({ controller: c }: { controller: EquipeSprintDetalhesController }) {
  return (
    <TabsContent value="agenda" className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Calendário de Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <SprintCalendar deliverables={c.filteredDeliverables} onEdit={c.openEditModal} />
        </CardContent>
      </Card>
      <h3 className="font-semibold">Eventos da Sprint</h3>
      {!c.events.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum evento cadastrado para esta sprint.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(c.groupedEvents).map(([date, events]) => (
            <div key={date}>
              <div className="flex gap-2 mb-3">
                <h3 className="font-semibold">
                  {format(parseDate(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                {dateBadge(date)}
              </div>
              <div className="space-y-2 ml-4 border-l-2 pl-4">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="py-3 flex justify-between">
                      <div>
                        <div>
                          {event.start_time && (
                            <span className="text-sm font-mono text-gray-500 mr-2">
                              {event.start_time.slice(0, 5)}
                              {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                            </span>
                          )}
                          <span className="font-medium">{event.title}</span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-500">{event.description}</p>
                        )}
                        {event.participants?.length > 0 && (
                          <p className="text-xs text-gray-500">
                            {event.participants.map(c.getProfileName).join(', ')}
                          </p>
                        )}
                      </div>
                      {eventBadge(event.event_type)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
