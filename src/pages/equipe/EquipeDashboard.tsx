import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  Plus,
  LogOut,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import logo from '@/assets/logo-psa.png';

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, backlog: 0, to_do: 0, in_progress: 0, review: 0, done: 0 });
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch active sprint
      const { data: sprintData } = await supabase
        .from('sprints')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setActiveSprint(sprintData);

      // Fetch task stats for active sprint
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

      // Fetch my tasks
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
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/dashboard', active: true },
    { icon: Kanban, label: 'Kanban', path: '/equipe/kanban' },
    { icon: Calendar, label: 'Sprints', path: '/equipe/sprints' },
    { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
    { icon: ListTodo, label: 'Tarefas', path: '/equipe/tarefas' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
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
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900/50 border-r border-gray-800 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="PSA" className="h-10" />
          <div>
            <h1 className="text-white font-semibold">Equipe PSA</h1>
            <p className="text-xs text-gray-400">Gestão de Demandas</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={item.active ? "secondary" : "ghost"}
              className={`w-full justify-start ${item.active ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'}`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>

        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-400 hover:text-red-400"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sair
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-400">Visão geral do seu trabalho</p>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => navigate('/equipe/tarefas/nova')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>

          {/* Active Sprint Card */}
          {activeSprint ? (
            <Card className="bg-gray-900/50 border-gray-800 mb-6">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-white">{activeSprint.name}</CardTitle>
                    <Badge className="bg-green-500/20 text-green-400">Ativa</Badge>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(activeSprint.start_date).toLocaleDateString('pt-BR')} - {new Date(activeSprint.end_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {activeSprint.goal && (
                  <p className="text-gray-300 mb-4">{activeSprint.goal}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-800 rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold">{progressPercent}%</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800 mb-6">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhuma sprint ativa</p>
                <Button 
                  variant="outline" 
                  className="mt-4 border-gray-700 text-gray-300"
                  onClick={() => navigate('/equipe/sprints')}
                >
                  Criar Sprint
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-white">{taskStats.total}</p>
                  </div>
                  <ListTodo className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">A Fazer</p>
                    <p className="text-2xl font-bold text-blue-400">{taskStats.to_do}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Em Progresso</p>
                    <p className="text-2xl font-bold text-yellow-400">{taskStats.in_progress}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Revisão</p>
                    <p className="text-2xl font-bold text-purple-400">{taskStats.review}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-purple-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Concluídas</p>
                    <p className="text-2xl font-bold text-green-400">{taskStats.done}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Tasks */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
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
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => navigate('/equipe/tarefas')}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <span className="text-white">{task.title}</span>
                      </div>
                      <Badge variant="outline" className="border-gray-700 text-gray-400">
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Nenhuma tarefa atribuída a você</p>
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
        </div>
      </main>
    </div>
  );
};

export default EquipeDashboard;
