import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PapelBadge } from '@/components/ui/PapelBadge';
import { Shield, Users, UserCheck } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { useUsersWithRoles, type AppRole } from '@/hooks/useUsersWithRoles';
import { PainelDaMatrizDeAcessos } from './PainelDaMatrizDeAcessos';

/* A segunda cópia do mapa de papel morreu aqui em 11/09/2026. Esta era a que
   passava em AA nos sete — a da lista de usuários reprovava em quatro —, e duas
   cópias que divergem em cor e concordam no rótulo é como o defeito se esconde.
   Papel agora é `PapelBadge`, e o rótulo vem do mesmo `ROLE_SHORT_LABELS` que a
   lista já usava. */

/** Os sete papéis, na ordem em que a legenda os explica. */
const PAPEIS: AppRole[] = [
  'admin', 'team_member', 'lider', 'sublider', 'client', 'timecliente', 'marketing',
];

const LEGEND_DESCRIPTIONS: Record<AppRole, string> = {
  admin:       'Acesso total ao sistema, incluindo gestão de usuários, configurações e todas as áreas.',
  team_member: 'Acesso às áreas da equipe: projetos, sprints, tarefas, demandas e processos.',
  lider:       'Visibilidade global de projetos e tarefas em todas as áreas.',
  sublider:    'Apoio à liderança com visibilidade ampliada na sua área.',
  client:      'Acesso ao portal do cliente: abertura e acompanhamento de chamados.',
  timecliente: 'Membro da equipe do cliente com acesso restrito ao portal.',
  marketing:   'Gerencia as novidades do site. Não abre nenhuma outra área sozinho.',
};

/**
 * A seção **Papéis** do Controle de Acessos: os quatro cartões de contagem, a
 * matriz editável e a legenda do que cada papel abre.
 *
 * ## Ele tinha quatro props, e nenhuma tinha chamador
 *
 * `variant`, `roleColumns`, `teamMemberColumnLabel` e `editavel` existiam para
 * servir três consumidores. Conferido no navegador em 14/09/2026: dois deles
 * não existem.
 *
 * - `/gestao/acessos` virou `<Navigate>` para `/equipe/acessos` (ver `App.tsx`).
 * - `/administracao/acessos` dava **404**: a rota saiu do `App.tsx` em
 *   13/01/2026, no commit que criou o `/gestao`, e a página ficou no repositório
 *   sem ninguém montar. A Patrícia confirmou que a tela não volta, e a pasta
 *   `administracao/` inteira foi apagada no mesmo dia.
 *
 * Sobrou UM consumidor, que sempre pedia `variant="full" editavel`. Então as
 * props saíram, e com elas a tabela só-leitura que a `editavel={false}`
 * desenhava — mantê-la seria dead code "por garantia", que o AGENTS.md proíbe
 * por nome. Ela está no histórico, em `b0ba2d12^`.
 *
 * A lição, que vale além daqui: **um docstring que lista consumidores envelhece
 * sem avisar.** O anterior sobreviveu oito meses a duas rotas mortas, e só caiu
 * porque alguém foi abrir uma delas.
 */
export const UsersRolesView = () => {
  const { data: usersWithRoles } = useUsersWithRoles();

  const stats = {
    total: usersWithRoles?.length || 0,
    admins: usersWithRoles?.filter((u) => u.roles.includes('admin')).length || 0,
    teamMembers: usersWithRoles?.filter((u) => u.roles.includes('team_member')).length || 0,
    clients: usersWithRoles?.filter((u) => u.roles.includes('client')).length || 0,
  };

  return (
    <>
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

      <PainelDaMatrizDeAcessos />

      {/* Legenda de acessos */}
      <Card className="mt-6 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Legenda de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          {/* `lg:grid-cols-6` disparava em 1024px, onde a coluna tem 720px:
              120px por caixa, 88px uteis depois do `p-4`, para um paragrafo de
              ~100 caracteres. Seis colunas so a partir de `2xl`. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
            {PAPEIS.map((role) => (
              <div key={role} className="p-4 border border-border rounded-lg bg-muted">
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
