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
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Plus,
  Target,
  CheckCircle2,
  Clock,
  Calendar
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

const EquipeSprints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project');
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    project_id: projectFilter || ''
  });

  useEffect(() => {
    fetchData();
  }, [projectFilter]);

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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Criar Sprint
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : sprints.length > 0 ? (
        <div className="space-y-4">
          {sprints.map((sprint) => (
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
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(sprint.start_date).toLocaleDateString('pt-BR')} - {new Date(sprint.end_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </EquipeLayout>
  );
};

export default EquipeSprints;
