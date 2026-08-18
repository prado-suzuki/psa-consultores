import { useState } from 'react';
import EstruturaManager from '@/components/equipe/estrutura/EstruturaManager';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Users,
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  LogOut,
  Repeat,
  Pencil,
  Building2,
  FolderKanban,
  Workflow,
  LayoutDashboard,
} from 'lucide-react';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';
import CadastroCategorias from '@/components/equipe/CadastroCategorias';
import { PagesTab } from '@/components/acessos/PagesTab';
import { UsersTab } from '@/components/acessos/UsersTab';
import DashboardsTab from '@/components/acessos/DashboardsTab';
import { AccessStatsCards } from '@/components/acessos/AccessStatsCards';
import {
  type ControleAcessosAreaInterna,
  type ControleAcessosCadastroStats,
  useControleAcessosCadastros,
  useControleAcessosCatalogMutations,
  useControleAcessosEstruturaAreas,
} from '@/hooks/useDomainControleAcessos';

// Area -> categories mapping agora vem de @/config/areaCategories (fonte única).

const getErrorCode = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { code } = error as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error !== 'object' || error === null) return undefined;
  const { message } = error as { message?: unknown };
  return typeof message === 'string' ? message : undefined;
};

const EquipeControleAcessos = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { refetch: refetchCadastros } = useControleAcessosCadastros();
  const {
    createCatalogClient,
    updateCatalogClient,
    toggleCatalogClient,
    deleteCatalogClient,
  } = useControleAcessosCatalogMutations();

  // Cadastros states
  const [cadastroAreas, setCadastroAreas] = useState<ControleAcessosAreaInterna[]>([]);
  const [cadastroStats, setCadastroStats] = useState<ControleAcessosCadastroStats>({ clients: 0, projects: 0, processes: 0 });
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroDialogOpen, setCadastroDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<ControleAcessosAreaInterna | null>(null);
  const [cadastroForm, setCadastroForm] = useState({
    name: '',
    responsible: '',
    description: '',
    color: '#3B82F6',
    estrutura_area_id: '' as string,
  });

  const colorPresets = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
  ];

  // Fetch estrutura_areas for mapping select (usado pelo dialog de cadastros)
  const { data: estruturaAreas = [] } = useControleAcessosEstruturaAreas();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para área de transferência');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Cadastros functions
  const fetchCadastros = async () => {
    try {
      setCadastroLoading(true);
      const { data } = await refetchCadastros({ throwOnError: true });
      setCadastroAreas(data?.areas ?? []);
      setCadastroStats(data?.stats ?? { clients: 0, projects: 0, processes: 0 });
    } catch (error) {
      console.error('Error fetching cadastros:', error);
      toast.error('Erro ao carregar cadastros');
    } finally {
      setCadastroLoading(false);
    }
  };

  const openCadastroCreate = () => {
    setEditingArea(null);
    setCadastroForm({ name: '', responsible: '', description: '', color: '#3B82F6', estrutura_area_id: '' });
    setCadastroDialogOpen(true);
  };

  const openCadastroEdit = (area: ControleAcessosAreaInterna) => {
    setEditingArea(area);
    setCadastroForm({
      name: area.name,
      responsible: area.responsible || '',
      description: area.description || '',
      color: area.color || '#3B82F6',
      estrutura_area_id: area.estrutura_area_id || '',
    });
    setCadastroDialogOpen(true);
  };

  const handleSaveCadastro = async () => {
    if (!cadastroForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    try {
      const payload = {
        name: cadastroForm.name.trim(),
        responsible: cadastroForm.responsible.trim() || null,
        description: cadastroForm.description.trim() || null,
        color: cadastroForm.color,
        estrutura_area_id: cadastroForm.estrutura_area_id || null,
      };
      if (editingArea) {
        await updateCatalogClient({ id: editingArea.id, payload });
        toast.success('Área atualizada');
      } else {
        await createCatalogClient(payload);
        toast.success('Área criada');
      }
      setCadastroDialogOpen(false);
      fetchCadastros();
    } catch (error: unknown) {
      if (getErrorCode(error) === '23505') toast.error('Já existe uma área com esse nome');
      else toast.error(getErrorMessage(error) || 'Erro ao salvar');
    }
  };

  const handleToggleCadastroActive = async (area: ControleAcessosAreaInterna) => {
    try {
      await toggleCatalogClient({ id: area.id, isActive: area.is_active });
      toast.success(area.is_active ? 'Área desativada' : 'Área ativada');
      fetchCadastros();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Erro ao alterar status');
    }
  };

  const handleDeleteCadastro = async (area: ControleAcessosAreaInterna) => {
    if (!confirm(`Tem certeza que deseja excluir "${area.name}"?`)) return;
    try {
      await deleteCatalogClient(area.id);
      toast.success('Área excluída');
      fetchCadastros();
    } catch (error: unknown) {
      if (getErrorCode(error) === '23503') toast.error('Não é possível excluir: existem projetos ou processos vinculados');
      else toast.error(getErrorMessage(error) || 'Erro ao excluir');
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-border/60 bg-card">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-foreground">Controle de Acessos</h1>
                <p className="text-xs text-muted-foreground">Gestão de usuários e liberação de acessos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/equipe/digital')}
                className="text-muted-foreground hover:text-primary hover:bg-muted"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Trocar área
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-primary hover:bg-muted"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Stats Cards (extraído em componente) */}
            <AccessStatsCards />

            {/* Tabs */}
            <Tabs defaultValue="pages" className="space-y-4">
              <TabsList className="bg-muted border border-border">
                <TabsTrigger 
                  value="pages" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Páginas
                </TabsTrigger>
                <TabsTrigger 
                  value="cadastros"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  onClick={() => { if (cadastroAreas.length === 0) fetchCadastros(); }}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Cadastros Estrutura
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Usuários Estrutura
                </TabsTrigger>
                <TabsTrigger 
                  value="cadastros_clientes" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Cadastros Clientes
                </TabsTrigger>
                <TabsTrigger
                  value="cadastro_categorias"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <FolderKanban className="h-4 w-4 mr-2" />
                  Cadastro Categorias
                </TabsTrigger>
                <TabsTrigger
                  value="dashboards"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboards
                </TabsTrigger>
              </TabsList>

              {/* Pages Tab (extraído em componente) */}
              <TabsContent value="pages" className="space-y-4">
                <PagesTab />
              </TabsContent>

              {/* Users Tab (extraído em componente) */}
              <TabsContent value="users" className="space-y-4">
                <UsersTab />
              </TabsContent>

              {/* Cadastros Estrutura Tab */}
              <TabsContent value="cadastros" className="space-y-4">
                <EstruturaManager />
              </TabsContent>

              {/* Cadastros Clientes Tab */}
              <TabsContent value="cadastros_clientes" className="space-y-4">
                <GestaoClientesContent />
              </TabsContent>

              {/* Cadastro Categorias Tab */}
              <TabsContent value="cadastro_categorias" className="space-y-4">
                <CadastroCategorias />
              </TabsContent>

              {/* Dashboards Tab (cadastro) */}
              <TabsContent value="dashboards" className="space-y-4">
                <DashboardsTab />
              </TabsContent>
            </Tabs>

      {/* Cadastro Dialog */}
      <Dialog open={cadastroDialogOpen} onOpenChange={setCadastroDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingArea ? 'Editar Área' : 'Nova Área'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cadastro-name">Nome da Área *</Label>
              <Input id="cadastro-name" value={cadastroForm.name} onChange={(e) => setCadastroForm({ ...cadastroForm, name: e.target.value })} placeholder="Ex: Fiscal, Consultoria, Digital..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadastro-responsible">Líder da Área</Label>
              <Input id="cadastro-responsible" value={cadastroForm.responsible} onChange={(e) => setCadastroForm({ ...cadastroForm, responsible: e.target.value })} placeholder="Ex: Ricardo, Felipe..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadastro-description">Descrição</Label>
              <Input id="cadastro-description" value={cadastroForm.description} onChange={(e) => setCadastroForm({ ...cadastroForm, description: e.target.value })} placeholder="Descrição opcional" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${cadastroForm.color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCadastroForm({ ...cadastroForm, color })}
                    />
                  ))}
                </div>
                <Input type="color" value={cadastroForm.color} onChange={(e) => setCadastroForm({ ...cadastroForm, color: e.target.value })} className="w-12 h-8 p-0 border-0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vincular à Estrutura Organizacional</Label>
              <Select
                value={cadastroForm.estrutura_area_id}
                onValueChange={(value) => setCadastroForm({ ...cadastroForm, estrutura_area_id: value === '_none' ? '' : value })}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Nenhuma (sem vínculo)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma (sem vínculo)</SelectItem>
                  {estruturaAreas.map((ea) => (
                    <SelectItem key={ea.id} value={ea.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ea.color || '#94a3b8' }} />
                        {ea.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Associa esta área legada à estrutura organizacional (cluster → área → equipe)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCadastroDialogOpen(false)} className="border-border text-muted-foreground">Cancelar</Button>
            <Button onClick={handleSaveCadastro} className="bg-primary hover:bg-primary/90 text-white">{editingArea ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </ScrollArea>

    </div>
  );
};

export default EquipeControleAcessos;
