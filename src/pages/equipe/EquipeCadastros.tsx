import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import EquipeLayout from '@/components/equipe/EquipeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  FolderKanban, 
  Workflow,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface CatalogClient {
  id: string;
  name: string;
  responsible: string | null;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  clients: number;
  projects: number;
  processes: number;
}

const EquipeCadastros = () => {
  const [clients, setClients] = useState<CatalogClient[]>([]);
  const [stats, setStats] = useState<Stats>({ clients: 0, projects: 0, processes: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CatalogClient | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    responsible: '',
    description: '',
    color: '#3B82F6',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('catalog_clients')
        .select('*')
        .order('name');
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch stats
      const [projectsRes, processesRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('processes').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        clients: clientsData?.length || 0,
        projects: projectsRes.count || 0,
        processes: processesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setEditingClient(null);
    setFormData({ name: '', responsible: '', description: '', color: '#3B82F6' });
    setDialogOpen(true);
  };

  const openEditDialog = (client: CatalogClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      responsible: client.responsible || '',
      description: client.description || '',
      color: client.color || '#3B82F6',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('catalog_clients')
          .update({
            name: formData.name.trim(),
            responsible: formData.responsible.trim() || null,
            description: formData.description.trim() || null,
            color: formData.color,
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        toast.success('Cliente/Área atualizado');
      } else {
        const { error } = await supabase
          .from('catalog_clients')
          .insert({
            name: formData.name.trim(),
            responsible: formData.responsible.trim() || null,
            description: formData.description.trim() || null,
            color: formData.color,
          });

        if (error) throw error;
        toast.success('Cliente/Área criado');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving client:', error);
      if (error.code === '23505') {
        toast.error('Já existe um cliente/área com esse nome');
      } else {
        toast.error('Erro ao salvar');
      }
    }
  };

  const handleToggleActive = async (client: CatalogClient) => {
    try {
      const { error } = await supabase
        .from('catalog_clients')
        .update({ is_active: !client.is_active })
        .eq('id', client.id);

      if (error) throw error;
      toast.success(client.is_active ? 'Cliente/Área desativado' : 'Cliente/Área ativado');
      fetchData();
    } catch (error) {
      console.error('Error toggling client:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (client: CatalogClient) => {
    if (!confirm(`Tem certeza que deseja excluir "${client.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('catalog_clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;
      toast.success('Cliente/Área excluído');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      if (error.code === '23503') {
        toast.error('Não é possível excluir: existem projetos ou processos vinculados');
      } else {
        toast.error('Erro ao excluir');
      }
    }
  };

  const colorPresets = [
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#6366F1', // indigo
    '#14B8A6', // teal
  ];

  return (
    <EquipeLayout title="Cadastros" subtitle="Gerencie clientes, áreas e configurações do sistema">
      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Clientes/Áreas
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Cadastre os clientes internos (áreas/setores) que serão usados em projetos e processos.
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente/Área
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : clients.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum cliente/área cadastrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cor</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: client.color }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.responsible || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={client.is_active ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(client)}
                          >
                            {client.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(client)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(client)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Clientes/Áreas
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clients}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cadastrados no sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projetos
                </CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.projects}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de projetos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Processos
                </CardTitle>
                <Workflow className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.processes}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de processos
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clientes por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">
                    Ativos: {clients.filter(c => c.is_active).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm">
                    Inativos: {clients.filter(c => !c.is_active).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editar Cliente/Área' : 'Novo Cliente/Área'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Fiscal, Consultoria, Fixos..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Nome do responsável pela área"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-8 p-0 border-0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingClient ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeCadastros;
