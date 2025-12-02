import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  Plus,
  LogOut,
  Search,
  Database,
  Monitor,
  Briefcase,
  Clock
} from 'lucide-react';
import logo from '@/assets/logo-psa.png';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  cluster: string;
  assigned_to: string | null;
  sprint_id: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  created_at: string;
}

const EquipeTarefas = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clusterFilter, setClusterFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, clusterFilter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'backlog' | 'to_do' | 'in_progress' | 'review' | 'done');
      }
      if (clusterFilter !== 'all') {
        query = query.eq('cluster', clusterFilter as 'database' | 'frontend' | 'management');
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter as 'low' | 'medium' | 'high' | 'urgent');
      }

      const { data } = await query;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/dashboard' },
    { icon: Kanban, label: 'Kanban', path: '/equipe/kanban' },
    { icon: Calendar, label: 'Sprints', path: '/equipe/sprints' },
    { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
    { icon: ListTodo, label: 'Tarefas', path: '/equipe/tarefas', active: true },
  ];

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      urgent: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Urgente' },
      high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Alta' },
      medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Média' },
      low: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Baixa' }
    };
    const { bg, text, label } = config[priority] || config.medium;
    return <Badge className={`${bg} ${text}`}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      backlog: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Backlog' },
      to_do: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'A Fazer' },
      in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Em Progresso' },
      review: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Revisão' },
      done: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Concluído' }
    };
    const { bg, text, label } = config[status] || config.backlog;
    return <Badge className={`${bg} ${text}`}>{label}</Badge>;
  };

  const getClusterIcon = (cluster: string) => {
    switch (cluster) {
      case 'database': return <Database className="h-4 w-4 text-blue-400" />;
      case 'frontend': return <Monitor className="h-4 w-4 text-green-400" />;
      case 'management': return <Briefcase className="h-4 w-4 text-purple-400" />;
      default: return null;
    }
  };

  const getClusterLabel = (cluster: string) => {
    switch (cluster) {
      case 'database': return 'Banco de Dados';
      case 'frontend': return 'Frontend';
      case 'management': return 'Gestão';
      default: return cluster;
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.description?.toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Tarefas</h1>
              <p className="text-gray-400">Gerencie todas as tarefas do time</p>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => navigate('/equipe/tarefas/nova')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarefas..."
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="to_do">A Fazer</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="review">Revisão</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clusterFilter} onValueChange={setClusterFilter}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Cluster" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="database">Banco de Dados</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="management">Gestão</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {getClusterIcon(task.cluster)}
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-400 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getClusterLabel(task.cluster)}
                        </span>
                        {task.estimated_hours && (
                          <span className="text-sm text-gray-500">{task.estimated_hours}h</span>
                        )}
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="py-16 text-center">
                <ListTodo className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-gray-400 mb-4">
                  {search ? 'Tente buscar com outros termos' : 'Crie sua primeira tarefa'}
                </p>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => navigate('/equipe/tarefas/nova')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Tarefa
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default EquipeTarefas;
