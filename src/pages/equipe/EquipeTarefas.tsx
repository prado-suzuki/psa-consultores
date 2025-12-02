import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Plus,
  Search,
  Database,
  Monitor,
  Briefcase,
  Clock,
  ListTodo
} from 'lucide-react';

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

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgente' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alta' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Média' },
      low: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Baixa' }
    };
    const { bg, text, label } = config[priority] || config.medium;
    return <Badge className={`${bg} ${text}`}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      backlog: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Backlog' },
      to_do: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'A Fazer' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Em Progresso' },
      review: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Revisão' },
      done: { bg: 'bg-green-100', text: 'text-green-700', label: 'Concluído' }
    };
    const { bg, text, label } = config[status] || config.backlog;
    return <Badge className={`${bg} ${text}`}>{label}</Badge>;
  };

  const getClusterIcon = (cluster: string) => {
    switch (cluster) {
      case 'database': return <Database className="h-4 w-4 text-blue-600" />;
      case 'frontend': return <Monitor className="h-4 w-4 text-green-600" />;
      case 'management': return <Briefcase className="h-4 w-4 text-purple-600" />;
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
    <EquipeLayout 
      title="Tarefas" 
      subtitle="Gerencie todas as tarefas do time"
      headerActions={
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => navigate('/equipe/tarefas/nova')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefas..."
            className="pl-10 bg-white border-gray-300 text-gray-900"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="to_do">A Fazer</SelectItem>
            <SelectItem value="in_progress">Em Progresso</SelectItem>
            <SelectItem value="review">Revisão</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
            <SelectValue placeholder="Cluster" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="database">Banco de Dados</SelectItem>
            <SelectItem value="frontend">Frontend</SelectItem>
            <SelectItem value="management">Gestão</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
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
            <Card key={task.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {getClusterIcon(task.cluster)}
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-medium">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
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
        <Card className="bg-white border-gray-200">
          <CardContent className="py-16 text-center">
            <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-gray-500 mb-4">
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
    </EquipeLayout>
  );
};

export default EquipeTarefas;
