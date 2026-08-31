import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDomainSprintMutations,
  useDomainSprints,
  type Sprint,
} from '@/hooks/useDomainSprints';
import { Button } from '@/components/ui/button';
 import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
 import { Plus, Calendar, Pencil, Trash2 } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';

const EquipeSprints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project');
  
  const { data, isLoading: loading } = useDomainSprints(projectFilter);
  const { createSprint, updateSprint, deleteSprint, updateSprintStatus: updateSprintStatusMutation } =
    useDomainSprintMutations();
  const sprints = data?.sprints ?? [];
  const projects = data?.projects ?? [];
  const clusters = data?.clusters ?? [];
  const resumoPorSprint = data?.resumoPorSprint ?? {};
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    cluster_id: '',
    project_id: projectFilter || ''
  });
  const [editSprint, setEditSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    cluster_id: '',
    project_id: '',
    status: ''
  });

  useEffect(() => {
    if (selectedSprint && isEditMode) {
      setEditSprint({
        name: selectedSprint.name,
        goal: selectedSprint.goal || '',
        start_date: selectedSprint.start_date,
        end_date: selectedSprint.end_date,
        cluster_id: projects.find((p) => p.id === selectedSprint.project_id)?.cluster_id || '',
        project_id: selectedSprint.project_id || '',
        status: selectedSprint.status
      });
    }
  }, [selectedSprint, isEditMode]);

  // Helper para parse correto de datas (evita problema de timezone UTC)
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);
    try {
      await createSprint.mutateAsync({
        name: newSprint.name,
        goal: newSprint.goal || null,
        start_date: newSprint.start_date,
        end_date: newSprint.end_date,
        project_id: newSprint.project_id || null,
        status: 'active',
        created_by: user?.id
      });

      toast({
        title: "Sprint criada!",
        description: "A nova sprint foi criada com sucesso.",
      });

      setIsDialogOpen(false);
      setNewSprint({ name: '', goal: '', start_date: '', end_date: '', cluster_id: '', project_id: projectFilter || '' });
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
      await updateSprint.mutateAsync({
        id: selectedSprint.id,
        name: editSprint.name,
        goal: editSprint.goal || null,
        start_date: editSprint.start_date,
        end_date: editSprint.end_date,
        project_id: editSprint.project_id || null,
        status: editSprint.status
      });

      toast({
        title: "Sprint atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      setSelectedSprint(null);
      setIsEditMode(false);
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
      await deleteSprint.mutateAsync(selectedSprint.id);

      toast({
        title: "Sprint excluída!",
        description: "A sprint foi removida com sucesso.",
      });

      setSelectedSprint(null);
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
      await updateSprintStatusMutation.mutateAsync({ sprintId, status });
      toast({
        title: "Sprint atualizada!",
        description: `Status alterado para ${status === 'active' ? 'ativa' : 'concluída'}.`,
      });
    } catch (error) {
      console.error('Error updating sprint:', error);
    }
  };

  const toggleSprintExpanded = (sprintId: string) => {
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
         return <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium">Ativa</Badge>;
      case 'completed':
         return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs font-medium">Concluída</Badge>;
      case 'planned':
         return <Badge className="bg-muted text-gray-700 border-0 text-xs font-medium">Planejada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name;
  };

  const getSprintTotalHours = (sprintId: string) => resumoPorSprint[sprintId]?.horasAlocadas ?? 0;

  const getSprintClusterName = (sprint: { project_id: string | null }) => {
    const project = sprint.project_id ? projects.find((p) => p.id === sprint.project_id) : undefined;
    const cluster = project?.cluster_id
      ? clusters.find((c) => c.id === project.cluster_id)
      : undefined;
    return cluster?.name || 'Geral / sem cluster';
  };

  // Opções de projeto agrupadas por cluster no dropdown (cabeçalho = nome do cluster),
  // pra saber de cara qual projeto é de qual cluster.
  const renderProjectOptions = (list: typeof projects) => {
    const groups: Record<string, typeof projects> = {};
    list.forEach((p) => {
      const key =
        (p.cluster_id && clusters.find((c) => c.id === p.cluster_id)?.name) || 'Sem cluster';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([clusterName, projs]) => (
        <SelectGroup key={clusterName}>
          <SelectLabel>{clusterName}</SelectLabel>
          {projs.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectGroup>
      ));
  };

  // Agrupa as sprints por cluster (via projeto), ativas/planejadas antes das concluídas —
  // assim as sprints de Tax, OSG etc. ficam separadas.
  const statusRank: Record<string, number> = { active: 0, planned: 1, completed: 2 };
  const groupedSprints = (() => {
    const groups: Record<string, typeof sprints> = {};
    sprints.forEach((sprint) => {
      const key = getSprintClusterName(sprint);
      if (!groups[key]) groups[key] = [];
      groups[key].push(sprint);
    });
    Object.values(groups).forEach((list) =>
      list.sort(
        (a, b) =>
          (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) || a.name.localeCompare(b.name),
      ),
    );
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  })();

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
          <DialogContent className="border-border">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Criar Nova Sprint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cluster" className="text-gray-700">Cluster</Label>
                <Select
                  value={newSprint.cluster_id || 'none'}
                  onValueChange={(value) => setNewSprint({
                    ...newSprint,
                    cluster_id: value === 'none' ? '' : value,
                    project_id: '',
                  })}
                >
                  <SelectTrigger className="text-gray-900">
                    <SelectValue placeholder="Selecione um cluster (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="border-border">
                    <SelectItem value="none">Todos</SelectItem>
                    {clusters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project" className="text-gray-700">Projeto</Label>
                <Select 
                  value={newSprint.project_id} 
                  onValueChange={(value) => setNewSprint({ ...newSprint, project_id: value })}
                >
                  <SelectTrigger className="text-gray-900">
                    <SelectValue placeholder="Selecione um projeto (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="border-border">
                    {renderProjectOptions(
                      projects.filter(
                        (p) => !newSprint.cluster_id || p.cluster_id === newSprint.cluster_id,
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Nome da Sprint <RequiredMark /></Label>
                <Input
                  id="name"
                  value={newSprint.name}
                  onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                  className="text-gray-900"
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
                  className="text-gray-900"
                  placeholder="Descreva o objetivo principal desta sprint"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-gray-700">Data Início <RequiredMark /></Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newSprint.start_date}
                    onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                    className="text-gray-900"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-gray-700">Data Fim <RequiredMark /></Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newSprint.end_date}
                    onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                    className="text-gray-900"
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
      {/* Lista de Sprints */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : sprints.length > 0 ? (
        <div className="space-y-6">
          {groupedSprints.map(([clusterName, clusterSprints]) => (
          <div key={clusterName} className="space-y-3">
            <div className="flex items-center gap-2 pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{clusterName}</h2>
              <span className="text-xs text-gray-400">· {clusterSprints.length}</span>
              <div className="flex-1 border-t border-border" />
            </div>
          {clusterSprints.map((sprint) => {
            const totalHours = getSprintTotalHours(sprint.id);
             const sprintImpact = resumoPorSprint[sprint.id];
            
            return (
               <Card key={sprint.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                 <CardContent className="p-5">
                   <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-3 min-w-0">
                       <h3 className="font-semibold text-gray-900 text-base truncate">{sprint.name}</h3>
                      {getStatusBadge(sprint.status)}
                      {sprint.project_id && (
                         <Badge variant="secondary" className="text-xs font-normal">{getProjectName(sprint.project_id)}</Badge>
                      )}
                    </div>
                     <div className="flex items-center gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => { setSelectedSprint(sprint); setIsEditMode(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                       <Button variant="outline" size="sm" onClick={() => navigate(`/equipe/sprints/${sprint.id}`)}>Ver Detalhes</Button>
                    </div>
                  </div>
                   {sprint.goal && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sprint.goal}</p>}
                   <div className="flex items-center gap-4 text-sm text-gray-500">
                     <span>{parseDate(sprint.start_date).toLocaleDateString('pt-BR')} - {parseDate(sprint.end_date).toLocaleDateString('pt-BR')}</span>
                     {totalHours > 0 && <><span className="text-gray-400">•</span><span>{totalHours.toFixed(0)}h alocadas</span></>}
                  </div>
                  {sprintImpact && sprintImpact.custoEconomizadoMensal > 0 && (
                     <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-sm">
                       <span className="text-green-600 font-medium">Impacto: R$ {sprintImpact.custoEconomizadoMensal.toLocaleString('pt-BR')}/mês</span>
                       <span className="text-blue-600">{sprintImpact.horasLiberadas.toFixed(0)}h liberadas</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
          ))}
        </div>
      ) : (
        <Card className="border-border">
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
        <DialogContent className="border-border">
          {selectedSprint && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900 flex items-center gap-2">
                  Editar Sprint
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Cluster</Label>
                  <Select
                    value={editSprint.cluster_id || 'none'}
                    onValueChange={(value) =>
                      setEditSprint({
                        ...editSprint,
                        cluster_id: value === 'none' ? '' : value,
                        project_id: '',
                      })
                    }
                  >
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Selecione um cluster" />
                    </SelectTrigger>
                    <SelectContent className="border-border">
                      <SelectItem value="none">Todos</SelectItem>
                      {clusters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Projeto</Label>
                  <Select
                    value={editSprint.project_id}
                    onValueChange={(value) => setEditSprint({ ...editSprint, project_id: value })}
                  >
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Selecione um projeto (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="border-border">
                      {renderProjectOptions(
                        projects.filter(
                          (p) => !editSprint.cluster_id || p.cluster_id === editSprint.cluster_id,
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Nome da Sprint *</Label>
                  <Input
                    value={editSprint.name}
                    onChange={(e) => setEditSprint({ ...editSprint, name: e.target.value })}
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Objetivo</Label>
                  <Textarea
                    value={editSprint.goal}
                    onChange={(e) => setEditSprint({ ...editSprint, goal: e.target.value })}
                    className="text-gray-900"
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
                      className="text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Data Fim *</Label>
                    <Input
                      type="date"
                      value={editSprint.end_date}
                      onChange={(e) => setEditSprint({ ...editSprint, end_date: e.target.value })}
                      className="text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Status</Label>
                  <Select value={editSprint.status} onValueChange={(value) => setEditSprint({ ...editSprint, status: value })}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border">
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="planned">Planejada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
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
