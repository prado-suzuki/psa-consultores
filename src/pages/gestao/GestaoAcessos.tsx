import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';

const GestaoAcessos = () => {
  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ['gestao-users-roles'],
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
        return <Badge className="bg-red-100 text-red-700 border-0">Admin</Badge>;
      case 'team_member':
        return <Badge className="bg-blue-100 text-blue-700 border-0">Equipe</Badge>;
      case 'client':
        return <Badge className="bg-slate-100 text-slate-600 border-0">Cliente</Badge>;
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
    <GestaoLayout 
      title="Controle de Acessos" 
      subtitle="Visualização e controle de permissões do sistema"
    >
      {/* Stats Cards com MetricCard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Usuários"
          value={stats.total}
          icon={<Users className="h-5 w-5 text-slate-600" />}
          iconColor="bg-slate-100"
        />
        <MetricCard
          title="Administradores"
          value={stats.admins}
          icon={<Shield className="h-5 w-5 text-red-600" />}
          iconColor="bg-red-100"
        />
        <MetricCard
          title="Membros da Equipe"
          value={stats.teamMembers}
          icon={<UserCheck className="h-5 w-5 text-blue-600" />}
          iconColor="bg-blue-100"
        />
        <MetricCard
          title="Clientes"
          value={stats.clients}
          icon={<Users className="h-5 w-5 text-teal-600" />}
          iconColor="bg-teal-100"
        />
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-700">Usuários e Permissões</CardTitle>
          <CardDescription className="text-slate-500">
            Lista de todos os usuários e seus níveis de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-slate-600">Usuário</TableHead>
                  <TableHead className="text-slate-600">Email</TableHead>
                  <TableHead className="text-slate-600">Permissões</TableHead>
                  <TableHead className="text-center text-slate-600">Admin</TableHead>
                  <TableHead className="text-center text-slate-600">Equipe</TableHead>
                  <TableHead className="text-center text-slate-600">Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithRoles?.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-700">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.roles.map((role) => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-slate-400 text-sm">Sem permissões</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.roles.includes('admin') ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.roles.includes('team_member') ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.roles.includes('client') ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
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
      <Card className="mt-6 border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-700">Legenda de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                {getRoleBadge('admin')}
              </div>
              <p className="text-sm text-slate-600">
                Acesso total ao sistema, incluindo gestão de usuários, configurações e todas as áreas.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                {getRoleBadge('team_member')}
              </div>
              <p className="text-sm text-slate-600">
                Acesso às áreas da equipe: projetos, sprints, tarefas, demandas e processos.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                {getRoleBadge('client')}
              </div>
              <p className="text-sm text-slate-600">
                Acesso ao portal do cliente: abertura e acompanhamento de chamados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </GestaoLayout>
  );
};

export default GestaoAcessos;
