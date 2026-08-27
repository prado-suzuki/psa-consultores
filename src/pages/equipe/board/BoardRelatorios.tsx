import { useMemo } from "react";
import { BoardLayout } from "@/components/equipe/board/BoardLayout";
import { DashboardEmbedView } from "@/components/dashboards/DashboardEmbedView";
import { useAccessibleDashboards } from "@/hooks/useAccessibleDashboards";
import { useRegistrarContextoAgente } from "@/hooks/useAgenteContexto";
import { contextoBoardDashboards } from "@/lib/agenteContextoDashboards";

/**
 * Biblioteca de dashboards do Board → Relatórios (DB-driven).
 *
 * Lista vem da tabela `dashboards` (cadastro em /equipe/acessos → Dashboards)
 * filtrada pelos acessos do usuário; o filtro RLS é resolvido server-side por
 * usuário (fail-closed). Cadastre relatórios com target_page = "board_relatorios".
 */
const BoardRelatorios = () => {
  // A MESMA consulta que o `DashboardEmbedView` faz -- mesma chave de cache,
  // sem requisicao extra. O agente nao le o conteudo do iframe, e o snapshot
  // existe justamente para ele saber DIZER ISSO com precisao, em vez de
  // responder "esta tela nao publica numeros", que soa como defeito.
  const { data: dashboards = [], isLoading, error } = useAccessibleDashboards('board_relatorios');

  const contextoAgente = useMemo(() => contextoBoardDashboards({
    dashboards: dashboards.map((d) => ({
      name: d.name, filter_type: d.filter_type, sop_url: d.sop_url,
    })),
    // A selecao vive dentro do `DashboardEmbedView` (estado local dele). Sem
    // levantar aquele estado, o honesto e nao afirmar qual esta aberto.
    selecionado: null,
    carregando: isLoading,
    falhas: error ? ['biblioteca de dashboards'] : [],
  }), [dashboards, isLoading, error]);
  useRegistrarContextoAgente('board.dashboards', contextoAgente, isLoading);

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
