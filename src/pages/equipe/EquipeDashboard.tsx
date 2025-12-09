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

// Helper para parse correto de datas (evita problema de timezone UTC)
const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

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
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
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
        <span className="text-sm text-gray-500">
          Atualizado: {lastUpdate?.toLocaleString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          })}
        </span>
      }
    >
      {/* Active Sprint Card - Simplified */}
      {activeSprint ? (
        <Card className="bg-white border-gray-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">{activeSprint.name}</h2>
                <Badge className="bg-primary/10 text-primary border-0">Ativa</Badge>
              </div>
              <span className="text-sm text-gray-500">
                {parseDate(activeSprint.start_date).toLocaleDateString('pt-BR')} - {parseDate(activeSprint.end_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {activeSprint.goal && (
              <p className="text-gray-600 mb-4 text-sm">{activeSprint.goal}</p>
            )}
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-gray-900 font-semibold">{progressPercent}%</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-gray-200 mb-6">
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">Nenhuma sprint ativa</p>
            <Button 
              variant="outline" 
              className="border-gray-300 text-gray-600"
              onClick={() => navigate('/equipe/sprints')}
            >
              Criar Sprint
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid - Clean, no icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500 mb-1">A Fazer</p>
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500 mb-1">Em Progresso</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500 mb-1">Concluídas</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - Clean titles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-900 text-base font-medium">
              Volume de Entregas por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB' }}
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

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-900 text-base font-medium">
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
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB' }}
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

      {/* Tabs for Sprint/Rotina Filter */}
      <Tabs defaultValue="sprint" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="sprint">Sprint</TabsTrigger>
          <TabsTrigger value="rotina">Rotina</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="sprint">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 text-base font-medium">
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
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate('/equipe/sprints')}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(deliverable.status)}>
                          {parseDate(deliverable.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </Badge>
                        <span className="text-gray-900">{deliverable.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {deliverable.estimated_hours && (
                          <span className="text-xs text-gray-500">{deliverable.estimated_hours}h</span>
                        )}
                        <Badge variant="outline" className="border-gray-300 text-gray-600">
                          {getStatusLabel(deliverable.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum entregável atribuído a você</p>
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
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 text-base font-medium">
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
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate('/equipe/rotina')}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-purple-100 text-purple-700">
                          {getFrequencyLabel(routine.frequency)}
                        </Badge>
                        <span className="text-gray-900">{routine.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {routine.estimated_hours && (
                          <span className="text-xs text-gray-500">{routine.estimated_hours}h</span>
                        )}
                        <Badge variant="outline" className="border-gray-300 text-gray-600">
                          {getStatusLabel(routine.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhuma rotina atribuída a você</p>
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

        <TabsContent value="todos">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 text-base font-medium">
                  Entregáveis da Sprint
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myDeliverables.length > 0 ? (
                  <div className="space-y-2">
                    {myDeliverables.map((deliverable) => (
                      <div 
                        key={deliverable.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate('/equipe/sprints')}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(deliverable.status)}>
                            {parseDate(deliverable.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </Badge>
                          <span className="text-gray-900 text-sm">{deliverable.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">Nenhum entregável</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 text-base font-medium">
                  Tarefas de Rotina
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myRoutines.length > 0 ? (
                  <div className="space-y-2">
                    {myRoutines.map((routine) => (
                      <div 
                        key={routine.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate('/equipe/rotina')}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className="bg-purple-100 text-purple-700">
                            {getFrequencyLabel(routine.frequency)}
                          </Badge>
                          <span className="text-gray-900 text-sm">{routine.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">Nenhuma rotina</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </EquipeLayout>
  );
};

export default EquipeDashboard;