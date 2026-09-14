import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PapelBadge } from '@/components/ui/PapelBadge';
import { ROLE_SHORT_LABELS } from './roleOptions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { useUsersWithRoles, type AppRole } from '@/hooks/useUsersWithRoles';
import { PainelDaMatrizDeAcessos } from './PainelDaMatrizDeAcessos';

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
  /**
   * Troca a tabela de leitura pelo painel editável (filtros, interruptor de
   * eixo, seleção em lote e célula que grava no clique).
   *
   * É opt-in, e o default é `false`, porque `/administracao/acessos` mostra a
   * mesma informação para quem não administra acesso nenhum — lá a tabela
   * continua sendo o que sempre foi. Os cartões e a legenda são comuns aos
   * dois: eles descrevem o sistema, não o que você pode mexer.
   */
  editavel?: boolean;
}

const VARIANT_COLUMNS: Record<NonNullable<UsersRolesViewProps['variant']>, AppRole[]> = {
  compact: ['admin', 'team_member', 'client'],
  full: ['admin', 'team_member', 'lider', 'sublider', 'client', 'timecliente', 'marketing'],
};

/**
 * Cartões de estatística, a tabela de usuários × papéis e a legenda.
 *
 * ## ELE TEM UM CONSUMIDOR SÓ, e o docstring anterior dizia que eram dois
 *
 * Dizia"compartilhado entre `/administracao/acessos` (compact) e
 * `/gestao/acessos` (full)". Conferido no navegador em 14/09/2026: as duas
 * rotas sumiram, e a lista inteira de consumidores é a seção **Papéis** de
 * `/equipe/acessos`, com `variant="full" editavel`.
 *
 * - `/gestao/acessos` virou `<Navigate>` para `/equipe/acessos` (ver `App.tsx`).
 * - `/administracao/acessos` dá **404**: a rota saiu do `App.tsx` em
 *   13/01/2026, no commit que criou o `/gestao`, e `AdminAcessos.tsx` ficou no
 *   repositório sem ninguém montar.
 *
 * Por isso `variant="compact"`, `roleColumns` e `teamMemberColumnLabel` não têm
 * chamador vivo. Ficam porque a decisão de apagar a pasta `administracao/`
 * inteira (685 linhas em 4 arquivos, mais 5 catracas que a citam no inventário)
 * é maior do que este arquivo — está registrada em
 * `docs/geral/matriz-de-acessos-editavel.md`.
 *
 * A lição, que vale além daqui: **um docstring que lista consumidores envelhece
 * sem avisar.** Este sobreviveu oito meses a duas rotas mortas, e só caiu porque
 * alguém foi abrir uma delas.
 */
export const UsersRolesView = ({
  variant = 'compact',
  roleColumns,
  teamMemberColumnLabel,
  editavel = false,
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
      {/* `sm`/`xl`, e nao `md`: a partir de 768px a barra lateral sai da
          gaveta e volta ao fluxo levando 256px, entao em 768px cravados a
          coluna tem 464px. Com `md:grid-cols-4` isso dava 116px por cartao —
          68px uteis depois do `p-6`, para "Membros da Equipe" mais um numero
          `text-3xl`. Quem dita o ponto de virada e a COLUNA, nao a viewport. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Usuários"
          value={stats.total}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          iconColor="bg-foreground/[0.05]"
        />
        {/* Os tres cartoes seguem a MESMA decisao que tirou a cor da hierarquia
            no `PapelBadge`: contagem de admin nao e erro e contagem de membro
            nao e categoria, entao os dois degraus internos ficam neutros. Cor so
            no eixo de fora — e ai ela repete o tom do badge de Cliente, para o
            cartao e a pilula dizerem a mesma coisa com a mesma cor.
            A regra vem da rodada do Audit: selo veste papel, contagem nao. */}
        <MetricCard
          title="Administradores"
          value={stats.admins}
          icon={<Shield className="h-5 w-5 text-status-neutro" />}
          iconColor="bg-status-neutro-soft"
        />
        <MetricCard
          title="Membros da Equipe"
          value={stats.teamMembers}
          icon={<UserCheck className="h-5 w-5 text-muted-foreground" />}
          iconColor="bg-muted"
        />
        <MetricCard
          title="Clientes"
          value={stats.clients}
          icon={<Users className="h-5 w-5 text-tag-d" />}
          iconColor="bg-tag-d/15"
        />
      </div>

      {/* Users Table */}
      {editavel ? (
        <PainelDaMatrizDeAcessos />
      ) : (
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
                  <TableHead className="hidden 2xl:table-cell">Email</TableHead>
                  {/* A pilula e a matriz dizem A MESMA COISA — a linha nunca
                      mostra as duas. Abaixo de `lg` ficam as pilulas (que cabem
                      numa celula so); de `lg` para cima, as sete colunas. Era
                      essa duplicata que fazia a tabela ter dez colunas e rolar
                      para o lado em qualquer tela que nao fosse a de 1920. */}
                  <TableHead className="xl:hidden">Permissões</TableHead>
                  {columns.map((role) => (
                    <TableHead key={role} className="hidden xl:table-cell text-center">
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
                      {/* Enquanto a coluna de Email nao existe, o email vem
                          embaixo do nome — e o mesmo empilhamento da lista de
                          usuarios da aba ao lado, e evita o email sumir de vez
                          nas larguras em que ele nao cabe como coluna. */}
                      <span className="block 2xl:hidden text-xs font-normal text-muted-foreground break-all">
                        {user.email}
                      </span>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell text-muted-foreground break-all">
                      {user.email}
                    </TableCell>
                    <TableCell className="xl:hidden">
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
                      <TableCell key={role} className="hidden xl:table-cell text-center">
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
      )}

      {/* Access Legend */}
      <Card className="mt-6 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Legenda de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            /* `lg:grid-cols-6` disparava em 1024px, onde a coluna tem 720px:
               120px por caixa, 88px uteis depois do `p-4`, para um paragrafo de
               ~100 caracteres. Seis colunas so a partir de `2xl`. */
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${
              columns.length > 3 ? '2xl:grid-cols-6' : ''
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
