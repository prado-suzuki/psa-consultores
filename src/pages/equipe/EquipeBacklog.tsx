import { useState, useEffect } from "react";
import { EquipeLayout } from "@/components/equipe/EquipeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, ArrowRight, Layers } from "lucide-react";
import { format } from "date-fns";

interface BacklogItem {
  id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  estimated_hours: number | null;
  suggested_by: string | null;
  status: string;
  moved_to_deliverable_id: string | null;
  created_at: string;
}

interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

export default function EquipeBacklog() {
  const { toast } = useToast();
  
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de criação/edição
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimated_hours: ''
  });
  const [saving, setSaving] = useState(false);

  // Modal de mover para sprint
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<BacklogItem | null>(null);
  const [moveData, setMoveData] = useState({
    sprint_id: '',
    assigned_to: '',
    due_date: ''
  });
  const [moving, setMoving] = useState(false);

  // Filtro de prioridade
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch backlog items (apenas os que não foram movidos e não têm sprint)
      const { data: backlogData, error: backlogError } = await supabase
        .from("sprint_backlog_items")
        .select("*")
        .is("sprint_id", null)
        .neq("status", "moved_to_sprint")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      
      if (backlogError) throw backlogError;
      setBacklogItems(backlogData || []);

      // Fetch active sprints
      const { data: sprintsData } = await supabase
        .from("sprints")
        .select("*")
        .in("status", ["active", "planning"])
        .order("start_date", { ascending: true });
      setSprints(sprintsData || []);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");
      setProfiles(profilesData || []);
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openFormModal = (item?: BacklogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        priority: item.priority,
        estimated_hours: item.estimated_hours?.toString() || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        estimated_hours: ''
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
        sprint_id: null // Backlog global, sem sprint
      };

      if (editingItem) {
        const { error } = await supabase
          .from("sprint_backlog_items")
          .update(itemData)
          .eq("id", editingItem.id);
        if (error) throw error;
        
        setBacklogItems(prev => 
          prev.map(item => item.id === editingItem.id ? { ...item, ...itemData } : item)
        );
        toast({ title: "Item atualizado" });
      } else {
        const { data, error } = await supabase
          .from("sprint_backlog_items")
          .insert(itemData)
          .select()
          .single();
        if (error) throw error;
        
        setBacklogItems(prev => [data, ...prev]);
        toast({ title: "Item adicionado ao backlog" });
      }
      
      setFormModalOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("sprint_backlog_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      
      setBacklogItems(prev => prev.filter(item => item.id !== itemId));
      toast({ title: "Item removido do backlog" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const openMoveModal = (item: BacklogItem) => {
    setMovingItem(item);
    const firstSprint = sprints[0];
    setMoveData({
      sprint_id: firstSprint?.id || '',
      assigned_to: '',
      due_date: firstSprint?.end_date || ''
    });
    setMoveModalOpen(true);
  };

  const moveToSprint = async () => {
    if (!movingItem || !moveData.sprint_id) {
      toast({ title: "Selecione uma sprint", variant: "destructive" });
      return;
    }

    try {
      setMoving(true);

      // Criar entregável na sprint selecionada
      const deliverableData = {
        sprint_id: moveData.sprint_id,
        title: movingItem.title,
        description: movingItem.description,
        estimated_hours: movingItem.estimated_hours,
        assigned_to: moveData.assigned_to || null,
        due_date: moveData.due_date,
        start_date: sprints.find(s => s.id === moveData.sprint_id)?.start_date,
        status: 'pending'
      };

      const { data: newDeliverable, error: deliverableError } = await supabase
        .from("sprint_deliverables")
        .insert(deliverableData)
        .select()
        .single();

      if (deliverableError) throw deliverableError;

      // Atualizar status do item do backlog
      const { error: backlogError } = await supabase
        .from("sprint_backlog_items")
        .update({ 
          status: 'moved_to_sprint', 
          moved_to_deliverable_id: newDeliverable.id,
          sprint_id: moveData.sprint_id
        })
        .eq("id", movingItem.id);

      if (backlogError) throw backlogError;

      // Remover da lista local
      setBacklogItems(prev => prev.filter(item => item.id !== movingItem.id));
      setMoveModalOpen(false);
      setMovingItem(null);
      
      const sprintName = sprints.find(s => s.id === moveData.sprint_id)?.name || 'Sprint';
      toast({ title: `Item movido para ${sprintName}` });
    } catch (error: any) {
      toast({ title: "Erro ao mover item", description: error.message, variant: "destructive" });
    } finally {
      setMoving(false);
    }
  };

  const filteredItems = backlogItems.filter(item => {
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
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
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
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
              <Card key={item.id} className="bg-white border-gray-200 hover:shadow-sm transition-shadow">
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
                        disabled={sprints.length === 0}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover para Sprint</DialogTitle>
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
              <Select value={moveData.sprint_id} onValueChange={(v) => {
                const sprint = sprints.find(s => s.id === v);
                setMoveData({ 
                  ...moveData, 
                  sprint_id: v,
                  due_date: sprint?.end_date || ''
                });
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
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={moveData.assigned_to} onValueChange={(v) => setMoveData({ ...moveData, assigned_to: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não atribuído</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de Entrega</Label>
              <Input
                type="date"
                value={moveData.due_date}
                onChange={(e) => setMoveData({ ...moveData, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveModalOpen(false)}>Cancelar</Button>
            <Button onClick={moveToSprint} disabled={moving || !moveData.sprint_id}>
              {moving ? 'Movendo...' : 'Mover para Sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
}
