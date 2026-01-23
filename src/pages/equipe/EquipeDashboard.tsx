import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { HorasAcumuladas } from '@/components/equipe/HorasAcumuladas';
import { ImpactDashboard } from '@/components/equipe/ImpactDashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

interface DeliverableStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

interface AreaData {
  name: string;
  count: number;
}

import { parseDate } from '@/lib/dateUtils';

const COLORS = ['#65A30D', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const EquipeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [stats, setStats] = useState<DeliverableStats>({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [myDeliverables, setMyDeliverables] = useState<any[]>([]);
  const [myRoutines, setMyRoutines] = useState<any[]>([]);
  const [areaData, setAreaData] = useState<AreaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>('sprint');

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: sprintData } = await supabase
        .from('sprints')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setActiveSprint(sprintData);

      if (sprintData) {
        const { data: deliverables } = await supabase
          .from('sprint_deliverables')
          .select('status')
          .eq('sprint_id', sprintData.id);

        if (deliverables) {
          const deliverableStats: DeliverableStats = {
            total: deliverables.length,
            pending: deliverables.filter(d => d.status === 'pending').length,
            in_progress: deliverables.filter(d => d.status === 'in_progress').length,
            completed: deliverables.filter(d => d.status === 'completed').length,
          };
          setStats(deliverableStats);
        }
      }

      const { data: processes } = await supabase
        .from('processes')
        .select('area');

      if (processes) {
        const areaCounts: Record<string, number> = {};
        processes.forEach(p => {
          const area = p.area || 'Sem área';
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        });
        setAreaData(Object.entries(areaCounts).map(([name, count]) => ({ name, count })));
      }

      if (user) {
        const { data: myDeliverablesData } = await supabase
          .from('sprint_deliverables')
          .select('*')
          .eq('assigned_to', user.id)
          .neq('status', 'completed')
          .order('due_date', { ascending: true })
          .limit(5);

        setMyDeliverables(myDeliverablesData || []);

        const { data: myRoutinesData } = await supabase
          .from('routines')
          .select('*')
          .eq('assigned_to', user.id)
          .neq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5);

        setMyRoutines(myRoutinesData || []);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'A Fazer',
      in_progress: 'Em Progresso',
      completed: 'Concluído'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-0';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-0';
      default: return 'bg-blue-100 text-blue-700 border-0';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: 'Diária',
      weekly: 'Semanal',
      monthly: 'Mensal'
    };
    return labels[frequency] || frequency;
  };

  const progressPercent = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const volumeData = [
    { name: 'A Fazer', value: stats.pending, fill: '#3B82F6' },
    { name: 'Em Progresso', value: stats.in_progress, fill: '#F59E0B' },
    { name: 'Concluídas', value: stats.completed, fill: '#65A30D' },
  ];

  return (
    <EquipeLayout 
      title="Dashboard" 
      subtitle="Visão geral do seu trabalho"
      headerActions={
        <span className="text-sm text-muted-foreground">
          Atualizado: {lastUpdate?.toLocaleString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          })}
        </span>
      }
    >
      {/* Tabs no topo */}
      <Tabs defaultValue="sprint" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="sprint">Sprint</TabsTrigger>
          <TabsTrigger value="rotina">Rotina</TabsTrigger>
          <TabsTrigger value="impacto">Impacto Digital</TabsTrigger>
        </TabsList>

        <TabsContent value="sprint">
          {/* Active Sprint Card */}
          {activeSprint ? (
            <Card className="border-border shadow-sm mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{activeSprint.name}</h2>
                    <Badge className="bg-primary/10 text-primary border-0">Ativa</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {parseDate(activeSprint.start_date).toLocaleDateString('pt-BR')} - {parseDate(activeSprint.end_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {activeSprint.goal && (
                  <p className="text-muted-foreground mb-4 text-sm">{activeSprint.goal}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-foreground font-semibold">{progressPercent}%</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm mb-6">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">Nenhuma sprint ativa</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/equipe/sprints')}
                >
                  Criar Sprint
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">A Fazer</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">Em Progresso</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-primary">{stats.completed}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-base font-semibold">
                  Volume de Entregas por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ className: 'fill-muted-foreground', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value} entregas`, 'Quantidade']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {volumeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-base font-semibold">
                  Processos por Área
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={areaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {areaData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value} processos`, 'Quantidade']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hours Panel */}
          <div className="mb-8">
            <HorasAcumuladas 
              sprintId={activeSprint?.id}
              showRoutines={true}
              title="Horas Alocadas por Pessoa"
              maxHoursPerWeek={40}
            />
          </div>

          {/* My Deliverables List */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold">
                Meus Entregáveis da Sprint
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : myDeliverables.length > 0 ? (
                <div className="space-y-2">
                  {myDeliverables.map((deliverable) => (
                    <div 
                      key={deliverable.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate('/equipe/sprints')}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(deliverable.status)}>
                          {parseDate(deliverable.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </Badge>
                        <span className="text-foreground">{deliverable.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {deliverable.estimated_hours && (
                          <span className="text-xs text-muted-foreground">{deliverable.estimated_hours}h</span>
                        )}
                        <Badge variant="outline">
                          {getStatusLabel(deliverable.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhum entregável atribuído a você</p>
              )}
              
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-primary hover:text-primary/80"
                onClick={() => navigate('/equipe/sprints')}
              >
                Ver sprint ativa
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rotina">
          <div className="flex justify-end mb-4">
            <Button onClick={() => navigate('/equipe/rotina?criar=true')}>
              + Incluir Rotina
            </Button>
          </div>
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold">
                Minhas Tarefas de Rotina
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : myRoutines.length > 0 ? (
                <div className="space-y-2">
                  {myRoutines.map((routine) => (
                    <div 
                      key={routine.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => navigate('/equipe/rotina')}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-teal-100 text-teal-700 border-0">
                          {getFrequencyLabel(routine.frequency)}
                        </Badge>
                        <span className="text-slate-700">{routine.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {routine.estimated_hours && (
                          <span className="text-xs text-slate-500">{routine.estimated_hours}h</span>
                        )}
                        <Badge variant="outline" className="border-slate-200 text-slate-600">
                          {getStatusLabel(routine.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">Nenhuma rotina atribuída a você</p>
              )}
              
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-primary hover:text-primary/80"
                onClick={() => navigate('/equipe/rotina')}
              >
                Ver rotinas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="impacto">
          <ImpactDashboard />
        </TabsContent>
      </Tabs>
    </EquipeLayout>
  );
};

export default EquipeDashboard;