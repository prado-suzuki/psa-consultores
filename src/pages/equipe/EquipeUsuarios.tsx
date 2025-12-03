import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, MoreHorizontal, Search, Shield, ShieldOff, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserWithRoles {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
}

type FilterType = 'all' | 'team_member' | 'admin' | 'no_access';

export default function EquipeUsuarios() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    is_admin: false,
  });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  // Fetch users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      // Fetch profiles with email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = profiles.map(profile => {
        const userRoles = allRoles
          .filter(r => r.user_id === profile.id)
          .map(r => r.role);
        
        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email || '',
          roles: userRoles,
        };
      });

      return usersWithRoles;
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
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success('Acesso concedido!');
    },
    onError: () => {
      toast.error('Erro ao conceder acesso');
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success('Acesso removido!');
    },
    onError: () => {
      toast.error('Erro ao remover acesso');
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

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    switch (filter) {
      case 'team_member':
        return user.roles.includes('team_member');
      case 'admin':
        return user.roles.includes('admin');
      case 'no_access':
        return !user.roles.includes('team_member') && !user.roles.includes('admin');
      default:
        return true;
    }
  });

  const getRoleBadges = (roles: string[]) => {
    const badges = [];
    if (roles.includes('admin')) {
      badges.push(
        <Badge key="admin" className="bg-amber-500/20 text-amber-700 border-amber-300">
          Admin
        </Badge>
      );
    }
    if (roles.includes('team_member')) {
      badges.push(
        <Badge key="team" className="bg-primary/20 text-primary border-primary/30">
          Equipe
        </Badge>
      );
    }
    if (roles.includes('client')) {
      badges.push(
        <Badge key="client" variant="secondary">
          Cliente
        </Badge>
      );
    }
    if (badges.length === 0 || (badges.length === 1 && roles.includes('client'))) {
      badges.push(
        <Badge key="none" variant="outline" className="text-gray-500">
          Sem acesso
        </Badge>
      );
    }
    return badges;
  };

  return (
    <EquipeLayout 
      title="Gestão de Usuários" 
      subtitle="Gerencie os acessos da equipe"
      headerActions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Criar Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {createdCredentials ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-primary">Usuário Criado!</DialogTitle>
                  <DialogDescription>
                    Compartilhe as credenciais abaixo com o novo membro:
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <Label className="text-xs text-gray-500">Email</Label>
                      <p className="font-mono text-sm">{createdCredentials.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Senha Temporária</Label>
                      <p className="font-mono text-sm">{createdCredentials.password}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    O usuário deve alterar a senha no primeiro acesso.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreateDialog}>Fechar</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Criar Novo Membro</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do novo membro da equipe.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Nome *</Label>
                      <Input
                        id="first_name"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                        placeholder="João"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Sobrenome *</Label>
                      <Input
                        id="last_name"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                        placeholder="Silva"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="joao@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha Temporária *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Compartilhe esta senha com o usuário</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_admin"
                      checked={newUser.is_admin}
                      onCheckedChange={(checked) => setNewUser({ ...newUser, is_admin: checked as boolean })}
                    />
                    <Label htmlFor="is_admin" className="text-sm font-normal cursor-pointer">
                      Conceder acesso de administrador
                    </Label>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'team_member' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('team_member')}
          >
            Equipe
          </Button>
          <Button
            variant={filter === 'admin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('admin')}
          >
            Admins
          </Button>
          <Button
            variant={filter === 'no_access' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('no_access')}
          >
            Sem Acesso
          </Button>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Acessos</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const displayName = user.first_name || user.last_name 
                    ? `${user.first_name} ${user.last_name}`.trim()
                    : user.email || 'Usuário sem nome';
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-medium">{displayName}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-muted-foreground text-sm">{user.email || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {getRoleBadges(user.roles)}
                        </div>
                      </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!user.roles.includes('team_member') ? (
                            <DropdownMenuItem
                              onClick={() => addRoleMutation.mutate({ userId: user.id, role: 'team_member' })}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Conceder acesso à equipe
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => removeRoleMutation.mutate({ userId: user.id, role: 'team_member' })}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Revogar acesso à equipe
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {!user.roles.includes('admin') ? (
                            <DropdownMenuItem
                              onClick={() => addRoleMutation.mutate({ userId: user.id, role: 'admin' })}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Promover a admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                if (user.id === currentUser?.id) {
                                  toast.error('Você não pode remover seu próprio acesso de admin');
                                  return;
                                }
                                removeRoleMutation.mutate({ userId: user.id, role: 'admin' });
                              }}
                              disabled={user.id === currentUser?.id}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remover admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-xs">Admin</Badge>
          Acesso total
        </span>
        <span className="flex items-center gap-1">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Equipe</Badge>
          Membro da equipe
        </span>
      </div>
    </EquipeLayout>
  );
}
