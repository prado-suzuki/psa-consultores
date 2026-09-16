import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { DashboardClientesOsContent } from '@/pages/equipe/board/BoardDashboardClientesOs';
import { DashboardEmbedView } from '@/components/dashboards/DashboardEmbedView';

/**
 * "Dashboards", dentro do agrupador Gerencial da Tax (restrita a líder+ pela
 * LiderRoute).
 *
 * O H1 ERA "Gerencial" e virou "Dashboards" em 15/09/2026. O rótulo do menu já
 * tinha sido trocado antes — está escrito no `FiscalSidebar`: "Dashboards é a
 * tela que antes se chamava Gerencial (mesmo endereço, rótulo novo)" — e o
 * título da página não acompanhou. Ficava assim: você clicava em "Dashboards",
 * dentro de um grupo chamado "Gerencial", e chegava numa página que dizia
 * "Gerencial" — o filho com o nome do pai, e o menu discordando do cabeçalho.
 *
 * O PADRÃO DA CASA tem três formas, e esta é a terceira: no OSG Work o grupo é
 * rótulo puro, sem rota; no Digital Dev o grupo É uma página, com conteúdo
 * próprio que lista as ferramentas de dentro; aqui o grupo é ATALHO para o
 * primeiro filho, que é o principal. As três valem — o que não vale é o filho e
 * a página se chamarem coisas diferentes.
 *
 * A OSG Projetos tinha o MESMO defeito, pelo mesmo motivo, e saiu junto: o
 * título das duas vem de `@/config/textosDasTelas`, então o "Dashboards" desta
 * entrada é o que as duas exibem. O defeito nasceu de o texto ser escrito à mão
 * em cada arquivo — corrigir só de um lado teria sido consertar metade dele.
 *
 * Um seletor só, no formato do Board → Relatórios: a primeira opção é o
 * dashboard nativo de Clientes e OS, as demais são os relatórios do Looker
 * cadastrados com target_page = "tax_gerencial" em /equipe/acessos.
 *
 * Clientes e OS já vêm escopados por cluster pela RLS; a aba de projetos
 * (org_projects, cuja RLS segue a regra de projetos, não o cluster) é restrita
 * aos clientes visíveis via scopeProjetosAClientesVisiveis. Os relatórios do
 * Looker devem ser cadastrados com filter_type = "cluster", senão a tela mostra
 * dado de fora do cluster e desmente o subtítulo.
 */
const FiscalGerencial = () => (
  <FiscalLayout tela="dashboardsGerencial">
    <DashboardEmbedView
      targetPage="tax_gerencial"
      loadingOverlay
      nativo={{
        nome: 'Clientes e OS',
        conteudo: <DashboardClientesOsContent scopeProjetosAClientesVisiveis />,
      }}
    />
  </FiscalLayout>
);

export default FiscalGerencial;
