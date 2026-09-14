import { FileText, Users, ShieldCheck } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';

/**
 * Três cartões de contagem no topo do Controle de Acessos.
 * Páginas ativas, total de usuários, permissões customizadas.
 * Dados via hooks compartilhados — React Query deduplica as requisições.
 *
 * Eram `<Card>` escritos à mão, e a seção Papéis — na MESMA tela, um clique ao
 * lado — já montava os quatro cartões dela com `MetricCard`. Dois desenhos de
 * cartão de contagem na mesma página: o ícone aqui era círculo de `p-2`, lá um
 * quadrado de 40px; o título aqui era `text-foreground`, lá `muted`.
 *
 * Passam a ser o mesmo componente. O que muda para quem olha é só isso: ícone
 * em quadrado arredondado, título em cinza, e a borda no valor cheio em vez de
 * 60%.
 */
export const AccessStatsCards = () => {
  const { data: pages } = usePagePermissions();
  const { data: users } = useUsersWithRoles();
  const { data: userAccess } = useUserPageAccess();

  const activePages = pages?.filter((p) => p.is_active).length ?? 0;
  const totalPages = pages?.length ?? 0;
  const totalUsers = users?.length ?? 0;
  const totalAccess = userAccess?.length ?? 0;

  /* O ponto de virada e `sm`/`xl`, e NAO `md`: abaixo de `md` a barra lateral
     e gaveta e o conteudo pega a viewport inteira, mas a partir de 768px ela
     volta ao fluxo e leva 256px. Em 768px cravados sobravam 464px de coluna,
     que com `md:grid-cols-3` dava 155px por cartao — 107px uteis depois do
     `p-6`, com "Permissoes Customizadas" quebrando em tres linhas. A largura
     que manda aqui e a da COLUNA, nao a da tela. */
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
      <MetricCard
        title="Permissões Customizadas"
        value={totalAccess}
        change="acessos individuais"
        icon={<ShieldCheck className="h-5 w-5 text-primary" />}
        iconColor="bg-primary/15"
      />
    </div>
  );
};
