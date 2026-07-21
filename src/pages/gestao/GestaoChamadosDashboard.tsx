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
import { useTicketAgents, useTicketsFirstResponse, useTicketsList } from '@/hooks/useTickets';
import {
  calculateDashboardAnalytics,
  type DashboardFilters as Filters,
  filterDashboardTickets,
} from '@/lib/gestaoChamadosDashboardAnalytics';

const initialFilters: Filters = {
  periodo: '30dias',
  departamento: 'todos',
  area: 'todos',
  cluster: 'todos',
};

export default function GestaoChamadosDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const { data: tickets = [], isLoading: loadingTickets } = useTicketsList();
  const { data: agents = [] } = useTicketAgents();
  const { data: firstResponseMap } = useTicketsFirstResponse();
  const { data: areas = [] } = useAllActiveAreas();
  const { data: clusters = [] } = useAllActiveClusters();

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
  const filteredTickets = useMemo(
    () => filterDashboardTickets(tickets, filters, new Date()),
    [tickets, filters],
  );
  const analytics = useMemo(
    () => calculateDashboardAnalytics(filteredTickets, firstResponseMap, agentNames, areaNames),
    [filteredTickets, firstResponseMap, agentNames, areaNames],
  );
  const openTickets = () => navigate('/gestao/chamados');

  return (
    <GestaoLayout
      title="Dashboard de Chamados"
      subtitle="Panorama operacional, prazos e responsáveis"
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={openTickets}
          className="border-border text-muted-foreground hover:bg-muted"
        >
          <ListChecks className="mr-2 h-4 w-4" />
          Lista de chamados
        </Button>
      }
    >
      <div className="space-y-6">
        <DashboardFilters
          filters={filters}
          areas={areas}
          clusters={clusters}
          onChange={setFilters}
        />
        <DashboardKpis
          stats={analytics.stats}
          periodo={filters.periodo}
          loading={loadingTickets || firstResponseMap === undefined}
        />
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
        />
        <TaxTopicsCloud topics={analytics.taxTopics} totalTickets={filteredTickets.length} />
      </div>
    </GestaoLayout>
  );
}
