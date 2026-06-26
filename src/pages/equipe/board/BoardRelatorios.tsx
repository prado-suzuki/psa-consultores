import { BoardLayout } from "@/components/equipe/board/BoardLayout";
import { DashboardEmbedView } from "@/components/dashboards/DashboardEmbedView";

/**
 * Biblioteca de dashboards do Board → Relatórios (DB-driven).
 *
 * Lista vem da tabela `dashboards` (cadastro em /equipe/acessos → Dashboards)
 * filtrada pelos acessos do usuário; o filtro RLS é resolvido server-side por
 * usuário (fail-closed). Cadastre relatórios com target_page = "board_relatorios".
 */
const BoardRelatorios = () => {
  return (
    <BoardLayout title="Dashboards">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "var(--board-t1)" }}>
          Dashboards
        </h1>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--board-t3)" }}>
          Relatórios interativos do Looker Studio.
        </p>
      </div>

      <DashboardEmbedView
        targetPage="board_relatorios"
        emptyMessage="Nenhum relatório liberado para o seu usuário nesta área."
        loadingOverlay
      />
    </BoardLayout>
  );
};

export default BoardRelatorios;
