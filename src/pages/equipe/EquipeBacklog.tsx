import { useState, useEffect } from "react";
import { EquipeLayout } from "@/components/equipe/EquipeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  useCreateDomainBacklogDeliverable,
  useCreateDomainBacklogItem,
  useDeleteDomainBacklogItem,
  useDomainBacklog,
  useMoveDomainBacklogItem,
  useUpdateDomainBacklogItem,
  type BacklogItem,
  type BacklogCluster,
  type Process,
  type Profile,
  type Project,
  type ProjectProcess,
  type Sprint,
} from "@/hooks/useDomainBacklog";
import { Plus, Edit2, Trash2, ArrowRight, Layers } from "lucide-react";
import { format } from "date-fns";
import { matchCluster, SEM_CLUSTER } from "@/lib/clusterFilter";

const UNASSIGNED = '__unassigned__';
const NONE = '__none__';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error);
};

export default function EquipeBacklog() {
  const { toast } = useToast();
  const backlogQuery = useDomainBacklog();
  const createBacklogItem = useCreateDomainBacklogItem();
  const updateBacklogItem = useUpdateDomainBacklogItem();
  const removeBacklogItem = useDeleteDomainBacklogItem();
  const createBacklogDeliverable = useCreateDomainBacklogDeliverable();
  const moveBacklogItem = useMoveDomainBacklogItem();

  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [projectProcesses, setProjectProcesses] = useState<ProjectProcess[]>([]);
  const [clusters, setClusters] = useState<BacklogCluster[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de criação/edição
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimated_hours: '',
    project_id: '',
    cluster_id: '',
  });
  const [saving, setSaving] = useState(false);

  // Modal de mover para sprint
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<BacklogItem | null>(null);
  const [moveData, setMoveData] = useState({
    sprint_id: '',
    assigned_to: '',
    start_date: '',
    due_date: '',
    project_id: '',
    process_id: '',
    task_code: '',
  });
  const [moving, setMoving] = useState(false);

  // Filtros de prioridade e projeto
  const [filterPriority, setFilterPriority] = usePersistedState<string>('rotina.backlog.prioridade', 'all');
  const [filterProject, setFilterProject] = usePersistedState<string>('rotina.backlog.projeto', 'all');
  // Chave global 'rotina.cluster' → o cluster escolhido segue nas outras telas.
  const [filterCluster, setFilterCluster] = usePersistedState<string>('rotina.cluster', '');

  useEffect(() => {
    if (!backlogQuery.data) return;

    setBacklogItems(backlogQuery.data.backlogItems);
    setSprints(backlogQuery.data.sprints);
    setProfiles(backlogQuery.data.profiles);
    setProjects(backlogQuery.data.projects);
    setProcesses(backlogQuery.data.processes);
    setProjectProcesses(backlogQuery.data.projectProcesses);
    setClusters(backlogQuery.data.clusters);
    setLoading(false);
  }, [backlogQuery.data]);

  useEffect(() => {
    if (!backlogQuery.error || backlogQuery.data) return;

    console.error("Error fetching data:", backlogQuery.error);
    toast({
      title: "Erro ao carregar dados",
      description: backlogQuery.error.message,
      variant: "destructive",
    });
    setLoading(false);
  }, [backlogQuery.data, backlogQuery.error, toast]);

  const openFormModal = (item?: BacklogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        priority: item.priority,
        estimated_hours: item.estimated_hours?.toString() || '',
        project_id: item.project_id || '',
        cluster_id: item.cluster_id || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        estimated_hours: '',
        project_id: '',
        cluster_id: '',
      });
    }
    setFormModalOpen(true);
  };

  const saveItem = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      
      const itemData = {
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        sprint_id: null, // Backlog global, sem sprint
        project_id: formData.project_id || null,
        cluster_id: formData.cluster_id || null,
      };

      if (editingItem) {
        await updateBacklogItem.mutateAsync({ itemId: editingItem.id, payload: itemData });

        setBacklogItems(prev =>
          prev.map(item => item.id === editingItem.id ? { ...item, ...itemData } : item)
        );
        toast({ title: "Item atualizado" });
      } else {
        const data = await createBacklogItem.mutateAsync(itemData);

        setBacklogItems(prev => [data, ...prev]);
        toast({ title: "Item adicionado ao backlog" });
      }
      
      setFormModalOpen(false);
      setEditingItem(null);
    } catch (error: unknown) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await removeBacklogItem.mutateAsync(itemId);
      
      setBacklogItems(prev => prev.filter(item => item.id !== itemId));
      toast({ title: "Item removido do backlog" });
    } catch (error: unknown) {
      toast({ title: "Erro ao excluir", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const openMoveModal = (item: BacklogItem) => {
    setMovingItem(item);
    // NÃO pré-seleciona sprint: força a pessoa a escolher explicitamente para qual
    // sprint o item vai (evita "mover sem querer" para a primeira da lista). As datas
    // são preenchidas automaticamente ao escolher a sprint (onValueChange abaixo).
    setMoveData({
      sprint_id: '',
      assigned_to: '',
      start_date: '',
      due_date: '',
      project_id: item.project_id || '',
      process_id: '',
      task_code: '',
    });
    setMoveModalOpen(true);
  };

  const moveToSprint = async () => {
    if (!movingItem || !moveData.sprint_id) {
      toast({ title: "Selecione uma sprint", variant: "destructive" });
      return;
    }

    if (!moveData.due_date) {
      toast({ title: "Data de entrega é obrigatória", variant: "destructive" });
      return;
    }

    try {
      setMoving(true);

      const selectedSprint = sprints.find(s => s.id === moveData.sprint_id);

      // Criar entregável na sprint selecionada (mesmos campos do form Nova Tarefa em sprint)
      const deliverableData = {
        sprint_id: moveData.sprint_id,
        title: movingItem.title,
        description: movingItem.description,
        estimated_hours: movingItem.estimated_hours,
        assigned_to: moveData.assigned_to || null,
        start_date: moveData.start_date || selectedSprint?.start_date || null,
        due_date: moveData.due_date,
        status: 'pending',
        project_id: moveData.project_id || null,
        process_id: moveData.process_id || null,
        task_code: moveData.task_code || null,
      };

      const newDeliverable = await createBacklogDeliverable.mutateAsync(deliverableData);

      // Atualizar status do item do backlog
      await moveBacklogItem.mutateAsync({
        itemId: movingItem.id,
        payload: {
          status: 'moved_to_sprint',
          moved_to_deliverable_id: newDeliverable.id,
          sprint_id: moveData.sprint_id
        },
      });

      // Remover da lista local
      setBacklogItems(prev => prev.filter(item => item.id !== movingItem.id));
      setMoveModalOpen(false);
      setMovingItem(null);
      
      const sprintName = sprints.find(s => s.id === moveData.sprint_id)?.name || 'Sprint';
      toast({ title: `Item movido para ${sprintName}` });
    } catch (error: unknown) {
      toast({ title: "Erro ao mover item", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setMoving(false);
    }
  };

  const filteredItems = backlogItems.filter(item => {
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    if (filterProject !== 'all' && item.project_id !== filterProject) return false;
    if (!matchCluster(filterCluster, item.cluster_id)) return false;
    return true;
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return "";
    const profile = profiles.find(p => p.id === userId);
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
  };

  if (loading) {
    return (
      <EquipeLayout title="Backlog">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </EquipeLayout>
    );
  }

  return (
    <EquipeLayout 
      title="Backlog" 
      subtitle="Repositório de atividades para distribuir nas sprints"
      headerActions={
        <Button onClick={() => openFormModal()}>
          <Plus className="h-4 w-4 mr-2" /> Novo Item
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filtros */}
        <div className="flex items-center gap-3">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterCluster === '' ? '__todos__' : filterCluster}
            onValueChange={(value) => setFilterCluster(value === '__todos__' ? '' : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os clusters</SelectItem>
              <SelectItem value={SEM_CLUSTER}>— Sem cluster</SelectItem>
              {clusters.map((cluster) => (
                <SelectItem key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground ml-auto">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'} no backlog
          </span>
        </div>

        {/* Lista de itens */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Backlog vazio</h3>
              <p className="text-muted-foreground mb-4">
                Adicione atividades aqui para planejar e distribuir nas sprints.
              </p>
              <Button onClick={() => openFormModal()}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Card key={item.id} className="border-gray-200 hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Badge 
                        variant="outline" 
                        className={
                          item.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                          item.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }
                      >
                        {item.priority === 'high' ? 'Alta' : 
                         item.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          {item.estimated_hours && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              {item.estimated_hours}h estimadas
                            </span>
                          )}
                          {item.cluster_id && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                              {clusters.find(c => c.id === item.cluster_id)?.name || 'Cluster'}
                            </span>
                          )}
                          {item.project_id && (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {projects.find(p => p.id === item.project_id)?.name || 'Projeto'}
                            </span>
                          )}
                          <span>Criado em {format(new Date(item.created_at), "dd/MM/yyyy")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openMoveModal(item)}
                        className="text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" /> Mover para Sprint
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => openFormModal(item)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir item do backlog?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O item será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteItem(item.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item do Backlog'}</DialogTitle>
            <DialogDescription className="sr-only">Formulário de item do backlog</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome da atividade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre a atividade"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Horas Estimadas</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  placeholder="Ex: 4"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster">Cluster</Label>
              <Select
                value={formData.cluster_id || NONE}
                onValueChange={(v) => setFormData({
                  ...formData,
                  cluster_id: v === NONE ? '' : v,
                  // Limpa projeto se o cluster do projeto atual não bate mais.
                  project_id: (() => {
                    if (!formData.project_id) return '';
                    const proj = projects.find(p => p.id === formData.project_id);
                    if (v === NONE) return formData.project_id;
                    return proj && proj.cluster_id === v ? formData.project_id : '';
                  })(),
                })}
              >
                <SelectTrigger id="cluster">
                  <SelectValue placeholder="Selecionar cluster (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {clusters.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Projeto</Label>
              <Select
                value={formData.project_id || NONE}
                onValueChange={(v) => setFormData({ ...formData, project_id: v === NONE ? '' : v })}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Selecionar projeto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {projects
                    .filter(p => !formData.cluster_id || p.cluster_id === formData.cluster_id)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem} disabled={saving}>
              {saving ? 'Salvando...' : editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Mover para Sprint */}
      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mover para Sprint</DialogTitle>
            <DialogDescription className="sr-only">Mover item do backlog para uma sprint</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {movingItem && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{movingItem.title}</p>
                {movingItem.estimated_hours && (
                  <p className="text-sm text-gray-500">{movingItem.estimated_hours}h estimadas</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Sprint de Destino *</Label>
              {sprints.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Nenhuma sprint ativa ou planejada. Crie ou ative uma sprint em <strong>Sprints</strong> antes de mover itens do backlog.
                </p>
              ) : (
                <Select value={moveData.sprint_id} onValueChange={(v) => {
                  const sprint = sprints.find(s => s.id === v);
                  setMoveData(prev => ({
                    ...prev,
                    sprint_id: v,
                    start_date: sprint?.start_date || '',
                    due_date: sprint?.end_date || '',
                  }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {sprints.map(sprint => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>ID / Ordem</Label>
              <Input
                value={moveData.task_code}
                onChange={(e) => setMoveData(prev => ({ ...prev, task_code: e.target.value }))}
                placeholder="Ex: 7.43"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={moveData.assigned_to || UNASSIGNED}
                  onValueChange={(v) => setMoveData(prev => ({ ...prev, assigned_to: v === UNASSIGNED ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Não atribuído</SelectItem>
                    {profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Horas Estimadas</Label>
                <Input
                  value={movingItem?.estimated_hours ? `${movingItem.estimated_hours}h` : '—'}
                  disabled
                  className="bg-muted text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={moveData.start_date}
                  onChange={(e) => setMoveData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Entrega *</Label>
                <Input
                  type="date"
                  value={moveData.due_date}
                  onChange={(e) => setMoveData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select
                  value={moveData.project_id || NONE}
                  onValueChange={(v) => setMoveData(prev => ({
                    ...prev,
                    project_id: v === NONE ? '' : v,
                    process_id: '', // reseta processo ao trocar de projeto
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Processo</Label>
                <Select
                  value={moveData.process_id || NONE}
                  onValueChange={(v) => setMoveData(prev => ({ ...prev, process_id: v === NONE ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar processo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {processes
                      .filter(proc => {
                        if (!moveData.project_id) return true;
                        return projectProcesses.some(
                          pp => pp.process_id === proc.id && pp.project_id === moveData.project_id
                        );
                      })
                      .map(proc => (
                        <SelectItem key={proc.id} value={proc.id}>
                          {proc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveModalOpen(false)}>Cancelar</Button>
            <Button onClick={moveToSprint} disabled={moving || !moveData.sprint_id || !moveData.due_date}>
              {moving ? 'Movendo...' : 'Mover para Sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
}
