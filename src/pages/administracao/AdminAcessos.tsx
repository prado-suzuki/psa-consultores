import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/administracao/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, CheckCircle, XCircle } from 'lucide-react';

const AdminAcessos = () => {
  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ['admin-users-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id).map(r => r.role),
      }));
    },
  });

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

  const stats = {
    total: usersWithRoles?.length || 0,
    admins: usersWithRoles?.filter(u => u.roles.includes('admin')).length || 0,
    teamMembers: usersWithRoles?.filter(u => u.roles.includes('team_member')).length || 0,
    clients: usersWithRoles?.filter(u => u.roles.includes('client')).length || 0,
  };

  return (
    <AdminLayout 
      title="Gestão de Acessos" 
      subtitle="Visualização e controle de permissões do sistema"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total de Usuários</CardDescription>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Administradores</CardDescription>
              <Shield className="h-4 w-4 text-red-400" />
            </div>
            <CardTitle className="text-3xl text-red-600">{stats.admins}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Membros da Equipe</CardDescription>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <CardTitle className="text-3xl text-blue-600">{stats.teamMembers}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Clientes</CardDescription>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{stats.clients}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários e Permissões</CardTitle>
          <CardDescription>
            Lista de todos os usuários e seus níveis de acesso
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-center">Equipe</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithRoles?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.roles.map((role) => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-gray-400 text-sm">Sem permissões</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.roles.includes('admin') ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.roles.includes('team_member') ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.roles.includes('client') ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Access Legend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Legenda de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getRoleBadge('admin')}
              </div>
              <p className="text-sm text-gray-600">
                Acesso total ao sistema, incluindo gestão de usuários, configurações e todas as áreas.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getRoleBadge('team_member')}
              </div>
              <p className="text-sm text-gray-600">
                Acesso às áreas da equipe: projetos, sprints, tarefas, demandas e processos.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getRoleBadge('client')}
              </div>
              <p className="text-sm text-gray-600">
                Acesso ao portal do cliente: abertura e acompanhamento de chamados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminAcessos;