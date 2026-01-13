import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  RefreshCw,
  Plus,
  Trash2,
  ArrowLeft,
  LogOut,
  Repeat,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
  Copy
} from 'lucide-react';
import logoPsa from '@/assets/logo-psa.png';

interface PagePermission {
  id: string;
  page_path: string;
  page_name: string;
  page_description: string | null;
  category: string;
  is_active: boolean;
  requires_admin: boolean;
  requires_team_member: boolean;
}

interface UserWithRoles {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
}

interface UserPageAccess {
  id: string;
  user_id: string;
  page_permission_id: string;
  granted_at: string;
}

const INITIAL_VISIBLE_PAGES = 5;

const EquipeControleAcessos = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // User creation states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    is_admin: false,
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Fetch page permissions
  const { data: pages, isLoading: loadingPages } = useQuery({
    queryKey: ['page-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_permissions')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as PagePermission[];
    },
  });

  // Fetch users with roles
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        roles: roles
          .filter(r => r.user_id === profile.id)
          .map(r => r.role)
      }));

      return usersWithRoles as UserWithRoles[];
    },
  });

  // Fetch user page access
  const { data: userAccess } = useQuery({
    queryKey: ['user-page-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_page_access')
        .select('*');
      
      if (error) throw error;
      return data as UserPageAccess[];
    },
  });

  // Toggle page active status
  const togglePageMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('page_permissions')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      toast.success('Permissão atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão');
    },
  });

  // Grant user access to page
  const grantAccessMutation = useMutation({
    mutationFn: async ({ userId, pageId }: { userId: string; pageId: string }) => {
      const { error } = await supabase
        .from('user_page_access')
        .insert({
          user_id: userId,
          page_permission_id: pageId,
          granted_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Acesso concedido');
    },
    onError: () => {
      toast.error('Erro ao conceder acesso');
    },
  });

  // Revoke user access
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ userId, pageId }: { userId: string; pageId: string }) => {
      const { error } = await supabase
        .from('user_page_access')
        .delete()
        .eq('user_id', userId)
        .eq('page_permission_id', pageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Acesso revogado');
    },
    onError: () => {
      toast.error('Erro ao revogar acesso');
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('create-team-member', {
        body: userData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      setCreatedCredentials({ email: newUser.email, password: newUser.password });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.first_name || !newUser.last_name || !newUser.email || !newUser.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setCreatedCredentials(null);
    setNewUser({ first_name: '', last_name: '', email: '', password: '', is_admin: false });
    setShowPassword(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para área de transferência');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      rotina: 'Digital Rotina',
      dev: 'Digital Dev',
      gestao: 'Gestão',
      geral: 'Geral',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      rotina: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      dev: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      gestao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      geral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const groupedPages = pages?.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, PagePermission[]>) || {};

  const hasAccess = (userId: string, pageId: string) => {
    return userAccess?.some(a => a.user_id === userId && a.page_permission_id === pageId) || false;
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);

  const handleRefreshPages = () => {
    queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
    toast.success('Lista de páginas atualizada');
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoPsa} alt="PSA" className="h-8" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-white">Controle de Acessos</h1>
                <p className="text-xs text-gray-400">Gestão de usuários e liberação de acessos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/equipe/digital')}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Trocar área
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-73px)]">
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800/80 border-gray-700 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Páginas Ativas</CardTitle>
                  <FileText className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {pages?.filter(p => p.is_active).length || 0}
                  </div>
                  <p className="text-sm text-gray-400">de {pages?.length || 0} páginas</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/80 border-gray-700 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Usuários</CardTitle>
                  <Users className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{users?.length || 0}</div>
                  <p className="text-sm text-gray-400">cadastrados no sistema</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/80 border-gray-700 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Permissões Customizadas</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{userAccess?.length || 0}</div>
                  <p className="text-sm text-gray-400">acessos individuais</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pages" className="space-y-4">
              <TabsList className="bg-gray-800/50 border border-gray-700">
                <TabsTrigger 
                  value="pages" 
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Páginas
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Usuários
                </TabsTrigger>
              </TabsList>

              {/* Pages Tab */}
              <TabsContent value="pages" className="space-y-4">
                {/* Header com botão de atualizar */}
                <div className="flex items-center justify-between bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                  <div>
                    <h3 className="text-base font-medium text-white">Páginas Cadastradas</h3>
                    <p className="text-sm text-gray-400">Atualize para ver novas páginas implementadas</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPages}
                    disabled={loadingPages}
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingPages ? 'animate-spin' : ''}`} />
                    Atualizar lista
                  </Button>
                </div>

                {loadingPages ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                  </div>
                ) : (
                  Object.entries(groupedPages).map(([category, categoryPages]) => {
                    const isExpanded = expandedCategories[category];
                    const visiblePages = isExpanded 
                      ? categoryPages 
                      : categoryPages.slice(0, INITIAL_VISIBLE_PAGES);
                    const hasMore = categoryPages.length > INITIAL_VISIBLE_PAGES;
                    const remainingCount = categoryPages.length - INITIAL_VISIBLE_PAGES;

                    return (
                      <Card key={category} className="bg-gray-800/60 border-gray-700">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(category)}>
                              {getCategoryLabel(category)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {categoryPages.length} páginas
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-gray-700 hover:bg-transparent">
                                <TableHead className="text-gray-400">Página</TableHead>
                                <TableHead className="text-gray-400">Caminho</TableHead>
                                <TableHead className="text-gray-400">Requisitos</TableHead>
                                <TableHead className="text-gray-400 text-right">Ativo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {visiblePages.map((page) => (
                                <TableRow key={page.id} className="border-gray-700 hover:bg-gray-700/30">
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-white">{page.page_name}</p>
                                      {page.page_description && (
                                        <p className="text-xs text-gray-500">{page.page_description}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-gray-400 font-mono text-xs">
                                    {page.page_path}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {page.requires_admin && (
                                        <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
                                          Admin
                                        </Badge>
                                      )}
                                      {page.requires_team_member && (
                                        <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                                          Team
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Switch
                                      checked={page.is_active}
                                      onCheckedChange={(checked) => 
                                        togglePageMutation.mutate({ id: page.id, isActive: checked })
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          {hasMore && (
                            <div className="pt-3 border-t border-gray-700 mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-gray-400 hover:text-white hover:bg-gray-700/50"
                                onClick={() => toggleCategoryExpansion(category)}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Ocultar registros
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Mostrar mais {remainingCount} registros
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                {/* Header com botão de criar usuário */}
                <div className="flex items-center justify-between bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                  <div>
                    <h3 className="text-base font-medium text-white">Usuários do Sistema</h3>
                    <p className="text-sm text-gray-400">Gerencie usuários e suas permissões de acesso</p>
                  </div>
                  <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) handleCloseCreateDialog();
                    else setIsCreateOpen(true);
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black">
                        <UserPlus className="h-4 w-4" />
                        Criar Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700">
                      {createdCredentials ? (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                              Usuário Criado!
                            </DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Compartilhe as credenciais abaixo com o novo usuário
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="bg-gray-900 rounded-lg p-4 space-y-3 border border-gray-700">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-gray-400 text-xs">Email</Label>
                                  <p className="text-white font-mono text-sm">{createdCredentials.email}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-400 hover:text-white"
                                  onClick={() => copyToClipboard(createdCredentials.email)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-gray-400 text-xs">Senha temporária</Label>
                                  <p className="text-white font-mono text-sm">{createdCredentials.password}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-400 hover:text-white"
                                  onClick={() => copyToClipboard(createdCredentials.password)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                              O usuário deve trocar a senha no primeiro acesso
                            </p>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleCloseCreateDialog}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                            >
                              Fechar
                            </Button>
                          </DialogFooter>
                        </>
                      ) : (
                        <form onSubmit={handleCreateUser}>
                          <DialogHeader>
                            <DialogTitle className="text-white">Criar Novo Usuário</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Preencha os dados para criar um novo membro da equipe
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="first_name" className="text-gray-300">Nome *</Label>
                                <Input
                                  id="first_name"
                                  value={newUser.first_name}
                                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                                  className="bg-gray-900 border-gray-600 text-white"
                                  placeholder="Nome"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="last_name" className="text-gray-300">Sobrenome *</Label>
                                <Input
                                  id="last_name"
                                  value={newUser.last_name}
                                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                                  className="bg-gray-900 border-gray-600 text-white"
                                  placeholder="Sobrenome"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-gray-300">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="bg-gray-900 border-gray-600 text-white"
                                placeholder="email@exemplo.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="password" className="text-gray-300">Senha *</Label>
                              <div className="relative">
                                <Input
                                  id="password"
                                  type={showPassword ? 'text' : 'password'}
                                  value={newUser.password}
                                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                  className="bg-gray-900 border-gray-600 text-white pr-10"
                                  placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="is_admin"
                                checked={newUser.is_admin}
                                onCheckedChange={(checked) => 
                                  setNewUser({ ...newUser, is_admin: checked === true })
                                }
                                className="border-gray-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                              />
                              <Label htmlFor="is_admin" className="text-gray-300 text-sm">
                                Conceder acesso de administrador
                              </Label>
                            </div>
                          </div>
                          <DialogFooter className="gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCloseCreateDialog}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="submit"
                              disabled={createUserMutation.isPending}
                              className="bg-amber-500 hover:bg-amber-600 text-black"
                            >
                              {createUserMutation.isPending ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Criando...
                                </>
                              ) : (
                                'Criar Usuário'
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Users List */}
                  <Card className="bg-gray-800/60 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Usuários</CardTitle>
                      <CardDescription className="text-gray-400">
                        Selecione um usuário para gerenciar acessos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="h-5 w-5 animate-spin text-amber-400" />
                        </div>
                      ) : (
                        users?.map((u) => (
                          <button
                            key={u.id}
                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                              selectedUserId === u.id
                                ? 'bg-amber-500/20 border border-amber-500/50'
                                : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                            }`}
                            onClick={() => setSelectedUserId(u.id)}
                          >
                            <p className="font-medium text-white text-sm">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                            <div className="flex gap-1 mt-1">
                              {u.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={`text-xs ${
                                    role === 'admin'
                                      ? 'border-red-500/50 text-red-400'
                                      : role === 'team_member'
                                      ? 'border-blue-500/50 text-blue-400'
                                      : 'border-gray-500/50 text-gray-400'
                                  }`}
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* User Permissions */}
                  <Card className="lg:col-span-2 bg-gray-800/60 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">
                        {selectedUser
                          ? `Acessos de ${selectedUser.first_name} ${selectedUser.last_name}`
                          : 'Selecione um usuário'}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Gerencie as permissões individuais de acesso às páginas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedUserId ? (
                        <div className="space-y-4">
                          {Object.entries(groupedPages).map(([category, categoryPages]) => (
                            <div key={category} className="space-y-2">
                              <Badge className={getCategoryColor(category)}>
                                {getCategoryLabel(category)}
                              </Badge>
                              <div className="space-y-1">
                                {categoryPages.map((page) => {
                                  const userHasAccess = hasAccess(selectedUserId, page.id);
                                  return (
                                    <div
                                      key={page.id}
                                      className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30"
                                    >
                                      <div>
                                        <p className="text-sm text-white">{page.page_name}</p>
                                        <p className="text-xs text-gray-500">{page.page_path}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {userHasAccess ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            onClick={() =>
                                              revokeAccessMutation.mutate({
                                                userId: selectedUserId,
                                                pageId: page.id,
                                              })
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Revogar
                                          </Button>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                            onClick={() =>
                                              grantAccessMutation.mutate({
                                                userId: selectedUserId,
                                                pageId: page.id,
                                              })
                                            }
                                          >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Conceder
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Selecione um usuário na lista ao lado</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </ScrollArea>
    </div>
  );
};

export default EquipeControleAcessos;
