import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Plus,
  Database,
  Monitor,
  Briefcase,
  LayoutGrid,
  List
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
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedSprint, selectedCluster]);

  const fetchData = async () => {
    try {
      const { data: sprintsData } = await supabase
        .from('sprints')
        .select('id, name')
        .order('start_date', { ascending: false });
      
      setSprints(sprintsData || []);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-gray-400';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'review': return 'bg-purple-100 text-purple-700';
      case 'to_do': return 'bg-blue-100 text-blue-700';
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
    <EquipeLayout 
      title="Quadro Kanban" 
      subtitle="Visualize e gerencie suas tarefas"
      headerActions={
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Select value={selectedSprint} onValueChange={setSelectedSprint}>
            <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todas as Sprints</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="Cluster" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
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
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-5 gap-4 min-w-[1000px]">
          {columns.map((column) => (
            <div key={column.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="text-gray-900 font-semibold">{column.title}</h3>
                <Badge variant="outline" className="ml-auto border-gray-300 text-gray-600">
                  {tasks.filter(t => t.status === column.id).length}
                </Badge>
              </div>
              
              <div className="space-y-3 min-h-[400px]">
                {tasks
                  .filter(task => task.status === column.id)
                  .map((task) => (
                    <Card 
                      key={task.id}
                      className={`bg-white border-gray-200 border-l-4 ${getPriorityColor(task.priority)} cursor-pointer hover:shadow-md transition-shadow h-32 overflow-hidden`}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const taskId = e.dataTransfer.getData('taskId');
                        updateTaskStatus(taskId, column.id as 'backlog' | 'to_do' | 'in_progress' | 'review' | 'done');
                      }}
                    >
                      <CardContent className="p-3 h-full flex flex-col">
                        <h4 className="text-gray-900 text-sm font-medium mb-2 line-clamp-2">{task.title}</h4>
                        <div className="mt-auto flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className="border-gray-300 text-gray-600 text-xs flex items-center gap-1"
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
              
              <div 
                className="min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg mt-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData('taskId');
                  updateTaskStatus(taskId, column.id as 'backlog' | 'to_do' | 'in_progress' | 'review' | 'done');
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-white border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700">Título</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
                <TableHead className="text-gray-700">Prioridade</TableHead>
                <TableHead className="text-gray-700">Cluster</TableHead>
                <TableHead className="text-gray-700 text-right">Horas Est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Nenhuma tarefa encontrada
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="text-gray-900 font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadgeColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gray-300 text-gray-600 flex items-center gap-1 w-fit">
                        {getClusterIcon(task.cluster)}
                        {getClusterLabel(task.cluster)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </EquipeLayout>
  );
};

export default EquipeKanban;