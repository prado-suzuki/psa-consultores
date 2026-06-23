import { BoardLayout } from "@/components/equipe/board/BoardLayout";
import { DashboardEmbedView } from "@/components/dashboards/DashboardEmbedView";

/**
 * Biblioteca de dashboards do Board → Relatórios (DB-driven).
 *
 * A lista vem da tabela `dashboards` (cadastro em /equipe/acessos → Dashboards)
 * filtrada pelos acessos do usuário (RPC `get_accessible_dashboards`). O valor do
 * filtro RLS é resolvido server-side por usuário (fail-closed). Para incluir um
 * relatório aqui, cadastre-o com target_page = "board_relatorios".
 */
const BoardRelatorios = () => {
  return (
    <BoardLayout title="Dashboards" noPadding>
      <div className="px-[22px] md:px-6 lg:px-6 pt-[22px] md:pt-6 lg:pt-6 mb-5">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "var(--board-t1)" }}>
          Dashboards
        </h1>
        <div className="mt-4">
          <DashboardEmbedView
            targetPage="board_relatorios"
            emptyMessage="Nenhum relatório liberado para o seu usuário nesta área."
          />
        </div>
      </div>
    </BoardLayout>
  );
};

export default BoardRelatorios;
