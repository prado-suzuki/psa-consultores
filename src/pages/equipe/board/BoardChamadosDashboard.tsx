import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { ChamadosDashboardContent } from '@/pages/gestao/GestaoChamadosDashboard';

/**
 * Dashboard de Chamados no Board — a visão de atendimento que faltava ao sócio.
 *
 * É o MESMO componente da Gerencial da Tax e da OSG: KPIs de tempo de primeira
 * resposta e de resolução, distribuição por status e departamento, e os cinco
 * rankings (responsáveis, clientes, representantes, departamentos, áreas).
 *
 * A diferença é só o escopo, que vem da RLS de `tickets`: aqui o admin vê todas
 * as áreas somadas. O filtro de cluster dentro da tela continua disponível para
 * recortar Tax × OSG sem sair do Board.
 */
const BoardChamadosDashboard = () => (
  <BoardLayout title="Dashboard de Chamados" subtitle="Panorama de atendimento, prazos e responsáveis">
    <ChamadosDashboardContent listaPath="/equipe/board/chamados" />
  </BoardLayout>
);

export default BoardChamadosDashboard;
