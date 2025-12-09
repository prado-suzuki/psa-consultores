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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Plus,
  FolderKanban,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Archive,
  LayoutGrid,
  List,
  Eye,
  Filter,
  AlertCircle
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

// Helper to extract area from description
const extractArea = (description: string | null): string => {
  if (!description) return 'Sem área';
  const match = description.match(/Área:\s*([^|]+)/);
  return match ? match[1].trim() : 'Sem área';
};

// Helper to extract priority from description
const extractPriority = (description: string | null): string => {
  if (!description) return '-';
  const match = description.match(/Prioridade:\s*([^|]+)/);
  return match ? match[1].trim() : '-';
};

// Helper to extract phase from description
const extractPhase = (description: string | null): string => {
  if (!description) return '-';
  const match = description.match(/Fase:\s*([^|]+)/);
  return match ? match[1].trim() : '-';
};

const EquipeProjetos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  // Get unique areas from projects
  const areas = [...new Set(projects.map(p => extractArea(p.description)))].sort();

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesArea = areaFilter === 'all' || extractArea(project.description) === areaFilter;
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesArea && matchesStatus;
  });

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
        description: `Status alterado para ${status === 'active' ? 'ativo' : status === 'completed' ? 'concluído' : status === 'blocked' ? 'bloqueado' : 'arquivado'}.`,
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
      case 'blocked':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Bloqueado</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'crítica':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Crítica</Badge>;
      case 'alta':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Alta</Badge>;
      case 'média':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Média</Badge>;
      case 'baixa':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getAreaBadge = (area: string) => {
    const colors: Record<string, string> = {
      'Consultoria': 'bg-purple-100 text-purple-700',
      'Fiscal': 'bg-blue-100 text-blue-700',
      'Fixos': 'bg-teal-100 text-teal-700',
      'Fixos/Previdenciário': 'bg-indigo-100 text-indigo-700',
    };
    const colorClass = colors[area] || 'bg-gray-100 text-gray-700';
    return <Badge className={`${colorClass} hover:${colorClass}`}>{area}</Badge>;
  };

  return (
    <EquipeLayout 
      title="Projetos" 
      subtitle={`${filteredProjects.length} projetos encontrados`}
      headerActions={
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-200 rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

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
        </div>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filtros:</span>
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-48 bg-white border-gray-300">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">Todas as áreas</SelectItem>
            {areas.map(area => (
              <SelectItem key={area} value={area}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white border-gray-300">
            <SelectValue placeholder="Todos status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        {(areaFilter !== 'all' || statusFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setAreaFilter('all'); setStatusFilter('all'); }}
            className="text-gray-500"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredProjects.length > 0 ? (
        <>
          {/* Table View */}
          {viewMode === 'table' && (
            <Card className="bg-white border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="text-gray-600">Nome</TableHead>
                    <TableHead className="text-gray-600">Área</TableHead>
                    <TableHead className="text-gray-600">Status</TableHead>
                    <TableHead className="text-gray-600">Prioridade</TableHead>
                    <TableHead className="text-gray-600">Fase</TableHead>
                    <TableHead className="text-gray-600">Cliente</TableHead>
                    <TableHead className="text-gray-600 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className="border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedProject(project)}
                    >
                      <TableCell className="font-medium text-gray-900">{project.name}</TableCell>
                      <TableCell>{getAreaBadge(extractArea(project.description))}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>{getPriorityBadge(extractPriority(project.description))}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{extractPhase(project.description)}</TableCell>
                      <TableCell className="text-gray-600">{project.client_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-primary" />
                        <CardTitle className="text-gray-900 text-lg line-clamp-1">{project.name}</CardTitle>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getAreaBadge(extractArea(project.description))}
                      {getPriorityBadge(extractPriority(project.description))}
                    </div>
                    
                    {project.client_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Building2 className="h-4 w-4" />
                        <span>{project.client_name}</span>
                      </div>
                    )}
                    
                    {(project.start_date || project.end_date) && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {project.start_date && new Date(project.start_date).toLocaleDateString('pt-BR')}
                          {project.start_date && project.end_date && ' - '}
                          {project.end_date && new Date(project.end_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {projects.length === 0 ? 'Nenhum projeto criado' : 'Nenhum projeto encontrado'}
            </h3>
            <p className="text-gray-500 mb-4">
              {projects.length === 0 
                ? 'Crie seu primeiro projeto para começar a organizar o trabalho'
                : 'Tente ajustar os filtros para ver mais resultados'
              }
            </p>
            {projects.length === 0 && (
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Projeto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900 flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-primary" />
                  {selectedProject.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedProject.status)}
                  {getAreaBadge(extractArea(selectedProject.description))}
                  {getPriorityBadge(extractPriority(selectedProject.description))}
                </div>

                {selectedProject.description && (
                  <div className="space-y-2">
                    <Label className="text-gray-600 text-sm">Informações</Label>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                      {selectedProject.description.split('|').map((part, i) => (
                        <div key={i} className="py-1">{part.trim()}</div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProject.client_name && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>Cliente: {selectedProject.client_name}</span>
                  </div>
                )}

                {(selectedProject.start_date || selectedProject.end_date) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {selectedProject.start_date && `Início: ${new Date(selectedProject.start_date).toLocaleDateString('pt-BR')}`}
                      {selectedProject.start_date && selectedProject.end_date && ' | '}
                      {selectedProject.end_date && `Fim: ${new Date(selectedProject.end_date).toLocaleDateString('pt-BR')}`}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  {selectedProject.status === 'active' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        onClick={() => { updateProjectStatus(selectedProject.id, 'completed'); setSelectedProject(null); }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Concluir
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        onClick={() => { updateProjectStatus(selectedProject.id, 'blocked'); setSelectedProject(null); }}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Bloquear
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        onClick={() => { updateProjectStatus(selectedProject.id, 'archived'); setSelectedProject(null); }}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Arquivar
                      </Button>
                    </>
                  )}
                  {(selectedProject.status === 'completed' || selectedProject.status === 'blocked' || selectedProject.status === 'archived') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={() => { updateProjectStatus(selectedProject.id, 'active'); setSelectedProject(null); }}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Reativar
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    className="bg-primary hover:bg-primary/90 ml-auto"
                    onClick={() => { setSelectedProject(null); navigate(`/equipe/sprints?project=${selectedProject.id}`); }}
                  >
                    Ver Sprints
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeProjetos;