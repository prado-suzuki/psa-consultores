import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Plus,
  FolderKanban,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Archive
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const EquipeProjetos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('projects').insert({
        name: newProject.name,
        description: newProject.description || null,
        client_name: newProject.client_name || null,
        start_date: newProject.start_date || null,
        end_date: newProject.end_date || null,
        status: 'active',
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Projeto criado!",
        description: "O novo projeto foi criado com sucesso.",
      });

      setIsDialogOpen(false);
      setNewProject({ name: '', description: '', client_name: '', start_date: '', end_date: '' });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o projeto.",
        variant: "destructive"
      });
    }
  };

  const updateProjectStatus = async (projectId: string, status: string) => {
    try {
      await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId);
      
      fetchProjects();
      toast({
        title: "Projeto atualizado!",
        description: `Status alterado para ${status === 'active' ? 'ativo' : status === 'completed' ? 'concluído' : 'arquivado'}.`,
      });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativo</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Concluído</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <EquipeLayout 
      title="Projetos" 
      subtitle="Gerencie os projetos mapeados"
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Criar Novo Projeto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Nome do Projeto *</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Sistema de Gestão"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700">Descrição</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Descreva o projeto..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_name" className="text-gray-700">Cliente</Label>
                <Input
                  id="client_name"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-gray-700">Data Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-gray-700">Data Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newProject.end_date}
                    onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Criar Projeto
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
      ) : projects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    <CardTitle className="text-gray-900 text-lg">{project.name}</CardTitle>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                )}
                
                {project.client_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Building2 className="h-4 w-4" />
                    <span>{project.client_name}</span>
                  </div>
                )}
                
                {(project.start_date || project.end_date) && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {project.start_date && new Date(project.start_date).toLocaleDateString('pt-BR')}
                      {project.start_date && project.end_date && ' - '}
                      {project.end_date && new Date(project.end_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {project.status === 'active' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                        onClick={() => updateProjectStatus(project.id, 'completed')}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Concluir
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        onClick={() => updateProjectStatus(project.id, 'archived')}
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {project.status === 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={() => updateProjectStatus(project.id, 'active')}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Reabrir
                    </Button>
                  )}
                  {project.status === 'archived' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={() => updateProjectStatus(project.id, 'active')}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Reativar
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                    onClick={() => navigate(`/equipe/sprints?project=${project.id}`)}
                  >
                    Ver Sprints
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum projeto criado</h3>
            <p className="text-gray-500 mb-4">Crie seu primeiro projeto para começar a organizar o trabalho</p>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Projeto
            </Button>
          </CardContent>
        </Card>
      )}
    </EquipeLayout>
  );
};

export default EquipeProjetos;
