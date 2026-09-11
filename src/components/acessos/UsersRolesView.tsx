import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PapelBadge } from '@/components/ui/PapelBadge';
import { ROLE_SHORT_LABELS } from './roleOptions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { useUsersWithRoles, type AppRole } from '@/hooks/useUsersWithRoles';

/* A segunda cópia do mapa de papel morreu aqui em 11/09/2026. Esta era a que
   passava em AA nos sete — a da lista de usuários reprovava em quatro —, e duas
   cópias que divergem em cor e concordam no rótulo é como o defeito se esconde.
   Papel agora é `PapelBadge`, e o rótulo vem do mesmo `ROLE_SHORT_LABELS` que a
   lista já usava. */

const LEGEND_DESCRIPTIONS: Record<AppRole, string> = {
  admin:       'Acesso total ao sistema, incluindo gestão de usuários, configurações e todas as áreas.',
  team_member: 'Acesso às áreas da equipe: projetos, sprints, tarefas, demandas e processos.',
  lider:       'Visibilidade global de projetos e tarefas em todas as áreas.',
  sublider:    'Apoio à liderança com visibilidade ampliada na sua área.',
  client:      'Acesso ao portal do cliente: abertura e acompanhamento de chamados.',
  timecliente: 'Membro da equipe do cliente com acesso restrito ao portal.',
  marketing:   'Gerencia as novidades do site. Não abre nenhuma outra área sozinho.',
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
  /** Label customizado para a coluna"team_member" (compact usa"Equipe", full usa"Membro"). */
  teamMemberColumnLabel?: string;
}

const VARIANT_COLUMNS: Record<NonNullable<UsersRolesViewProps['variant']>, AppRole[]> = {
  compact: ['admin', 'team_member', 'client'],
  full: ['admin', 'team_member', 'lider', 'sublider', 'client', 'timecliente', 'marketing'],
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

  const columnHeader = (role: AppRole): string => {
    if (role === 'team_member' && teamMemberColumnLabel) return teamMemberColumnLabel;
    return ROLE_SHORT_LABELS[role] ?? role;
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Usuários"
          value={stats.total}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          iconColor="bg-foreground/[0.05]"
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
          icon={<Users className="h-5 w-5 text-primary" />}
          iconColor="bg-primary/15"
        />
      </div>

      {/* Users Table */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Usuários e Permissões</CardTitle>
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
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissões</TableHead>
                  {columns.map((role) => (
                    <TableHead key={role} className="text-center">
                      {columnHeader(role)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithRoles?.map((user) => (
                  <TableRow key={user.id} className="hover:bg-foreground/[0.03]">
                    <TableCell className="font-medium text-foreground">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <PapelBadge key={role} papel={role} />
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-muted-foreground text-sm">Sem permissões</span>
                        )}
                      </div>
                    </TableCell>
                    {columns.map((role) => (
                      <TableCell key={role} className="text-center">
                        {user.roles.includes(role) ? (
                          <CheckCircle className="h-5 w-5 text-status-feito mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground/40 mx-auto" />
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
      <Card className="mt-6 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Legenda de Permissões</CardTitle>
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
                className="p-4 border border-border rounded-lg bg-muted"
              >
                <div className="flex items-center gap-2 mb-2"><PapelBadge papel={role} /></div>
                <p className="text-sm text-muted-foreground">{LEGEND_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
