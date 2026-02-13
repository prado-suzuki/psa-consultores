import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSyncProtectedPages } from '@/hooks/useSyncProtectedPages';
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
  const { syncPages, isSyncing } = useSyncProtectedPages();
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
    roles: [] as string[],
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
    setNewUser({ first_name: '', last_name: '', email: '', password: '', roles: [] });
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
      rotina: 'bg-teal-100 text-teal-700 border-teal-200',
      dev: 'bg-slate-100 text-slate-700 border-slate-200',
      gestao: 'bg-teal-50 text-teal-600 border-teal-100',
      geral: 'bg-slate-50 text-slate-600 border-slate-100',
    };
    return colors[category] || 'bg-slate-100 text-slate-600 border-slate-200';
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
    // Sync pages from config and invalidate caches
    syncPages();
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-slate-200/60 bg-white">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-slate-900">Controle de Acessos</h1>
                <p className="text-xs text-slate-500">Gestão de usuários e liberação de acessos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/equipe/digital')}
                className="text-slate-600 hover:text-teal-600 hover:bg-slate-50"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Trocar área
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-600 hover:text-teal-600 hover:bg-slate-50"
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Páginas Ativas</CardTitle>
                  <div className="p-2 rounded-full bg-teal-100">
                    <FileText className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {pages?.filter(p => p.is_active).length || 0}
                  </div>
                  <p className="text-sm text-slate-500">de {pages?.length || 0} páginas</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Usuários</CardTitle>
                  <div className="p-2 rounded-full bg-teal-100">
                    <Users className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{users?.length || 0}</div>
                  <p className="text-sm text-slate-500">cadastrados no sistema</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Permissões Customizadas</CardTitle>
                  <div className="p-2 rounded-full bg-teal-100">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{userAccess?.length || 0}</div>
                  <p className="text-sm text-slate-500">acessos individuais</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pages" className="space-y-4">
              <TabsList className="bg-slate-100 border border-slate-200">
                <TabsTrigger 
                  value="pages" 
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Páginas
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Usuários
                </TabsTrigger>
              </TabsList>

              {/* Pages Tab */}
              <TabsContent value="pages" className="space-y-4">
                {/* Header com botão de atualizar */}
                <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-base font-medium text-slate-900">Páginas Cadastradas</h3>
                    <p className="text-sm text-slate-500">Atualize para ver novas páginas implementadas</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPages}
                    disabled={loadingPages || isSyncing}
                    className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-600"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${(loadingPages || isSyncing) ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Atualizar lista'}
                  </Button>
                </div>

                {loadingPages ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
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
                      <Card key={category} className="bg-white border-slate-200/60 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(category)}>
                              {getCategoryLabel(category)}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {categoryPages.length} páginas
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-slate-200 hover:bg-transparent">
                                <TableHead className="text-slate-600 bg-slate-50">Página</TableHead>
                                <TableHead className="text-slate-600 bg-slate-50">Caminho</TableHead>
                                <TableHead className="text-slate-600 bg-slate-50">Requisitos</TableHead>
                                <TableHead className="text-slate-600 bg-slate-50 text-right">Ativo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {visiblePages.map((page) => (
                                <TableRow key={page.id} className="border-slate-200 hover:bg-slate-50">
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-slate-900">{page.page_name}</p>
                                      {page.page_description && (
                                        <p className="text-xs text-slate-500">{page.page_description}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-600 font-mono text-xs">
                                    {page.page_path}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {page.requires_admin && (
                                        <Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">
                                          Admin
                                        </Badge>
                                      )}
                                      {page.requires_team_member && (
                                        <Badge variant="outline" className="text-xs border-teal-200 text-teal-600 bg-teal-50">
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
                            <div className="pt-3 border-t border-slate-200 mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-slate-600 hover:text-teal-600 hover:bg-slate-50"
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
                <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-base font-medium text-slate-900">Usuários do Sistema</h3>
                    <p className="text-sm text-slate-500">Gerencie usuários e suas permissões de acesso</p>
                  </div>
                  <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) handleCloseCreateDialog();
                    else setIsCreateOpen(true);
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                        <UserPlus className="h-4 w-4" />
                        Criar Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white border-slate-200">
                      {createdCredentials ? (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-slate-900 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-teal-600" />
                              Usuário Criado!
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                              Compartilhe as credenciais abaixo com o novo usuário
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-slate-500 text-xs">Email</Label>
                                  <p className="text-slate-900 font-mono text-sm">{createdCredentials.email}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-600 hover:text-teal-600"
                                  onClick={() => copyToClipboard(createdCredentials.email)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-slate-500 text-xs">Senha temporária</Label>
                                  <p className="text-slate-900 font-mono text-sm">{createdCredentials.password}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-600 hover:text-teal-600"
                                  onClick={() => copyToClipboard(createdCredentials.password)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                              O usuário deve trocar a senha no primeiro acesso
                            </p>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleCloseCreateDialog}
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              Fechar
                            </Button>
                          </DialogFooter>
                        </>
                      ) : (
                        <form onSubmit={handleCreateUser}>
                          <DialogHeader>
                            <DialogTitle className="text-slate-900">Criar Novo Usuário</DialogTitle>
                            <DialogDescription className="text-slate-500">
                              Preencha os dados para criar um novo membro da equipe
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="first_name" className="text-slate-700">Nome *</Label>
                                <Input
                                  id="first_name"
                                  value={newUser.first_name}
                                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                                  className="bg-white border-slate-200 text-slate-900"
                                  placeholder="Nome"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="last_name" className="text-slate-700">Sobrenome *</Label>
                                <Input
                                  id="last_name"
                                  value={newUser.last_name}
                                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                                  className="bg-white border-slate-200 text-slate-900"
                                  placeholder="Sobrenome"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-slate-700">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="bg-white border-slate-200 text-slate-900"
                                placeholder="email@exemplo.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="password" className="text-slate-700">Senha *</Label>
                              <div className="relative">
                                <Input
                                  id="password"
                                  type={showPassword ? 'text' : 'password'}
                                  value={newUser.password}
                                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                  className="bg-white border-slate-200 text-slate-900 pr-10"
                                  placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-600"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Label className="text-slate-700 text-sm font-medium">Papéis do usuário</Label>
                              {[
                                { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
                                { value: 'team_member', label: 'Membro da Equipe', desc: 'Acesso às áreas da equipe' },
                                { value: 'client', label: 'Cliente', desc: 'Acesso ao portal do cliente' },
                              ].map((role) => (
                                <div key={role.value} className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                  <Checkbox
                                    id={`role_${role.value}`}
                                    checked={newUser.roles.includes(role.value)}
                                    onCheckedChange={(checked) => {
                                      setNewUser(prev => ({
                                        ...prev,
                                        roles: checked
                                          ? [...prev.roles, role.value]
                                          : prev.roles.filter(r => r !== role.value),
                                      }));
                                    }}
                                    className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-0.5"
                                  />
                                  <div>
                                    <Label htmlFor={`role_${role.value}`} className="text-slate-900 text-sm font-medium cursor-pointer">
                                      {role.label}
                                    </Label>
                                    <p className="text-xs text-slate-500">{role.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <DialogFooter className="gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCloseCreateDialog}
                              className="border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="submit"
                              disabled={createUserMutation.isPending}
                              className="bg-teal-600 hover:bg-teal-700 text-white"
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
                  <Card className="bg-white border-slate-200/60 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-900 text-sm">Usuários</CardTitle>
                      <CardDescription className="text-slate-500">
                        Selecione um usuário para gerenciar acessos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
                        </div>
                      ) : (
                        users?.map((u) => (
                          <button
                            key={u.id}
                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                              selectedUserId === u.id
                                ? 'bg-teal-500/10 border border-teal-200'
                                : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                            }`}
                            onClick={() => setSelectedUserId(u.id)}
                          >
                            <p className="font-medium text-slate-900 text-sm">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                            <div className="flex gap-1 mt-1">
                              {u.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={`text-xs ${
                                    role === 'admin'
                                      ? 'border-red-200 text-red-600 bg-red-50'
                                      : role === 'team_member'
                                      ? 'border-teal-200 text-teal-600 bg-teal-50'
                                      : 'border-slate-200 text-slate-600 bg-slate-50'
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
                  <Card className="lg:col-span-2 bg-white border-slate-200/60 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-900 text-sm">
                        {selectedUser
                          ? `Acessos de ${selectedUser.first_name} ${selectedUser.last_name}`
                          : 'Selecione um usuário'}
                      </CardTitle>
                      <CardDescription className="text-slate-500">
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
                                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                                    >
                                      <div>
                                        <p className="text-sm text-slate-900">{page.page_name}</p>
                                        <p className="text-xs text-slate-500">{page.page_path}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {userHasAccess ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
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
                        <div className="text-center py-8 text-slate-500">
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
