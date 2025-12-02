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
  MessageSquare,
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

interface TaskStats {
  total: number;
  backlog: number;
  to_do: number;
  in_progress: number;
  review: number;
  done: number;
}

const EquipeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, backlog: 0, to_do: 0, in_progress: 0, review: 0, done: 0 });
  const [myTasks, setMyTasks] = useState<any[]>([]);
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
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('sprint_id', sprintData.id);

        if (tasks) {
          const stats: TaskStats = {
            total: tasks.length,
            backlog: tasks.filter(t => t.status === 'backlog').length,
            to_do: tasks.filter(t => t.status === 'to_do').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length,
          };
          setTaskStats(stats);
        }
      }

      if (user) {
        const { data: myTasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', user.id)
          .neq('status', 'done')
          .order('priority', { ascending: true })
          .limit(5);

        setMyTasks(myTasksData || []);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      backlog: 'Backlog',
      to_do: 'A Fazer',
      in_progress: 'Em Progresso',
      review: 'Revisão',
      done: 'Concluído'
    };
    return labels[status] || status;
  };

  const progressPercent = taskStats.total > 0 
    ? Math.round((taskStats.done / taskStats.total) * 100) 
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
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
                <p className="text-2xl font-bold text-blue-600">{taskStats.to_do}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{taskStats.in_progress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revisão</p>
                <p className="text-2xl font-bold text-purple-600">{taskStats.review}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{taskStats.done}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Minhas Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : myTasks.length > 0 ? (
            <div className="space-y-3">
              {myTasks.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate('/equipe/tarefas')}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <span className="text-gray-900">{task.title}</span>
                  </div>
                  <Badge variant="outline" className="border-gray-300 text-gray-600">
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhuma tarefa atribuída a você</p>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full mt-4 text-primary hover:text-primary/80"
            onClick={() => navigate('/equipe/tarefas')}
          >
            Ver todas as tarefas
          </Button>
        </CardContent>
      </Card>
    </EquipeLayout>
  );
};

export default EquipeDashboard;