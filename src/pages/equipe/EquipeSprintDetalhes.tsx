import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EquipeLayout } from "@/components/equipe/EquipeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  CalendarDays,
  ListTodo,
  BarChart3
} from "lucide-react";
import { format, parseISO, differenceInDays, isToday, isTomorrow, isPast } from "date-fns";
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

  useEffect(() => {
    if (id) {
      fetchSprintData();
    }
  }, [id]);

  const fetchSprintData = async () => {
    try {
      setLoading(true);
      
      // Fetch sprint details
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

      // Fetch all profiles for reference
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");
      setProfiles(profilesData || []);

      // Fetch deliverables
      const { data: deliverablesData } = await supabase
        .from("sprint_deliverables")
        .select("*")
        .eq("sprint_id", id)
        .order("due_date", { ascending: true });
      setDeliverables(deliverablesData || []);

      // Fetch events
      const { data: eventsData } = await supabase
        .from("sprint_events")
        .select("*")
        .eq("sprint_id", id)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });
      setEvents(eventsData || []);

      // Fetch metrics
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
    return differenceInDays(parseISO(sprint.end_date), new Date());
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
    const date = parseISO(dateStr);
    if (isToday(date)) return <Badge className="bg-primary text-primary-foreground">Hoje</Badge>;
    if (isTomorrow(date)) return <Badge variant="outline">Amanhã</Badge>;
    if (isPast(date)) return <Badge variant="secondary">Passado</Badge>;
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
  const groupedEvents = groupEventsByDate();

  return (
    <EquipeLayout 
      title={sprint.name}
      subtitle={sprint.goal || undefined}
    >
      <div className="space-y-6">
        {/* Header com navegação */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/equipe/sprints")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Badge 
            className={
              sprint.status === 'active' ? 'bg-green-100 text-green-800' :
              sprint.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }
          >
            {sprint.status === 'active' ? 'Ativa' : 
             sprint.status === 'completed' ? 'Concluída' : 
             sprint.status === 'planning' ? 'Planejamento' : sprint.status}
          </Badge>
        </div>

        {/* Cards de Visão Geral */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progresso</p>
                  <p className="text-2xl font-bold">{progress}%</p>
                </div>
              </div>
              <Progress value={progress} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dias Restantes</p>
                  <p className="text-2xl font-bold">{daysRemaining > 0 ? daysRemaining : 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entregáveis</p>
                  <p className="text-2xl font-bold">
                    {deliverables.filter(d => d.status === 'completed').length}/{deliverables.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="text-sm font-medium">
                    {format(parseISO(sprint.start_date), "dd/MM")} - {format(parseISO(sprint.end_date), "dd/MM")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de conteúdo */}
        <Tabs defaultValue="deliverables" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deliverables" className="gap-2">
              <ListTodo className="h-4 w-4" /> Entregáveis
            </TabsTrigger>
            <TabsTrigger value="agenda" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Métricas
            </TabsTrigger>
          </TabsList>

          {/* Tab Entregáveis */}
          <TabsContent value="deliverables" className="space-y-4">
            {deliverables.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum entregável cadastrado para esta sprint.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {deliverables.map((deliverable) => (
                  <Card key={deliverable.id} className={deliverable.status === 'completed' ? 'bg-muted/50' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <Checkbox 
                          checked={deliverable.status === 'completed'}
                          onCheckedChange={(checked) => {
                            updateDeliverableStatus(
                              deliverable.id, 
                              checked ? 'completed' : 'pending'
                            );
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${deliverable.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {deliverable.title}
                            </span>
                            {getDateBadge(deliverable.due_date)}
                          </div>
                          {deliverable.description && (
                            <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {getProfileName(deliverable.assigned_to)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(deliverable.due_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            deliverable.status === 'completed' ? 'default' :
                            deliverable.status === 'in_progress' ? 'secondary' : 'outline'
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
                      <h3 className="font-semibold">
                        {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      {getDateBadge(date)}
                    </div>
                    <div className="space-y-2 ml-4 border-l-2 border-muted pl-4">
                      {dayEvents.map((event) => (
                        <Card key={event.id}>
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.start_time && (
                                    <span className="text-sm font-mono text-muted-foreground">
                                      {event.start_time.slice(0, 5)}
                                      {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                    </span>
                                  )}
                                  <span className="font-medium">{event.title}</span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                )}
                                {event.participants && event.participants.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <Users className="h-3 w-3 inline mr-1" />
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
                    <Card key={metric.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                        {metric.category && (
                          <Badge variant="outline" className="w-fit">{metric.category}</Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-bold">{metric.current_value || 0}</span>
                          {metric.target_value && (
                            <span className="text-muted-foreground mb-1">/ {metric.target_value} {metric.unit}</span>
                          )}
                        </div>
                        {metric.target_value && (
                          <>
                            <Progress value={percentage} className="mt-3" />
                            <p className="text-xs text-muted-foreground mt-1">{percentage}% concluído</p>
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