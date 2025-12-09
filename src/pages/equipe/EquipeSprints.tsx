import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { HorasAcumuladas } from '@/components/equipe/HorasAcumuladas';
import { 
  Plus,
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

interface SprintHours {
  userId: string;
  name: string;
  hours: number;
}

const EquipeSprints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project');
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprintHoursMap, setSprintHoursMap] = useState<Record<string, SprintHours[]>>({});
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    project_id: projectFilter || ''
  });
  const [editSprint, setEditSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    project_id: '',
    status: ''
  });

  useEffect(() => {
    fetchData();
  }, [projectFilter]);

  useEffect(() => {
    if (selectedSprint && isEditMode) {
      setEditSprint({
        name: selectedSprint.name,
        goal: selectedSprint.goal || '',
        start_date: selectedSprint.start_date,
        end_date: selectedSprint.end_date,
        project_id: selectedSprint.project_id || '',
        status: selectedSprint.status
      });
    }
  }, [selectedSprint, isEditMode]);

  const fetchData = async () => {
    try {
      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      setProjects(projectsData || []);

      // Fetch sprints
      let query = supabase
        .from('sprints')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (projectFilter) {
        query = query.eq('project_id', projectFilter);
      }

      const { data: sprintsData } = await query;
      setSprints(sprintsData || []);

      // Fetch hours for each sprint
      if (sprintsData && sprintsData.length > 0) {
        await fetchSprintHours(sprintsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSprintHours = async (sprintsList: Sprint[]) => {
    try {
      // Fetch all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');

      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => {
        profileMap[p.id] = `${p.first_name} ${p.last_name}`.trim() || 'Sem nome';
      });

      // Fetch tasks for all sprints
      const { data: tasks } = await supabase
        .from('tasks')
        .select('sprint_id, assigned_to, estimated_hours')
        .in('sprint_id', sprintsList.map(s => s.id));

      const hoursMap: Record<string, Record<string, number>> = {};

      tasks?.forEach(task => {
        if (task.sprint_id && task.assigned_to && task.estimated_hours) {
          if (!hoursMap[task.sprint_id]) {
            hoursMap[task.sprint_id] = {};
          }
          if (!hoursMap[task.sprint_id][task.assigned_to]) {
            hoursMap[task.sprint_id][task.assigned_to] = 0;
          }
          hoursMap[task.sprint_id][task.assigned_to] += Number(task.estimated_hours);
        }
      });

      const result: Record<string, SprintHours[]> = {};
      
      Object.entries(hoursMap).forEach(([sprintId, userHours]) => {
        result[sprintId] = Object.entries(userHours)
          .map(([userId, hours]) => ({
            userId,
            name: profileMap[userId] || 'Desconhecido',
            hours
          }))
          .sort((a, b) => b.hours - a.hours);
      });

      setSprintHoursMap(result);
    } catch (error) {
      console.error('Error fetching sprint hours:', error);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('sprints').insert({
        name: newSprint.name,
        goal: newSprint.goal || null,
        start_date: newSprint.start_date,
        end_date: newSprint.end_date,
        project_id: newSprint.project_id || null,
        status: 'active',
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Sprint criada!",
        description: "A nova sprint foi criada com sucesso.",
      });

      setIsDialogOpen(false);
      setNewSprint({ name: '', goal: '', start_date: '', end_date: '', project_id: projectFilter || '' });
      fetchData();
    } catch (error) {
      console.error('Error creating sprint:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a sprint.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSprint = async () => {
    if (!selectedSprint || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('sprints')
        .update({
          name: editSprint.name,
          goal: editSprint.goal || null,
          start_date: editSprint.start_date,
          end_date: editSprint.end_date,
          project_id: editSprint.project_id || null,
          status: editSprint.status
        })
        .eq('id', selectedSprint.id);

      if (error) throw error;

      toast({
        title: "Sprint atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      setSelectedSprint(null);
      setIsEditMode(false);
      fetchData();
    } catch (error) {
      console.error('Error updating sprint:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a sprint.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprint) return;

    try {
      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('id', selectedSprint.id);

      if (error) throw error;

      toast({
        title: "Sprint excluída!",
        description: "A sprint foi removida com sucesso.",
      });

      setSelectedSprint(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting sprint:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a sprint.",
        variant: "destructive"
      });
    }
  };

  const updateSprintStatus = async (sprintId: string, status: string) => {
    try {
      await supabase
        .from('sprints')
        .update({ status })
        .eq('id', sprintId);
      
      fetchData();
      toast({
        title: "Sprint atualizada!",
        description: `Status alterado para ${status === 'active' ? 'ativa' : 'concluída'}.`,
      });
    } catch (error) {
      console.error('Error updating sprint:', error);
    }
  };

  const toggleSprintExpanded = (sprintId: string) => {
    setExpandedSprints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sprintId)) {
        newSet.delete(sprintId);
      } else {
        newSet.add(sprintId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Ativa</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700">Concluída</Badge>;
      case 'planned':
        return <Badge className="bg-gray-100 text-gray-700">Planejada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name;
  };

  const getSprintTotalHours = (sprintId: string) => {
    const hours = sprintHoursMap[sprintId];
    if (!hours) return 0;
    return hours.reduce((sum, h) => sum + h.hours, 0);
  };

  return (
    <EquipeLayout 
      title="Gestão de Sprints" 
      subtitle={projectFilter ? `Sprints do projeto: ${getProjectName(projectFilter) || 'Carregando...'}` : "Sprints semanais do time"}
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Sprint
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Criar Nova Sprint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project" className="text-gray-700">Projeto</Label>
                <Select 
                  value={newSprint.project_id} 
                  onValueChange={(value) => setNewSprint({ ...newSprint, project_id: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Selecione um projeto (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Nome da Sprint *</Label>
                <Input
                  id="name"
                  value={newSprint.name}
                  onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Sprint 1 - Dezembro"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal" className="text-gray-700">Objetivo (opcional)</Label>
                <Textarea
                  id="goal"
                  value={newSprint.goal}
                  onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Descreva o objetivo principal desta sprint"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-gray-700">Data Início *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newSprint.start_date}
                    onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-gray-700">Data Fim *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newSprint.end_date}
                    onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar Sprint'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Card de Horas no topo */}
      <div className="mb-6">
        <HorasAcumuladas 
          showRoutines={true}
          title="Visão Geral de Horas"
        />
      </div>

      {/* Lista de Sprints */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : sprints.length > 0 ? (
        <div className="space-y-4">
          {sprints.map((sprint) => {
            const isExpanded = expandedSprints.has(sprint.id);
            const sprintHours = sprintHoursMap[sprint.id] || [];
            const totalHours = getSprintTotalHours(sprint.id);
            
            return (
              <Card key={sprint.id} className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-primary" />
                      <CardTitle className="text-gray-900">{sprint.name}</CardTitle>
                      {getStatusBadge(sprint.status)}
                      {sprint.project_id && (
                        <Badge variant="outline" className="border-gray-300 text-gray-600">
                          {getProjectName(sprint.project_id)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => { setSelectedSprint(sprint); setIsEditMode(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-primary text-primary hover:bg-primary/10"
                        onClick={() => navigate(`/equipe/sprints/${sprint.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      {sprint.status === 'active' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                          onClick={() => updateSprintStatus(sprint.id, 'completed')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Concluir
                        </Button>
                      ) : sprint.status === 'completed' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                          onClick={() => updateSprintStatus(sprint.id, 'active')}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Reabrir
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {sprint.goal && (
                    <p className="text-gray-600 mb-4">{sprint.goal}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(sprint.start_date).toLocaleDateString('pt-BR')} - {new Date(sprint.end_date).toLocaleDateString('pt-BR')}
                    </span>
                    {totalHours > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {totalHours.toFixed(1)}h alocadas
                      </span>
                    )}
                  </div>

                  {/* Horas por pessoa - expansível */}
                  {sprintHours.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-gray-600 hover:text-gray-900"
                        onClick={() => toggleSprintExpanded(sprint.id)}
                      >
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Horas por Pessoa ({sprintHours.length})
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      
                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {sprintHours.map((item) => (
                            <div key={item.userId} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{item.name}</span>
                                <span className="font-medium text-gray-900">{item.hours.toFixed(1)}h</span>
                              </div>
                              <Progress 
                                value={Math.min((item.hours / 40) * 100, 100)} 
                                className="h-1.5"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma sprint criada</h3>
            <p className="text-gray-500 mb-4">Crie sua primeira sprint para começar a organizar o trabalho</p>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Sprint
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Sprint Dialog */}
      <Dialog open={!!selectedSprint && isEditMode} onOpenChange={() => { setSelectedSprint(null); setIsEditMode(false); }}>
        <DialogContent className="bg-white border-gray-200">
          {selectedSprint && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Editar Sprint
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Projeto</Label>
                  <Select 
                    value={editSprint.project_id} 
                    onValueChange={(value) => setEditSprint({ ...editSprint, project_id: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Selecione um projeto (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Nome da Sprint *</Label>
                  <Input
                    value={editSprint.name}
                    onChange={(e) => setEditSprint({ ...editSprint, name: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Objetivo</Label>
                  <Textarea
                    value={editSprint.goal}
                    onChange={(e) => setEditSprint({ ...editSprint, goal: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Data Início *</Label>
                    <Input
                      type="date"
                      value={editSprint.start_date}
                      onChange={(e) => setEditSprint({ ...editSprint, start_date: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Data Fim *</Label>
                    <Input
                      type="date"
                      value={editSprint.end_date}
                      onChange={(e) => setEditSprint({ ...editSprint, end_date: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Status</Label>
                  <Select value={editSprint.status} onValueChange={(value) => setEditSprint({ ...editSprint, status: value })}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="planned">Planejada</SelectItem>
                    </SelectContent>
                  </Select>
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
                        <AlertDialogTitle>Excluir sprint?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A sprint "{selectedSprint.name}" será permanentemente removida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSprint} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setSelectedSprint(null); setIsEditMode(false); }}>
                      Cancelar
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90" onClick={handleUpdateSprint} disabled={submitting}>
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

export default EquipeSprints;