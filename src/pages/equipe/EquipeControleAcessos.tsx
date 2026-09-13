import { useState } from 'react';
import { AcessosLayout } from '@/components/acessos/AcessosLayout';
import { SECAO_INICIAL, type IdDeSecaoDeAcessos } from '@/lib/secoesDeAcessos';
import EstruturaManager from '@/components/equipe/estrutura/EstruturaManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Users,
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  Pencil,
  Building2,
  FolderKanban,
  Workflow,
  LayoutDashboard,
  Network,
  Wallet,
  Bot,
} from 'lucide-react';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';
import CadastroCategorias from '@/components/equipe/CadastroCategorias';
import CentroCustoTab from '@/components/equipe/CentroCustoTab';
import { PagesTab } from '@/components/acessos/PagesTab';
import { UsersTab } from '@/components/acessos/UsersTab';
import { UsersRolesView } from '@/components/acessos/UsersRolesView';
import DashboardsTab from '@/components/acessos/DashboardsTab';
import { AccessStatsCards } from '@/components/acessos/AccessStatsCards';
import { PontoDaArea } from '@/components/acessos/PontoDaArea';
import { AgenteTab } from '@/components/acessos/AgenteTab';
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
  const { refetch: refetchCadastros } = useControleAcessosCadastros();
  const {
    createCatalogClient,
    updateCatalogClient,
    toggleCatalogClient,
    deleteCatalogClient,
  } = useControleAcessosCatalogMutations();

  // Cadastros states
  // A secao aberta e estado, nao rota: sao sete secoes de uma tela so, e cada
  // uma como rota custaria uma linha em `protectedPages.ts` e um recorte de
  // permissao que ninguem pediu. A barra (`AcessosLayout`) le e escreve daqui.
  const [secao, setSecao] = useState<IdDeSecaoDeAcessos>(SECAO_INICIAL);
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

  /**
   * Troca a secao aberta.
   *
   * O `if` era o `onClick` da aba "Cadastros Estrutura": ela carrega sob
   * demanda, na primeira visita. Com a fila de abas fora, o efeito colateral
   * viria junto se ninguem o trouxesse — e a secao abriria vazia.
   */
  const abrirSecao = (proxima: IdDeSecaoDeAcessos) => {
    if (proxima === 'cadastros' && cadastroAreas.length === 0) fetchCadastros();
    setSecao(proxima);
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
    if (!confirm(`Tem certeza que deseja excluir"${area.name}"?`)) return;
    try {
      await deleteCatalogClient(area.id);
      toast.success('Área excluída');
      fetchCadastros();
    } catch (error: unknown) {
      if (getErrorCode(error) === '23503') toast.error('Não é possível excluir: existem projetos ou processos vinculados');
      else toast.error(getErrorMessage(error) || 'Erro ao excluir');
    }
  };

  // A barra desta tela são as seções que eram abas: ver `AcessosLayout`.
  // O título da página passa a ser o da seção aberta.
  return (
    <AcessosLayout secao={secao} onSecaoChange={abrirSecao}>

          <div className="space-y-6">
            {/* Stats Cards (extraído em componente) */}
            <AccessStatsCards />

            {/* Tabs */}
            {/* Sem `TabsList`: quem troca de secao e a barra. */}
            <Tabs value={secao} onValueChange={(v) => abrirSecao(v as IdDeSecaoDeAcessos)} className="space-y-4">

              {/* Pages Tab (extraído em componente) */}
              <TabsContent value="pages" className="space-y-4">
                <PagesTab />
              </TabsContent>

              {/* Users Tab (extraído em componente) */}
              <TabsContent value="users" className="space-y-4">
                <UsersTab />
              </TabsContent>

              {/* Cadastros Estrutura Tab — dona da estrutura organizacional:
                  clusters/empresas, áreas, equipes, membros e centros de custo.
                  Os dois cadastros são irmãos em sub-abas, nunca empilhados. */}
              <TabsContent value="cadastros" className="space-y-4">
                <Tabs defaultValue="organizacao" className="space-y-4">
                  <TabsList className="bg-foreground/[0.05] border border-border">
                    <TabsTrigger
                      value="organizacao"
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                      <Network className="h-4 w-4 mr-2" />
                      Estrutura
                    </TabsTrigger>
                    <TabsTrigger
                      value="centros_custo"
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Centros de Custo
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="organizacao">
                    <EstruturaManager />
                  </TabsContent>

                  <TabsContent value="centros_custo">
                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-foreground">Centros de Custo</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Usados pelos clusters e pelas áreas — cada área pode ter o seu.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <CentroCustoTab />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Cadastros Clientes Tab */}
              {/* A matriz das 7 permissoes e a legenda do que cada papel abre.
                  Ela morava em `/gestao/acessos`, que nenhum menu linkava: a
                  tela existia, funcionava, e so abria digitando a URL. */}
              <TabsContent value="papeis" className="space-y-4">
                <UsersRolesView variant="full" />
              </TabsContent>

              <TabsContent value="cadastros_clientes" className="space-y-4">
                <GestaoClientesContent todosOsClusters />
              </TabsContent>

              {/* Cadastro Categorias Tab */}
              <TabsContent value="cadastro_categorias" className="space-y-4">
                <CadastroCategorias />
              </TabsContent>

              {/* Dashboards Tab (cadastro) */}
              <TabsContent value="dashboards" className="space-y-4">
                <DashboardsTab />
              </TabsContent>

              {/* Agente Tab — cockpit do Agente PSA: configuracao, prompt,
                  nivel de acesso, o que ele processa por resposta, volume de
                  insights e o historico de aprendizado. */}
              <TabsContent value="agente" className="space-y-4">
                <AgenteTab />
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
                        <PontoDaArea area={ea} />
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
            <Button onClick={handleSaveCadastro} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingArea ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
    </AcessosLayout>
  );
};

export default EquipeControleAcessos;
