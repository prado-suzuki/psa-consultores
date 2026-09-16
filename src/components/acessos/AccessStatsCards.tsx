import { useMemo } from 'react';
import { FileText, ShieldCheck, Users } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';
import {
  useEstruturaAreasTodas,
  useEstruturaClusters,
  useEstruturaEquipesTodas,
  useEstruturaMembros,
} from '@/hooks/useEstruturaManager';
import { colunasDeEquipeDaMatriz } from '@/lib/equipesDaEstrutura';

/**
 * A faixa de contagens do topo do Controle de Acessos.
 *
 * Eram `<Card>` escritos à mão, e a seção Papéis — na MESMA tela, um clique ao
 * lado — já montava os quatro cartões dela com `MetricCard`. Agora os dois
 * grupos são o mesmo componente.
 *
 * ── Por que a faixa muda em Papéis ──────────────────────────────────────
 * Unificar o desenho revelou o que a diferença escondia: o"68" de Usuários
 * aqui e o"68" de Total de Usuários logo abaixo eram o MESMO número, da mesma
 * fonte. Sete cartões na mesma dobra dizendo seis coisas — e o de Usuários era
 * o pior dos dois, porque o de baixo abre o total em admin, membro e cliente.
 *
 * "Páginas Ativas" saiu pelo motivo oposto: ele diz"110 de 110", e vai dizer
 * isso até o dia em que alguém desligar uma página. Cartão que só informa num
 * dia que não chegou ocupa a primeira dobra todos os outros.
 *
 * No lugar entra EQUIPES, que é a dimensão que a matriz abre ao lado de papéis
 * e áreas e que a faixa não dizia em lugar nenhum — e ele carrega no subtítulo
 * a pendência real: equipe desativada **não desliga ninguém**, então há gente
 * em equipe que a estrutura já fechou.
 */
export interface AccessStatsCardsProps {
  /**
   * `papeis` troca a faixa pela composição da seção de Papéis (Equipes e
   * Permissões). Qualquer outra seção usa a faixa geral.
   */
  variante?: 'geral' | 'papeis';
}

export const AccessStatsCards = ({ variante = 'geral' }: AccessStatsCardsProps) => {
  const { data: pages } = usePagePermissions();
  const { data: users } = useUsersWithRoles();
  const { data: userAccess } = useUserPageAccess();

  const activePages = pages?.filter((p) => p.is_active).length ?? 0;
  const totalPages = pages?.length ?? 0;
  const totalUsers = users?.length ?? 0;
  const totalAccess = userAccess?.length ?? 0;

  const permissoes = (
    <MetricCard
      title="Permissões Customizadas"
      value={totalAccess}
      change="acessos individuais"
      icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      iconColor="bg-primary/15"
    />
  );

  /* O ponto de virada e `sm`/`xl`, e NAO `md`: abaixo de `md` a barra lateral
     e gaveta e o conteudo pega a viewport inteira, mas a partir de 768px ela
     volta ao fluxo e leva 256px. Em 768px cravados sobravam 464px de coluna,
     que com `md:grid-cols-3` dava 155px por cartao — 107px uteis depois do
     `p-6`, com "Permissoes Customizadas" quebrando em tres linhas. A largura
     que manda aqui e a da COLUNA, nao a da tela.

     As duas listas de classe estao escritas por extenso, e nao montadas a
     partir do numero de cartoes, porque o Tailwind procura nomes LITERAIS no
     codigo-fonte: `xl:grid-cols-${n}` nao e encontrado, a classe nao entra no
     CSS e a faixa desmonta — sem erro de build, de lint ou de tipo. */
  if (variante === 'papeis') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CartaoDeEquipes />
        {permissoes}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <MetricCard
        title="Páginas Ativas"
        value={activePages}
        change={`de ${totalPages} páginas`}
        icon={<FileText className="h-5 w-5 text-primary" />}
        iconColor="bg-primary/15"
      />
      <MetricCard
        title="Usuários"
        value={totalUsers}
        change="cadastrados no sistema"
        icon={<Users className="h-5 w-5 text-primary" />}
        iconColor="bg-primary/15"
      />
      {permissoes}
    </div>
  );
};

/**
 * Equipes da estrutura, e quantas estão fechadas com gente dentro.
 *
 * O número grande são as equipes VIVAS — as que podem receber alguém hoje. O
 * subtítulo é o que a tela não dizia: desativar uma equipe não desliga os
 * membros dela, e essas pessoas continuam vinculadas a algo que a estrutura já
 * fechou. Quem mede isso é `colunasDeEquipeDaMatriz`, a mesma função que decide
 * as colunas da matriz, pela mesma regra — entra quem está ativa **ou** quem
 * tem gente dentro.
 *
 * Os quatro hooks já são os da matriz, na mesma tela: o React Query deduplica.
 */
const CartaoDeEquipes = () => {
  const { data: clusters = [] } = useEstruturaClusters();
  const { data: areasTodas = [] } = useEstruturaAreasTodas();
  const { data: equipesTodas = [] } = useEstruturaEquipesTodas();
  const { data: membros = [] } = useEstruturaMembros();

  const { vivas, fechadasComGente, pessoasPresas } = useMemo(() => {
    const colunas = colunasDeEquipeDaMatriz(clusters, areasTodas, equipesTodas, membros);
    const fechadas = colunas.filter((c) => c.inativa);
    const idsFechados = new Set(fechadas.map((c) => c.id));
    return {
      vivas: colunas.length - fechadas.length,
      fechadasComGente: fechadas.length,
      pessoasPresas: new Set(
        membros.filter((m) => idsFechados.has(m.equipe_id)).map((m) => m.user_id),
      ).size,
    };
  }, [clusters, areasTodas, equipesTodas, membros]);

  return (
    <MetricCard
      title="Equipes"
      value={vivas}
      change={
        fechadasComGente === 0
          ? 'nenhuma desativada com gente dentro'
          : `${fechadasComGente} desativada${fechadasComGente === 1 ? '' : 's'} ainda com ${pessoasPresas} pessoa${pessoasPresas === 1 ? '' : 's'}`
      }
      icon={<Users className="h-5 w-5 text-primary" />}
      iconColor="bg-primary/15"
    />
  );
};
