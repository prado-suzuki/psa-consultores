import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { DashboardDistributions } from '@/components/gestao/chamados-dashboard/DashboardDistributions';
import { DashboardFilters } from '@/components/gestao/chamados-dashboard/DashboardFilters';
import { DashboardKpis } from '@/components/gestao/chamados-dashboard/DashboardKpis';
import { DashboardRankings } from '@/components/gestao/chamados-dashboard/DashboardRankings';
import { TaxTopicsCloud } from '@/components/gestao/chamados-dashboard/TaxTopicsCloud';
import { Button } from '@/components/ui/button';
import { useAllActiveAreas, useAllActiveClusters } from '@/hooks/useEstruturaAreas';
import { useEquipePorPessoa } from '@/hooks/useEstruturaEquipes';
import { useTicketAgents, useTicketsFirstResponse, useTicketsList } from '@/hooks/useTickets';
import { DashboardPrazoDetalhe } from '@/components/gestao/chamados-dashboard/DashboardPrazoDetalhe';
import {
  calculateDashboardAnalytics,
  type DashboardFilters as Filters,
  filterDashboardTickets,
  listarChamadosPorPrazo,
  rankingAtrasoPorPessoa,
  type RecortePrazo,
} from '@/lib/gestaoChamadosDashboardAnalytics';

const initialFilters: Filters = {
  // A tela abre na série inteira do canal, não numa janela móvel: a pergunta que
  // ela responde é "como está o atendimento deste cliente desde que a ferramenta
  // começou", e 30 dias escondia o histórico que sustenta essa resposta.
  periodo: 'canal',
  cliente: 'todos',
  departamento: 'todos',
  area: 'todos',
  cluster: 'todos',
};

/**
 * Dashboard de Chamados.
 *
 * O miolo vive separado da moldura pelo mesmo motivo do `ChamadosGestaoContent`:
 * a tela é montada na área de Gestão, na Gerencial da Tax e na da OSG, e presa
 * ao `GestaoLayout` ela arrastava o menu da Gestão para dentro das outras áreas.
 *
 * O botão "Lista de chamados" passou do cabeçalho do layout para dentro do
 * conteúdo. Como cabeçalho é da moldura, e a moldura agora muda conforme o
 * lugar, mantê-lo lá exigiria que as três áreas soubessem desse botão.
 */
export interface ChamadosDashboardContentProps {
  /** Endereço da LISTA de chamados correspondente a esta montagem. */
  listaPath: string;
}

export function ChamadosDashboardContent({ listaPath }: ChamadosDashboardContentProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [recorte, setRecorte] = useState<RecortePrazo | null>(null);
  const { data: tickets = [], isLoading: loadingTickets } = useTicketsList();
  const { data: agents = [] } = useTicketAgents();
  const { data: firstResponseMap } = useTicketsFirstResponse();
  const { data: areas = [] } = useAllActiveAreas();
  const { data: clusters = [] } = useAllActiveClusters();
  const { data: equipePorPessoa } = useEquipePorPessoa();

  const agentNames = useMemo(
    () =>
      new Map(
        agents.map((agent) => [
          agent.id,
          `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || '—',
        ]),
      ),
    [agents],
  );
  const areaNames = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), [areas]);
  // Os clientes do filtro saem dos próprios chamados carregados, não de uma
  // consulta à parte: assim a lista nunca oferece um cliente que não tem chamado
  // nenhum, e não custa uma requisição a mais.
  const clientes = useMemo(
    () =>
      Array.from(
        new Set(tickets.flatMap((ticket) => (ticket.cliente_nome ? [ticket.cliente_nome] : []))),
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [tickets],
  );
  const filteredTickets = useMemo(
    () => filterDashboardTickets(tickets, filters, new Date()),
    [tickets, filters],
  );
  const analytics = useMemo(
    () =>
      calculateDashboardAnalytics(
        filteredTickets,
        firstResponseMap,
        agentNames,
        areaNames,
        equipePorPessoa ?? new Map(),
      ),
    [filteredTickets, firstResponseMap, agentNames, areaNames, equipePorPessoa],
  );
  const chamadosPorPrazo = useMemo(() => {
    const now = new Date();
    return {
      fora: listarChamadosPorPrazo(filteredTickets, firstResponseMap, agentNames, 'fora', now),
      sem_resposta: listarChamadosPorPrazo(
        filteredTickets,
        firstResponseMap,
        agentNames,
        'sem_resposta',
        now,
      ),
    };
  }, [filteredTickets, firstResponseMap, agentNames]);
  const rankingAtrasos = useMemo(
    () => rankingAtrasoPorPessoa(chamadosPorPrazo.fora),
    [chamadosPorPrazo],
  );
  const openTickets = () => navigate(listaPath);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={openTickets}
          className="border-border text-muted-foreground hover:bg-muted"
        >
          <ListChecks className="mr-2 h-4 w-4" />
          Lista de chamados
        </Button>
      </div>
      <DashboardFilters
        filters={filters}
        clientes={clientes}
        areas={areas}
        clusters={clusters}
        onChange={setFilters}
      />
      <DashboardKpis
        stats={analytics.stats}
        periodo={filters.periodo}
        loading={loadingTickets || firstResponseMap === undefined}
        recorte={recorte}
        onRecorteToggle={(alvo) => setRecorte((atual) => (atual === alvo ? null : alvo))}
      />
      {recorte && (
        <DashboardPrazoDetalhe
          recorte={recorte}
          onRecorteChange={setRecorte}
          onClose={() => setRecorte(null)}
          foraDoPrazo={chamadosPorPrazo.fora}
          semResposta={chamadosPorPrazo.sem_resposta}
          onNavigate={(ticketId) => navigate(`${listaPath}/${ticketId}`)}
        />
      )}
      <DashboardDistributions
        total={analytics.stats.total}
        statusSegments={analytics.statusSegments}
        departmentSegments={analytics.departmentSegments}
        onOpenTickets={openTickets}
      />
      <DashboardRankings
        responsaveis={analytics.rankingResponsaveis}
        clientes={analytics.rankingClientes}
        representantes={analytics.rankingRepresentantes}
        departamentos={analytics.rankingDepartamentos}
        areas={analytics.rankingAreas}
        equipes={analytics.rankingEquipes}
        atrasos={rankingAtrasos}
      />
      <TaxTopicsCloud topics={analytics.taxTopics} totalTickets={filteredTickets.length} />
    </div>
  );
}

/** Rota da área de Gestão: o mesmo miolo dentro da moldura de sempre. */
export default function GestaoChamadosDashboard() {
  return (
    <GestaoLayout
      title="Dashboard de Chamados"
      subtitle="Panorama operacional, prazos e responsáveis"
    >
      <ChamadosDashboardContent listaPath="/gestao/chamados" />
    </GestaoLayout>
  );
}
