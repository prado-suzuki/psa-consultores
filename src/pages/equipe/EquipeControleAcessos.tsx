import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import EquipeLayout from '@/components/equipe/EquipeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  RefreshCw,
  Check,
  X,
  Plus,
  Trash2
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

const EquipeControleAcessos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
      rotina: 'bg-blue-500/20 text-blue-400',
      dev: 'bg-purple-500/20 text-purple-400',
      gestao: 'bg-amber-500/20 text-amber-400',
      geral: 'bg-gray-500/20 text-gray-400',
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
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

  return (
    <EquipeLayout
      title="Controle de Acessos"
      subtitle="Gerenciamento de permissões e liberação de funcionalidades do sistema"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Páginas Ativas</CardTitle>
              <FileText className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {pages?.filter(p => p.is_active).length || 0}
              </div>
              <p className="text-xs text-slate-500">de {pages?.length || 0} páginas</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Usuários</CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{users?.length || 0}</div>
              <p className="text-xs text-slate-500">cadastrados no sistema</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Permissões Customizadas</CardTitle>
              <ShieldCheck className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{userAccess?.length || 0}</div>
              <p className="text-xs text-slate-500">acessos individuais</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pages" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="pages" className="data-[state=active]:bg-slate-700">
              <FileText className="h-4 w-4 mr-2" />
              Páginas
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-slate-700">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            {loadingPages ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              Object.entries(groupedPages).map(([category, categoryPages]) => (
                <Card key={category} className="bg-slate-800/50 border-slate-700">
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
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-slate-400">Página</TableHead>
                          <TableHead className="text-slate-400">Caminho</TableHead>
                          <TableHead className="text-slate-400">Requisitos</TableHead>
                          <TableHead className="text-slate-400 text-right">Ativo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryPages.map((page) => (
                          <TableRow key={page.id} className="border-slate-700">
                            <TableCell>
                              <div>
                                <p className="font-medium text-white">{page.page_name}</p>
                                {page.page_description && (
                                  <p className="text-xs text-slate-500">{page.page_description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-400 font-mono text-xs">
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
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Users List */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Usuários</CardTitle>
                  <CardDescription>Selecione um usuário para gerenciar acessos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    users?.map((u) => (
                      <button
                        key={u.id}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedUserId === u.id
                            ? 'bg-primary/20 border border-primary/50'
                            : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                        }`}
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <p className="font-medium text-white text-sm">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
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
              <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">
                    {selectedUser
                      ? `Acessos de ${selectedUser.first_name} ${selectedUser.last_name}`
                      : 'Selecione um usuário'}
                  </CardTitle>
                  <CardDescription>
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
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30"
                                >
                                  <div>
                                    <p className="text-sm text-white">{page.page_name}</p>
                                    <p className="text-xs text-slate-500">{page.page_path}</p>
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
                                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
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
                                    {userHasAccess && (
                                      <Badge className="bg-green-500/20 text-green-400">
                                        <Check className="h-3 w-3 mr-1" />
                                        Acesso
                                      </Badge>
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
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <Users className="h-12 w-12 mb-4 opacity-50" />
                      <p>Selecione um usuário para ver e gerenciar seus acessos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </EquipeLayout>
  );
};

export default EquipeControleAcessos;
