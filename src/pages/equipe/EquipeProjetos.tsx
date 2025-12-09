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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertCircle,
  Pencil,
  Trash2,
  ListTodo,
  User,
  Workflow,
  ArrowRight
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

interface BacklogTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  cluster: string;
  estimated_hours: number | null;
  assigned_to: string | null;
}

interface Process {
  id: string;
  name: string;
  description: string | null;
  area: string | null;
  stage: string;
  priority: string | null;
  frequency: string | null;
  volume_month: number | null;
  financial_impact: string | null;
  project_id: string | null;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

// Process stages configuration
const PROCESS_STAGES = [
  { value: 'discovery', label: 'Descoberta', color: 'bg-gray-100 text-gray-700' },
  { value: 'mapping', label: 'Mapeamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'analysis', label: 'Análise', color: 'bg-purple-100 text-purple-700' },
  { value: 'improvement', label: 'Melhoria', color: 'bg-orange-100 text-orange-700' },
  { value: 'automation', label: 'Automação', color: 'bg-teal-100 text-teal-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-green-100 text-green-700' }
];

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('info');
  const [backlogTasks, setBacklogTasks] = useState<BacklogTask[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    end_date: ''
  });
  const [editProject, setEditProject] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    end_date: '',
    status: ''
  });
  const [newProcess, setNewProcess] = useState({
    name: '',
    description: '',
    area: '',
    stage: 'discovery',
    priority: 'medium',
    frequency: '',
    volume_month: '',
    financial_impact: ''
  });
  const [editProcess, setEditProcess] = useState({
    name: '',
    description: '',
    area: '',
    stage: '',
    priority: '',
    frequency: '',
    volume_month: '',
    financial_impact: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedProject && isEditMode) {
      setEditProject({
        name: selectedProject.name,
        description: selectedProject.description || '',
        client_name: selectedProject.client_name || '',
        start_date: selectedProject.start_date || '',
        end_date: selectedProject.end_date || '',
        status: selectedProject.status
      });
    }
  }, [selectedProject, isEditMode]);

  useEffect(() => {
    if (selectedProject) {
      if (activeTab === 'backlog') {
        fetchBacklogTasks();
      } else if (activeTab === 'processes') {
        fetchProcesses();
      }
    }
  }, [selectedProject, activeTab]);

  useEffect(() => {
    if (selectedProcess) {
      setEditProcess({
        name: selectedProcess.name,
        description: selectedProcess.description || '',
        area: selectedProcess.area || '',
        stage: selectedProcess.stage,
        priority: selectedProcess.priority || 'medium',
        frequency: selectedProcess.frequency || '',
        volume_month: selectedProcess.volume_month?.toString() || '',
        financial_impact: selectedProcess.financial_impact || ''
      });
    }
  }, [selectedProcess]);

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

  const fetchTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchBacklogTasks = async () => {
    setLoadingBacklog(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, cluster, estimated_hours, assigned_to')
        .is('sprint_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBacklogTasks(data || []);
    } catch (error) {
      console.error('Error fetching backlog tasks:', error);
    } finally {
      setLoadingBacklog(false);
    }
  };

  const fetchProcesses = async () => {
    if (!selectedProject) return;
    setLoadingProcesses(true);
    try {
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProcesses(data || []);
    } catch (error) {
      console.error('Error fetching processes:', error);
    } finally {
      setLoadingProcesses(false);
    }
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return null;
    const member = teamMembers.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}`.trim() : null;
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

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editProject.name,
          description: editProject.description || null,
          client_name: editProject.client_name || null,
          start_date: editProject.start_date || null,
          end_date: editProject.end_date || null,
          status: editProject.status
        })
        .eq('id', selectedProject.id);

      if (error) throw error;

      toast({
        title: "Projeto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      setSelectedProject(null);
      setIsEditMode(false);
      fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o projeto.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', selectedProject.id);

      if (error) throw error;

      toast({
        title: "Projeto excluído!",
        description: "O projeto foi removido com sucesso.",
      });

      setSelectedProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o projeto.",
        variant: "destructive"
      });
    }
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const { error } = await supabase.from('processes').insert({
        name: newProcess.name,
        description: newProcess.description || null,
        area: newProcess.area || null,
        stage: newProcess.stage,
        priority: newProcess.priority || null,
        frequency: newProcess.frequency || null,
        volume_month: newProcess.volume_month ? Number(newProcess.volume_month) : null,
        financial_impact: newProcess.financial_impact || null,
        project_id: selectedProject.id,
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Processo criado!",
        description: "O novo processo foi adicionado ao projeto.",
      });

      setIsProcessDialogOpen(false);
      setNewProcess({ name: '', description: '', area: '', stage: 'discovery', priority: 'medium', frequency: '', volume_month: '', financial_impact: '' });
      fetchProcesses();
    } catch (error) {
      console.error('Error creating process:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o processo.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProcess = async () => {
    if (!selectedProcess) return;

    try {
      const { error } = await supabase
        .from('processes')
        .update({
          name: editProcess.name,
          description: editProcess.description || null,
          area: editProcess.area || null,
          stage: editProcess.stage,
          priority: editProcess.priority || null,
          frequency: editProcess.frequency || null,
          volume_month: editProcess.volume_month ? Number(editProcess.volume_month) : null,
          financial_impact: editProcess.financial_impact || null
        })
        .eq('id', selectedProcess.id);

      if (error) throw error;

      toast({
        title: "Processo atualizado!",
        description: "As alterações foram salvas.",
      });

      setSelectedProcess(null);
      fetchProcesses();
    } catch (error) {
      console.error('Error updating process:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o processo.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProcess = async () => {
    if (!selectedProcess) return;

    try {
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', selectedProcess.id);

      if (error) throw error;

      toast({
        title: "Processo excluído!",
        description: "O processo foi removido.",
      });

      setSelectedProcess(null);
      fetchProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o processo.",
        variant: "destructive"
      });
    }
  };

  const advanceProcessStage = async (process: Process) => {
    const currentIndex = PROCESS_STAGES.findIndex(s => s.value === process.stage);
    if (currentIndex < PROCESS_STAGES.length - 1) {
      const nextStage = PROCESS_STAGES[currentIndex + 1].value;
      try {
        await supabase
          .from('processes')
          .update({ stage: nextStage })
          .eq('id', process.id);
        
        fetchProcesses();
        toast({
          title: "Estágio avançado!",
          description: `Processo movido para ${PROCESS_STAGES[currentIndex + 1].label}.`,
        });
      } catch (error) {
        console.error('Error advancing process:', error);
      }
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
    switch (priority?.toLowerCase()) {
      case 'crítica':
      case 'urgent':
      case 'high':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Alta</Badge>;
      case 'alta':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Alta</Badge>;
      case 'média':
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Média</Badge>;
      case 'baixa':
      case 'low':
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

  const getClusterBadge = (cluster: string) => {
    const config: Record<string, { label: string; className: string }> = {
      database: { label: 'Database', className: 'bg-purple-100 text-purple-700' },
      frontend: { label: 'Frontend', className: 'bg-blue-100 text-blue-700' },
      management: { label: 'Gestão', className: 'bg-teal-100 text-teal-700' }
    };
    const { label, className } = config[cluster] || { label: cluster, className: 'bg-gray-100 text-gray-700' };
    return <Badge className={className}>{label}</Badge>;
  };

  const getStageBadge = (stage: string) => {
    const stageConfig = PROCESS_STAGES.find(s => s.value === stage);
    if (!stageConfig) return <Badge variant="outline">{stage}</Badge>;
    return <Badge className={stageConfig.color}>{stageConfig.label}</Badge>;
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
                      onClick={() => { setSelectedProject(project); setIsEditMode(false); setActiveTab('info'); }}
                    >
                      <TableCell className="font-medium text-gray-900">{project.name}</TableCell>
                      <TableCell>{getAreaBadge(extractArea(project.description))}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>{getPriorityBadge(extractPriority(project.description))}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{extractPhase(project.description)}</TableCell>
                      <TableCell className="text-gray-600">{project.client_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedProject(project); setIsEditMode(true); setActiveTab('info'); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedProject(project); setIsEditMode(false); setActiveTab('info'); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
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
                  onClick={() => { setSelectedProject(project); setIsEditMode(false); setActiveTab('info'); }}
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

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500"
                        onClick={(e) => { e.stopPropagation(); setSelectedProject(project); setIsEditMode(true); setActiveTab('info'); }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
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

      {/* Project Details/Edit Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => { setSelectedProject(null); setIsEditMode(false); setActiveTab('info'); }}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900 flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-primary" />
                  {isEditMode ? 'Editar Projeto' : selectedProject.name}
                </DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="processes" className="flex items-center gap-2">
                    <Workflow className="h-4 w-4" />
                    Processos ({processes.length})
                  </TabsTrigger>
                  <TabsTrigger value="backlog" className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Backlog ({backlogTasks.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                  {isEditMode ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700">Nome do Projeto *</Label>
                        <Input
                          value={editProject.name}
                          onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700">Descrição</Label>
                        <Textarea
                          value={editProject.description}
                          onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                          className="bg-white border-gray-300 text-gray-900"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700">Cliente</Label>
                        <Input
                          value={editProject.client_name}
                          onChange={(e) => setEditProject({ ...editProject, client_name: e.target.value })}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700">Data Início</Label>
                          <Input
                            type="date"
                            value={editProject.start_date}
                            onChange={(e) => setEditProject({ ...editProject, start_date: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700">Data Fim</Label>
                          <Input
                            type="date"
                            value={editProject.end_date}
                            onChange={(e) => setEditProject({ ...editProject, end_date: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700">Status</Label>
                        <Select value={editProject.status} onValueChange={(value) => setEditProject({ ...editProject, status: value })}>
                          <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                            <SelectItem value="blocked">Bloqueado</SelectItem>
                            <SelectItem value="archived">Arquivado</SelectItem>
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
                              <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O projeto "{selectedProject.name}" será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setIsEditMode(false)}>
                            Cancelar
                          </Button>
                          <Button className="bg-primary hover:bg-primary/90" onClick={handleUpdateProject}>
                            Salvar Alterações
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-primary text-primary hover:bg-primary/10"
                          onClick={() => setIsEditMode(true)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
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
                  )}
                </TabsContent>

                <TabsContent value="processes">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Processos da empresa vinculados a este projeto
                      </p>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => setIsProcessDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Novo Processo
                      </Button>
                    </div>

                    {/* Stages legend */}
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                      {PROCESS_STAGES.map((stage, index) => (
                        <div key={stage.value} className="flex items-center gap-1">
                          <Badge className={stage.color}>{stage.label}</Badge>
                          {index < PROCESS_STAGES.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      ))}
                    </div>

                    {loadingProcesses ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : processes.length > 0 ? (
                      <div className="space-y-2">
                        {processes.map((process) => (
                          <Card key={process.id} className="bg-gray-50 border-gray-200">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900">{process.name}</h4>
                                    {getStageBadge(process.stage)}
                                  </div>
                                  {process.description && (
                                    <p className="text-sm text-gray-500 truncate mt-1">{process.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    {process.area && <span>Área: {process.area}</span>}
                                    {process.frequency && <span>Freq: {process.frequency}</span>}
                                    {process.volume_month && <span>Vol: {process.volume_month}/mês</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {process.priority && getPriorityBadge(process.priority)}
                                  {process.stage !== 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-primary hover:text-primary"
                                      onClick={() => advanceProcessStage(process)}
                                      title="Avançar estágio"
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-500"
                                    onClick={() => setSelectedProcess(process)}
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
                      <div className="text-center py-8">
                        <Workflow className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-gray-900 font-medium mb-1">Nenhum processo</h4>
                        <p className="text-sm text-gray-500">
                          Adicione processos da empresa para acompanhar os estágios
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="backlog">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Tarefas sem sprint vinculada
                      </p>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => { setSelectedProject(null); navigate('/equipe/tarefas/nova'); }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Tarefa
                      </Button>
                    </div>

                    {loadingBacklog ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : backlogTasks.length > 0 ? (
                      <div className="space-y-2">
                        {backlogTasks.map((task) => (
                          <Card key={task.id} className="bg-gray-50 border-gray-200">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                                  {task.description && (
                                    <p className="text-sm text-gray-500 truncate">{task.description}</p>
                                  )}
                                  {task.assigned_to && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                      <User className="h-3 w-3" />
                                      {getMemberName(task.assigned_to)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {getPriorityBadge(task.priority)}
                                  {getClusterBadge(task.cluster)}
                                  {task.estimated_hours && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {task.estimated_hours}h
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ListTodo className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-gray-900 font-medium mb-1">Backlog vazio</h4>
                        <p className="text-sm text-gray-500">
                          Nenhuma tarefa sem sprint vinculada
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Process Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Novo Processo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProcess} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Nome do Processo *</Label>
              <Input
                value={newProcess.name}
                onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="Ex: Emissão de Notas Fiscais"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Descrição</Label>
              <Textarea
                value={newProcess.description}
                onChange={(e) => setNewProcess({ ...newProcess, description: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="Descreva o processo..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Área</Label>
                <Input
                  value={newProcess.area}
                  onChange={(e) => setNewProcess({ ...newProcess, area: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Fiscal"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Estágio</Label>
                <Select value={newProcess.stage} onValueChange={(value) => setNewProcess({ ...newProcess, stage: value })}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {PROCESS_STAGES.map(stage => (
                      <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Prioridade</Label>
                <Select value={newProcess.priority} onValueChange={(value) => setNewProcess({ ...newProcess, priority: value })}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Frequência</Label>
                <Input
                  value={newProcess.frequency}
                  onChange={(e) => setNewProcess({ ...newProcess, frequency: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Diária"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Volume/Mês</Label>
                <Input
                  type="number"
                  value={newProcess.volume_month}
                  onChange={(e) => setNewProcess({ ...newProcess, volume_month: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: 500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Impacto Financeiro</Label>
                <Input
                  value={newProcess.financial_impact}
                  onChange={(e) => setNewProcess({ ...newProcess, financial_impact: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Alto"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Criar Processo
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Process Dialog */}
      <Dialog open={!!selectedProcess} onOpenChange={() => setSelectedProcess(null)}>
        <DialogContent className="bg-white border-gray-200">
          {selectedProcess && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900">Editar Processo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Nome do Processo *</Label>
                  <Input
                    value={editProcess.name}
                    onChange={(e) => setEditProcess({ ...editProcess, name: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Descrição</Label>
                  <Textarea
                    value={editProcess.description}
                    onChange={(e) => setEditProcess({ ...editProcess, description: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Área</Label>
                    <Input
                      value={editProcess.area}
                      onChange={(e) => setEditProcess({ ...editProcess, area: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Estágio</Label>
                    <Select value={editProcess.stage} onValueChange={(value) => setEditProcess({ ...editProcess, stage: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {PROCESS_STAGES.map(stage => (
                          <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Prioridade</Label>
                    <Select value={editProcess.priority} onValueChange={(value) => setEditProcess({ ...editProcess, priority: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Frequência</Label>
                    <Input
                      value={editProcess.frequency}
                      onChange={(e) => setEditProcess({ ...editProcess, frequency: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Volume/Mês</Label>
                    <Input
                      type="number"
                      value={editProcess.volume_month}
                      onChange={(e) => setEditProcess({ ...editProcess, volume_month: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Impacto Financeiro</Label>
                    <Input
                      value={editProcess.financial_impact}
                      onChange={(e) => setEditProcess({ ...editProcess, financial_impact: e.target.value })}
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
                        <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O processo "{selectedProcess.name}" será permanentemente removido.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProcess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedProcess(null)}>
                      Cancelar
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90" onClick={handleUpdateProcess}>
                      Salvar Alterações
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

export default EquipeProjetos;