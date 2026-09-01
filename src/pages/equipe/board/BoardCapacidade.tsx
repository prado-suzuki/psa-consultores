import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { AreaDashboardContent } from '@/components/equipe/area-dashboard/AreaDashboardContent';

/**
 * Capacidade — o dashboard de área do Tax e da OSG, somado, no Board.
 *
 * É o MESMO `AreaDashboardContent` das duas áreas, com `area="todas"`. Traz o que
 * o Board não tinha em nenhuma tela:
 *
 * - Workload por membro nos PRÓXIMOS 14 dias (o Operacional só tem os 90 dias
 *   passados) — quem vai estourar, não quem estourou;
 * - Carga por membro (ativas / horas / atrasadas) e a fila de tarefas atrasadas
 *   ordenada por dias de atraso, com cliente e responsável;
 * - Top clientes por HORAS consumidas — o outro lado do faturamento por cliente
 *   que Clientes e OS já mostra, e o insumo da conciliação contratado × entregue.
 *
 * Escopo: `useAreaDashboardController('todas')` pega as áreas das duas categorias
 * da estrutura; projeto sem área na estrutura é legado do Tax e entra. O recorte
 * final continua sendo o da RLS de `org_projects`/`org_tasks` — para o sócio, a
 * empresa inteira.
 */
const BoardCapacidade = () => (
  <BoardLayout title="Capacidade" subtitle="Carga à frente">
    <div className="pg-head">
      <div className="pg-title">Capacidade</div>
      <div className="pg-sub">14 dias · quem estoura</div>
    </div>
    <AreaDashboardContent area="todas" escopoAgente="board.capacidade" />
  </BoardLayout>
);

export default BoardCapacidade;
