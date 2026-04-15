import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { useUsersWithRoles, type AppRole } from '@/hooks/useUsersWithRoles';

type RoleVisual = { key: AppRole; label: string; className: string };

const ROLE_VISUALS: Record<AppRole, RoleVisual> = {
  admin:       { key: 'admin',       label: 'Admin',        className: 'bg-red-100 text-red-700 border-0' },
  team_member: { key: 'team_member', label: 'Membro',       className: 'bg-blue-100 text-blue-700 border-0' },
  lider:       { key: 'lider',       label: 'Líder Geral',  className: 'bg-amber-100 text-amber-700 border-0' },
  sublider:    { key: 'sublider',    label: 'Sublíder',     className: 'bg-orange-100 text-orange-700 border-0' },
  client:      { key: 'client',      label: 'Cliente',      className: 'bg-slate-100 text-slate-600 border-0' },
  timecliente: { key: 'timecliente', label: 'Time Cliente', className: 'bg-cyan-100 text-cyan-700 border-0' },
};

const LEGEND_DESCRIPTIONS: Record<AppRole, string> = {
  admin:       'Acesso total ao sistema, incluindo gestão de usuários, configurações e todas as áreas.',
  team_member: 'Acesso às áreas da equipe: projetos, sprints, tarefas, demandas e processos.',
  lider:       'Visibilidade global de projetos e tarefas em todas as áreas.',
  sublider:    'Apoio à liderança com visibilidade ampliada na sua área.',
  client:      'Acesso ao portal do cliente: abertura e acompanhamento de chamados.',
  timecliente: 'Membro da equipe do cliente com acesso restrito ao portal.',
};

export interface UsersRolesViewProps {
  /**
   * Quais roles aparecem como colunas check/x individuais na tabela.
   * Default (variant compact): ['admin', 'team_member', 'client']
   * Variant full: todas as 6 roles.
   */
  variant?: 'compact' | 'full';
  /** Colunas customizadas (sobrescreve variant). */
  roleColumns?: AppRole[];
  /** Label customizado para a coluna "team_member" (compact usa "Equipe", full usa "Membro"). */
  teamMemberColumnLabel?: string;
}

const VARIANT_COLUMNS: Record<NonNullable<UsersRolesViewProps['variant']>, AppRole[]> = {
  compact: ['admin', 'team_member', 'client'],
  full: ['admin', 'team_member', 'lider', 'sublider', 'client', 'timecliente'],
};

/**
 * Tabela read-only de usuários e suas roles + cards de estatística + legenda.
 *
 * Componente compartilhado entre:
 * - /administracao/acessos (variant="compact")
 * - /gestao/acessos (variant="full")
 *
 * O layout de moldura (AdminLayout / GestaoLayout) permanece na página-pai;
 * aqui só cuidamos do conteúdo.
 */
export const UsersRolesView = ({
  variant = 'compact',
  roleColumns,
  teamMemberColumnLabel,
}: UsersRolesViewProps) => {
  const { data: usersWithRoles, isLoading } = useUsersWithRoles();

  const columns = roleColumns ?? VARIANT_COLUMNS[variant];

  const stats = {
    total: usersWithRoles?.length || 0,
    admins: usersWithRoles?.filter((u) => u.roles.includes('admin')).length || 0,
    teamMembers: usersWithRoles?.filter((u) => u.roles.includes('team_member')).length || 0,
    clients: usersWithRoles?.filter((u) => u.roles.includes('client')).length || 0,
  };

  const getRoleBadge = (role: string) => {
    const visual = ROLE_VISUALS[role as AppRole];
    if (!visual) return <Badge variant="outline">{role}</Badge>;
    return <Badge className={visual.className}>{visual.label}</Badge>;
  };

  const columnHeader = (role: AppRole): string => {
    if (role === 'team_member' && teamMemberColumnLabel) return teamMemberColumnLabel;
    return ROLE_VISUALS[role].label;
  };

  return (
    <>
      {/* Stats Cards */}
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
                  {columns.map((role) => (
                    <TableHead key={role} className="text-center text-slate-600">
                      {columnHeader(role)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithRoles?.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-700">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell className="text-slate-500">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-slate-400 text-sm">Sem permissões</span>
                        )}
                      </div>
                    </TableCell>
                    {columns.map((role) => (
                      <TableCell key={role} className="text-center">
                        {user.roles.includes(role) ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
                        )}
                      </TableCell>
                    ))}
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
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
              columns.length > 3 ? 'lg:grid-cols-6' : ''
            }`}
          >
            {columns.map((role) => (
              <div
                key={role}
                className="p-4 border border-slate-200 rounded-lg bg-slate-50"
              >
                <div className="flex items-center gap-2 mb-2">{getRoleBadge(role)}</div>
                <p className="text-sm text-slate-600">{LEGEND_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
