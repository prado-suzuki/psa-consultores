import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { DashboardEmbedView } from "@/components/dashboards/DashboardEmbedView";

/**
 * Dashboards internos do Digital DEV (gestão de dados) — DB-driven, COM controle
 * de acesso mas SEM RLS (cadastre com filter_type = "nenhum" e target_page =
 * "dev_gerenciar_dados"). A lista respeita os acessos concedidos em
 * /equipe/acessos → Usuários.
 */
const GerenciarDadosDashboards = () => {
  return (
    <DevLayout tela="dashboardsGerenciarDados">
      <DashboardEmbedView
        targetPage="dev_gerenciar_dados"
        emptyMessage="Nenhum dashboard liberado para o seu usuário aqui."
      />
    </DevLayout>
  );
};

export default GerenciarDadosDashboards;
