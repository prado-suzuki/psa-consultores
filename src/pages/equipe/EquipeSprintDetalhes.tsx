import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EquipeLayout } from "@/components/equipe/EquipeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X } from "lucide-react";
import { format, parseISO, differenceInDays, isToday, isTomorrow, isPast, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string | null;
}

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string;
  status: string;
  estimated_hours: number | null;
  profile?: { first_name: string; last_name: string };
}

interface SprintEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  participants: string[];
}

interface Metric {
  id: string;
  name: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  category: string | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

// Helper para parse correto de datas (evita problema de timezone UTC)
const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function EquipeSprintDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [events, setEvents] = useState<SprintEvent[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');

  useEffect(() => {
    if (id) {
      fetchSprintData();
    }
  }, [id]);

  const fetchSprintData = async () => {
    try {
      setLoading(true);
      
      const { data: sprintData, error: sprintError } = await supabase
        .from("sprints")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (sprintError) throw sprintError;
      if (!sprintData) {
        toast({ title: "Sprint não encontrada", variant: "destructive" });
        navigate("/equipe/sprints");
        return;
      }
      setSprint(sprintData);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");
      setProfiles(profilesData || []);

      const { data: deliverablesData } = await supabase
        .from("sprint_deliverables")
        .select("*")
        .eq("sprint_id", id)
        .order("due_date", { ascending: true });
      setDeliverables(deliverablesData || []);

      const { data: eventsData } = await supabase
        .from("sprint_events")
        .select("*")
        .eq("sprint_id", id)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });
      setEvents(eventsData || []);

      const { data: metricsData } = await supabase
        .from("sprint_metrics")
        .select("*")
        .eq("sprint_id", id);
      setMetrics(metricsData || []);
      
    } catch (error: any) {
      console.error("Error fetching sprint data:", error);
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateDeliverableStatus = async (deliverableId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from("sprint_deliverables")
        .update(updates)
        .eq("id", deliverableId);

      if (error) throw error;
      
      setDeliverables(prev => 
        prev.map(d => d.id === deliverableId ? { ...d, ...updates } : d)
      );
      toast({ title: "Status atualizado" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const updateMetric = async (metricId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from("sprint_metrics")
        .update({ current_value: newValue })
        .eq("id", metricId);

      if (error) throw error;
      
      setMetrics(prev => 
        prev.map(m => m.id === metricId ? { ...m, current_value: newValue } : m)
      );
      toast({ title: "Métrica atualizada" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Não atribuído";
    const profile = profiles.find(p => p.id === userId);
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Desconhecido";
  };

  const getParticipantNames = (participantIds: string[]) => {
    if (!participantIds || participantIds.length === 0) return "Todos";
    return participantIds.map(id => getProfileName(id)).join(", ");
  };

  const calculateProgress = () => {
    if (deliverables.length === 0) return 0;
    const completed = deliverables.filter(d => d.status === 'completed').length;
    return Math.round((completed / deliverables.length) * 100);
  };

  const getDaysRemaining = () => {
    if (!sprint) return 0;
    return differenceInDays(parseDate(sprint.end_date), new Date());
  };

  const getTotalHours = () => {
    return deliverables.reduce((sum, d) => sum + (d.estimated_hours || 0), 0);
  };

  const getEventTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800",
      meeting: "bg-purple-100 text-purple-800",
      session: "bg-green-100 text-green-800",
      presentation: "bg-amber-100 text-amber-800",
      planning: "bg-indigo-100 text-indigo-800",
      retrospective: "bg-rose-100 text-rose-800"
    };
    const labels: Record<string, string> = {
      daily: "Daily",
      meeting: "Reunião",
      session: "Sessão",
      presentation: "Apresentação",
      planning: "Planning",
      retrospective: "Retro"
    };
    return <Badge className={styles[type] || "bg-gray-100 text-gray-800"}>{labels[type] || type}</Badge>;
  };

  const getDateBadge = (dateStr: string) => {
    const date = parseDate(dateStr);
    if (isToday(date)) return <Badge className="bg-primary text-primary-foreground text-xs">Hoje</Badge>;
    if (isTomorrow(date)) return <Badge variant="outline" className="text-xs">Amanhã</Badge>;
    if (isPast(date)) return <Badge variant="secondary" className="text-xs">Passado</Badge>;
    return null;
  };

  const groupEventsByDate = () => {
    const grouped: Record<string, SprintEvent[]> = {};
    events.forEach(event => {
      if (!grouped[event.event_date]) {
        grouped[event.event_date] = [];
      }
      grouped[event.event_date].push(event);
    });
    return grouped;
  };

  // Unique responsible people for filter
  const uniqueResponsibles = useMemo(() => {
    const responsibleIds = [...new Set(deliverables.map(d => d.assigned_to).filter(Boolean))];
    return responsibleIds.map(id => {
      const profile = profiles.find(p => p.id === id);
      return profile ? { id: profile.id, name: `${profile.first_name} ${profile.last_name}`.trim() } : null;
    }).filter(Boolean) as { id: string; name: string }[];
  }, [deliverables, profiles]);

  // Unique dates for filter
  const uniqueDates = useMemo(() => {
    return [...new Set(deliverables.map(d => d.due_date))].sort();
  }, [deliverables]);

  // Filtered deliverables
  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      if (filterResponsible !== 'all' && d.assigned_to !== filterResponsible) return false;
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterDate !== 'all' && d.due_date !== filterDate) return false;
      return true;
    });
  }, [deliverables, filterResponsible, filterStatus, filterDate]);

  const clearFilters = () => {
    setFilterResponsible('all');
    setFilterStatus('all');
    setFilterDate('all');
  };

  const hasActiveFilters = filterResponsible !== 'all' || filterStatus !== 'all' || filterDate !== 'all';

  // Gantt data
  const ganttData = useMemo(() => {
    if (!sprint) return { days: [], byPerson: {} };
    
    const startDate = parseDate(sprint.start_date);
    const endDate = parseDate(sprint.end_date);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const byPerson: Record<string, Deliverable[]> = {};
    filteredDeliverables.forEach(d => {
      const personId = d.assigned_to || 'unassigned';
      if (!byPerson[personId]) byPerson[personId] = [];
      byPerson[personId].push(d);
    });
    
    return { days, byPerson };
  }, [sprint, filteredDeliverables]);

  if (loading) {
    return (
      <EquipeLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </EquipeLayout>
    );
  }

  if (!sprint) {
    return (
      <EquipeLayout title="Sprint não encontrada">
        <Button onClick={() => navigate("/equipe/sprints")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Sprints
        </Button>
      </EquipeLayout>
    );
  }

  const progress = calculateProgress();
  const daysRemaining = getDaysRemaining();
  const totalHours = getTotalHours();
  const completedCount = deliverables.filter(d => d.status === 'completed').length;
  const groupedEvents = groupEventsByDate();

  return (
    <EquipeLayout 
      title={sprint.name}
      subtitle={sprint.goal || undefined}
    >
      <div className="space-y-6">
        {/* Header com navegação */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/equipe/sprints")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Badge 
            className={
              sprint.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' :
              sprint.status === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }
          >
            {sprint.status === 'active' ? 'Ativa' : 
             sprint.status === 'completed' ? 'Concluída' : 
             sprint.status === 'planning' ? 'Planejamento' : sprint.status}
          </Badge>
        </div>

        {/* Header Limpo e Moderno */}
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            {/* Barra de progresso proeminente */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xl font-bold text-gray-900 min-w-[60px] text-right">{progress}%</span>
            </div>
            
            {/* Informações em linha única */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              <span>
                {format(parseDate(sprint.start_date), "dd/MM")} - {format(parseDate(sprint.end_date), "dd/MM/yyyy")}
              </span>
              <span className="text-gray-300">•</span>
              <span>{daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Encerrada'}</span>
              <span className="text-gray-300">•</span>
              <span>{completedCount}/{deliverables.length} entregas</span>
              <span className="text-gray-300">•</span>
              <span>{totalHours}h alocadas</span>
              <span className="text-gray-300">•</span>
              <span>{uniqueResponsibles.length} pessoas</span>
            </div>
          </CardContent>
        </Card>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {uniqueResponsibles.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDate} onValueChange={setFilterDate}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas datas</SelectItem>
              {uniqueDates.map(d => (
                <SelectItem key={d} value={d}>{format(parseDate(d), "dd/MM")}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}

          {hasActiveFilters && (
            <span className="text-sm text-gray-500 ml-auto">
              {filteredDeliverables.length} de {deliverables.length} entregáveis
            </span>
          )}
        </div>

        {/* Tabs de conteúdo */}
        <Tabs defaultValue="deliverables" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deliverables">Entregáveis</TabsTrigger>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
          </TabsList>

          {/* Tab Entregáveis */}
          <TabsContent value="deliverables" className="space-y-4">
            {filteredDeliverables.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? 'Nenhum entregável encontrado com os filtros selecionados.' : 'Nenhum entregável cadastrado para esta sprint.'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredDeliverables.map((deliverable) => (
                  <Card key={deliverable.id} className={`${deliverable.status === 'completed' ? 'bg-gray-50' : 'bg-white'} border-gray-200`}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-4">
                        <Checkbox 
                          checked={deliverable.status === 'completed'}
                          onCheckedChange={(checked) => {
                            updateDeliverableStatus(
                              deliverable.id, 
                              checked ? 'completed' : 'pending'
                            );
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${deliverable.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {deliverable.title}
                            </span>
                            {getDateBadge(deliverable.due_date)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>{getProfileName(deliverable.assigned_to)}</span>
                            <span>{format(parseDate(deliverable.due_date), "dd/MM")}</span>
                            {deliverable.estimated_hours && <span>{deliverable.estimated_hours}h</span>}
                          </div>
                        </div>
                        <Badge 
                          variant="outline"
                          className={
                            deliverable.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            deliverable.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }
                        >
                          {deliverable.status === 'completed' ? 'Concluído' :
                           deliverable.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Gantt */}
          <TabsContent value="gantt" className="space-y-4">
            <Card className="bg-white border-gray-200 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 bg-gray-50 w-48 sticky left-0">
                          Responsável
                        </th>
                        {ganttData.days.map((day, i) => (
                          <th 
                            key={i} 
                            className={`text-center py-3 px-2 font-medium text-xs min-w-[60px] ${
                              isToday(day) ? 'bg-primary/10 text-primary' : 'text-gray-600 bg-gray-50'
                            }`}
                          >
                            <div>{format(day, "EEE", { locale: ptBR })}</div>
                            <div className="font-bold">{format(day, "dd")}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(ganttData.byPerson).map(([personId, personDeliverables]) => (
                        <tr key={personId} className="border-b border-gray-100">
                          <td className="py-3 px-4 font-medium text-gray-900 bg-white sticky left-0 border-r border-gray-100">
                            {personId === 'unassigned' ? 'Não atribuído' : getProfileName(personId)}
                            <div className="text-xs text-gray-500 font-normal">
                              {personDeliverables.length} entregas
                            </div>
                          </td>
                          {ganttData.days.map((day, i) => {
                            const dayDeliverables = personDeliverables.filter(d => 
                              isSameDay(parseDate(d.due_date), day)
                            );
                            return (
                              <td 
                                key={i} 
                                className={`py-2 px-1 ${isToday(day) ? 'bg-primary/5' : ''}`}
                              >
                                {dayDeliverables.length > 0 && (
                                  <div className="space-y-1">
                                    {dayDeliverables.slice(0, 2).map((d, idx) => (
                                      <div 
                                        key={idx}
                                        className={`text-xs px-2 py-1 rounded truncate ${
                                          d.status === 'completed' ? 'bg-green-100 text-green-700' :
                                          d.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}
                                        title={d.title}
                                      >
                                        {d.title.length > 12 ? d.title.slice(0, 12) + '...' : d.title}
                                      </div>
                                    ))}
                                    {dayDeliverables.length > 2 && (
                                      <div className="text-xs text-gray-500 text-center">
                                        +{dayDeliverables.length - 2}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {Object.keys(ganttData.byPerson).length === 0 && (
                        <tr>
                          <td colSpan={ganttData.days.length + 1} className="py-8 text-center text-gray-500">
                            Nenhum entregável encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Legenda */}
            <div className="flex gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></div>
                <span>Em Progresso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                <span>Concluído</span>
              </div>
            </div>
          </TabsContent>

          {/* Tab Agenda */}
          <TabsContent value="agenda" className="space-y-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum evento cadastrado para esta sprint.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {format(parseDate(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      {getDateBadge(date)}
                    </div>
                    <div className="space-y-2 ml-4 border-l-2 border-gray-200 pl-4">
                      {dayEvents.map((event) => (
                        <Card key={event.id} className="bg-white border-gray-200">
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.start_time && (
                                    <span className="text-sm font-mono text-gray-500">
                                      {event.start_time.slice(0, 5)}
                                      {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                    </span>
                                  )}
                                  <span className="font-medium text-gray-900">{event.title}</span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                                )}
                                {event.participants && event.participants.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {getParticipantNames(event.participants)}
                                  </p>
                                )}
                              </div>
                              {getEventTypeBadge(event.event_type)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Métricas */}
          <TabsContent value="metrics" className="space-y-4">
            {metrics.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma métrica cadastrada para esta sprint.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map((metric) => {
                  const percentage = metric.target_value 
                    ? Math.round(((metric.current_value || 0) / metric.target_value) * 100)
                    : 0;
                  return (
                    <Card key={metric.id} className="bg-white border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-900">{metric.name}</CardTitle>
                        {metric.category && (
                          <Badge variant="outline" className="w-fit text-xs">{metric.category}</Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-bold text-gray-900">{metric.current_value || 0}</span>
                          {metric.target_value && (
                            <span className="text-gray-500 mb-1">/ {metric.target_value} {metric.unit}</span>
                          )}
                        </div>
                        {metric.target_value && (
                          <>
                            <Progress value={percentage} className="mt-3" />
                            <p className="text-xs text-gray-500 mt-1">{percentage}% concluído</p>
                          </>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateMetric(metric.id, (metric.current_value || 0) + 1)}
                          >
                            +1
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateMetric(metric.id, Math.max(0, (metric.current_value || 0) - 1))}
                          >
                            -1
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </EquipeLayout>
  );
}