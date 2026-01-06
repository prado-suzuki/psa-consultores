import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/administracao/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, UserPlus, Shield, Users as UsersIcon } from 'lucide-react';

interface UserWithRoles {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  roles: string[];
}

const AdminUsuarios = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roles: [] as string[],
  });

  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id).map(r => r.role),
      })) as UserWithRoles[];
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-team-member', {
        body: {
          email: newUser.email,
          password: newUser.password,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          roles: newUser.roles,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast({
        title: 'Usuário criado',
        description: 'O novo usuário foi criado com sucesso.',
      });
      setIsDialogOpen(false);
      setNewUser({ email: '', password: '', firstName: '', lastName: '', roles: [] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'client' | 'team_member' }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast({ title: 'Permissão adicionada' });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'client' | 'team_member' }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast({ title: 'Permissão removida' });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredUsers = usersWithRoles?.filter(u => 
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleNewUserRole = (role: string) => {
    setNewUser(prev => ({
      ...prev,
      roles: prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-700">Admin</Badge>;
      case 'team_member':
        return <Badge className="bg-blue-100 text-blue-700">Equipe</Badge>;
      case 'client':
        return <Badge className="bg-gray-100 text-gray-700">Cliente</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <AdminLayout 
      title="Cadastro de Usuários" 
      subtitle="Gerencie os usuários do sistema"
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário no sistema
              </DialogDescription>
            </DialogHeader>
            <form 
              onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome *</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-3">
                <Label>Permissões</Label>
                <div className="space-y-2">
                  {[
                    { id: 'admin', label: 'Administrador', icon: Shield },
                    { id: 'team_member', label: 'Membro da Equipe', icon: UsersIcon },
                    { id: 'client', label: 'Cliente', icon: UsersIcon },
                  ].map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleNewUserRole(role.id)}
                    >
                      <Checkbox
                        id={`new-${role.id}`}
                        checked={newUser.roles.includes(role.id)}
                        onCheckedChange={() => toggleNewUserRole(role.id)}
                      />
                      <role.icon className="h-4 w-4 text-gray-400" />
                      <Label htmlFor={`new-${role.id}`} className="cursor-pointer flex-1">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            {filteredUsers?.length || 0} usuário(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.first_name} {u.last_name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((role) => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                        {u.roles.length === 0 && (
                          <span className="text-gray-400 text-sm">Sem permissões</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!u.roles.includes('team_member') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addRole.mutate({ userId: u.id, role: 'team_member' })}
                            disabled={u.id === user?.id}
                          >
                            + Equipe
                          </Button>
                        )}
                        {u.roles.includes('team_member') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRole.mutate({ userId: u.id, role: 'team_member' })}
                            disabled={u.id === user?.id}
                          >
                            - Equipe
                          </Button>
                        )}
                        {!u.roles.includes('admin') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addRole.mutate({ userId: u.id, role: 'admin' })}
                            disabled={u.id === user?.id}
                          >
                            + Admin
                          </Button>
                        )}
                        {u.roles.includes('admin') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRole.mutate({ userId: u.id, role: 'admin' })}
                            disabled={u.id === user?.id}
                          >
                            - Admin
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminUsuarios;