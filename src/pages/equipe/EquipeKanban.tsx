import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  Plus,
  LogOut,
  User,
  Database,
  Monitor,
  Briefcase
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
}

interface Sprint {
  id: string;
  name: string;
}

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-500' },
  { id: 'to_do', title: 'A Fazer', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'Em Progresso', color: 'bg-yellow-500' },
  { id: 'review', title: 'Revisão', color: 'bg-purple-500' },
  { id: 'done', title: 'Concluído', color: 'bg-green-500' },
];

const EquipeKanban = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedSprint, selectedCluster]);

  const fetchData = async () => {
    try {
      // Fetch sprints
      const { data: sprintsData } = await supabase
        .from('sprints')
        .select('id, name')
        .order('start_date', { ascending: false });
      
      setSprints(sprintsData || []);

      // Fetch tasks
      let query = supabase.from('tasks').select('*');
      
      if (selectedSprint !== 'all') {
        query = query.eq('sprint_id', selectedSprint);
      }
      
      if (selectedCluster !== 'all') {
        query = query.eq('cluster', selectedCluster as 'database' | 'frontend' | 'management');
      }

      const { data: tasksData } = await query;
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'backlog' | 'to_do' | 'in_progress' | 'review' | 'done') => {
    try {
      await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/dashboard' },
    { icon: Kanban, label: 'Kanban', path: '/equipe/kanban', active: true },
    { icon: Calendar, label: 'Sprints', path: '/equipe/sprints' },
    { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
    { icon: ListTodo, label: 'Tarefas', path: '/equipe/tarefas' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-gray-500';
    }
  };

  const getClusterIcon = (cluster: string) => {
    switch (cluster) {
      case 'database': return <Database className="h-3 w-3" />;
      case 'frontend': return <Monitor className="h-3 w-3" />;
      case 'management': return <Briefcase className="h-3 w-3" />;
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
      <main className="flex-1 p-8 overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Quadro Kanban</h1>
              <p className="text-gray-400">Visualize e gerencie suas tarefas</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Sprint" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">Todas as Sprints</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedCluster} onValueChange={setSelectedCluster}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Cluster" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">Todos os Clusters</SelectItem>
                  <SelectItem value="database">Banco de Dados</SelectItem>
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="management">Gestão</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => navigate('/equipe/tarefas/nova')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          </div>

          {/* Kanban Board */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {columns.map((column) => (
                <div key={column.id} className="bg-gray-900/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="text-white font-semibold">{column.title}</h3>
                    <Badge variant="outline" className="ml-auto border-gray-700 text-gray-400">
                      {tasks.filter(t => t.status === column.id).length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 min-h-[400px]">
                    {tasks
                      .filter(task => task.status === column.id)
                      .map((task) => (
                        <Card 
                          key={task.id}
                          className={`bg-gray-800/50 border-gray-700 border-l-4 ${getPriorityColor(task.priority)} cursor-pointer hover:bg-gray-800 transition-colors`}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData('taskId');
                            updateTaskStatus(taskId, column.id);
                          }}
                        >
                          <CardContent className="p-3">
                            <h4 className="text-white text-sm font-medium mb-2">{task.title}</h4>
                            {task.description && (
                              <p className="text-gray-400 text-xs mb-3 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="outline" 
                                className="border-gray-600 text-gray-300 text-xs flex items-center gap-1"
                              >
                                {getClusterIcon(task.cluster)}
                                {getClusterLabel(task.cluster)}
                              </Badge>
                              {task.estimated_hours && (
                                <span className="text-xs text-gray-500">{task.estimated_hours}h</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  
                  {/* Drop zone */}
                  <div 
                    className="min-h-[100px] border-2 border-dashed border-gray-700/50 rounded-lg mt-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData('taskId');
                      updateTaskStatus(taskId, column.id);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EquipeKanban;
