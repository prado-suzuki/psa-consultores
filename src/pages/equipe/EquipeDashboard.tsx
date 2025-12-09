import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  RefreshCw
} from 'lucide-react';

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

const EquipeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [stats, setStats] = useState<DeliverableStats>({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [myDeliverables, setMyDeliverables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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

      if (user) {
        const { data: myDeliverablesData } = await supabase
          .from('sprint_deliverables')
          .select('*')
          .eq('assigned_to', user.id)
          .neq('status', 'completed')
          .order('due_date', { ascending: true })
          .limit(5);

        setMyDeliverables(myDeliverablesData || []);
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

  const progressPercent = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <EquipeLayout 
      title="Dashboard" 
      subtitle="Visão geral do seu trabalho"
      headerActions={
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4" />
          <span>
            Atualizado: {lastUpdate?.toLocaleString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            })}
          </span>
        </div>
      }
    >
      {/* Active Sprint Card */}
      {activeSprint ? (
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-gray-900">{activeSprint.name}</CardTitle>
                <Badge className="bg-green-100 text-green-700">Ativa</Badge>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(activeSprint.start_date).toLocaleDateString('pt-BR')} - {new Date(activeSprint.end_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {activeSprint.goal && (
              <p className="text-gray-600 mb-4">{activeSprint.goal}</p>
            )}
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all"
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
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma sprint ativa</p>
            <Button 
              variant="outline" 
              className="mt-4 border-gray-300 text-gray-600"
              onClick={() => navigate('/equipe/sprints')}
            >
              Criar Sprint
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <ListTodo className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">A Fazer</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Em Progresso</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Deliverables */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Meus Entregáveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : myDeliverables.length > 0 ? (
            <div className="space-y-3">
              {myDeliverables.map((deliverable) => (
                <div 
                  key={deliverable.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate('/equipe/sprints')}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(deliverable.status)}>
                      {new Date(deliverable.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </Badge>
                    <span className="text-gray-900">{deliverable.title}</span>
                  </div>
                  <Badge variant="outline" className="border-gray-300 text-gray-600">
                    {getStatusLabel(deliverable.status)}
                  </Badge>
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
    </EquipeLayout>
  );
};

export default EquipeDashboard;