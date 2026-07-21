import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDomainEquipeTarefas,
  type EquipeTask,
  type EquipeTaskCluster,
  type EquipeTaskPriority,
  type EquipeTaskStatus,
} from '@/hooks/useDomainEquipeTarefas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Plus,
  Search,
  Database,
  Monitor,
  Briefcase,
  Clock,
  ListTodo,
  Pencil,
  Trash2
} from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';

const EquipeTarefas = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clusterFilter, setClusterFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<EquipeTask | null>(null);
  const [editTask, setEditTask] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    cluster: '',
    assigned_to: '',
    sprint_id: '',
    estimated_hours: '',
    due_date: ''
  });
  const {
    tasks,
    profiles,
    sprints,
    isLoading: loading,
    error: dataError,
    updateTask,
    deleteTask,
  } = useDomainEquipeTarefas({ statusFilter, clusterFilter, priorityFilter });
  const submitting = updateTask.isPending;

  useEffect(() => {
    if (dataError) {
      console.error('Error fetching data:', dataError);
    }
  }, [dataError]);

  useEffect(() => {
    if (selectedTask) {
      setEditTask({
        title: selectedTask.title,
        description: selectedTask.description || '',
        status: selectedTask.status,
        priority: selectedTask.priority,
        cluster: selectedTask.cluster,
        assigned_to: selectedTask.assigned_to || '',
        sprint_id: selectedTask.sprint_id || '',
        estimated_hours: selectedTask.estimated_hours?.toString() || '',
        due_date: selectedTask.due_date || ''
      });
    }
  }, [selectedTask]);

  const handleUpdateTask = async () => {
    if (!selectedTask || submitting) return;

    try {
      await updateTask.mutateAsync({
        taskId: selectedTask.id,
        payload: {
          title: editTask.title,
          description: editTask.description || null,
          status: editTask.status as EquipeTaskStatus,
          priority: editTask.priority as EquipeTaskPriority,
          cluster: editTask.cluster as EquipeTaskCluster,
          assigned_to: editTask.assigned_to || null,
          sprint_id: editTask.sprint_id || null,
          estimated_hours: editTask.estimated_hours ? parseFloat(editTask.estimated_hours) : null,
          due_date: editTask.due_date || null
        },
      });

      toast({
        title: "Tarefa atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tarefa.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      await deleteTask.mutateAsync(selectedTask.id);

      toast({
        title: "Tarefa excluída!",
        description: "A tarefa foi removida com sucesso.",
      });

      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a tarefa.",
        variant: "destructive"
      });
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

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return null;
    const profile = profiles.find(p => p.id === profileId);
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : null;
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
            <Card 
              key={task.id} 
              className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                      onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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

      {/* Edit Task Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900 flex items-center gap-2">
                  {getClusterIcon(selectedTask.cluster)}
                  Editar Tarefa
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Título <RequiredMark /></Label>
                  <Input
                    value={editTask.title}
                    onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Descrição</Label>
                  <Textarea
                    value={editTask.description}
                    onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Status</Label>
                    <Select value={editTask.status} onValueChange={(value) => setEditTask({ ...editTask, status: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="to_do">A Fazer</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="review">Revisão</SelectItem>
                        <SelectItem value="done">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Prioridade</Label>
                    <Select value={editTask.priority} onValueChange={(value) => setEditTask({ ...editTask, priority: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Cluster</Label>
                    <Select value={editTask.cluster} onValueChange={(value) => setEditTask({ ...editTask, cluster: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="database">Banco de Dados</SelectItem>
                        <SelectItem value="frontend">Frontend</SelectItem>
                        <SelectItem value="management">Gestão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Responsável</Label>
                    <Select value={editTask.assigned_to} onValueChange={(value) => setEditTask({ ...editTask, assigned_to: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Sprint</Label>
                    <Select value={editTask.sprint_id} onValueChange={(value) => setEditTask({ ...editTask, sprint_id: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {sprints.map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>
                            {sprint.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Horas Estimadas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={editTask.estimated_hours}
                      onChange={(e) => setEditTask({ ...editTask, estimated_hours: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Prazo</Label>
                    <Input
                      type="date"
                      value={editTask.due_date}
                      onChange={(e) => setEditTask({ ...editTask, due_date: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A tarefa "{selectedTask.title}" será permanentemente removida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedTask(null)}>
                      Cancelar
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90" onClick={handleUpdateTask} disabled={submitting}>
                      {submitting ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeTarefas;
