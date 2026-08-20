import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EquipeChamadosFilters } from '@/components/chamados/equipe/EquipeChamadosFilters';
import { EquipeChamadosStats } from '@/components/chamados/equipe/EquipeChamadosStats';
import { EquipeChamadosTable } from '@/components/chamados/equipe/EquipeChamadosTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCanAssignTickets } from '@/hooks/useCanAssignTickets';
import { useAllActiveAreas, useAllActiveClusters } from '@/hooks/useEstruturaAreas';
import { useAssignTicket } from '@/hooks/useTicketMutations';
import { useTicketsList } from '@/hooks/useTickets';
import { useToast } from '@/hooks/use-toast';
import { useUserEstrutura } from '@/hooks/useUserEstrutura';
import { useDomainClusterPorCategoria } from '@/hooks/useDomainClusterPorCategoria';
import { ESPELHO, PARAM_DE_ESPELHO } from '@/lib/areaTheme';
import type { PageCategory } from '@/lib/clusterPorCategoria';
import { createEquipeChamadosFilters, filterAndSortTickets, getTicketStats } from '@/lib/equipeChamados';
import type { SortColumn, SortDirection } from '@/lib/equipeChamados';

export default function EquipeChamados() {
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/equipe';
  const { user } = useAuth();
  const { toast } = useToast();
  const canAssignTickets = useCanAssignTickets();
  const { clusters: userClusters } = useUserEstrutura();
  const { data: tickets = [], isLoading: loading } = useTicketsList({ assignedTo: user?.id, filterAssigned: !canAssignTickets });
  const { data: areasData = [] } = useAllActiveAreas();
  const { data: clustersData = [] } = useAllActiveClusters();
  const assignTicket = useAssignTicket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const defaultCluster = userClusters.length === 1 ? userClusters[0].id : 'todos';
  const [filters, setFilters] = useState(() => createEquipeChamadosFilters(defaultCluster));
  const [mostrarUrgentes, setMostrarUrgentes] = useState(false);

  // ─── Espelhamento ───────────────────────────────────────────────────────
  // Esta tela é UMA, e se apresenta como sendo do ambiente de onde foi aberta.
  // `?area=osg` a torna a tela de chamados da OSG: tema musgo E lista da OSG.
  //
  // COR E CONTEÚDO ANDAM SEMPRE JUNTOS — nunca teal mostrando OSG, nunca
  // mostrando tudo estando musgo. O que garante isso é a chave ser UMA SÓ: a
  // mesma categoria resolve o tema (em `areaTheme.ts`, síncrono, antes da
  // pintura) e o cluster da lista (aqui, por query). Ver o bloco de
  // espelhamento em `src/lib/areaTheme.ts`.
  const [searchParams] = useSearchParams();
  const chaveBruta = searchParams.get(PARAM_DE_ESPELHO);
  const espelho = chaveBruta && chaveBruta in ESPELHO ? (chaveBruta as PageCategory) : null;
  const { clusterId: clusterDoEspelho, isLoading: resolvendoEspelho } =
    useDomainClusterPorCategoria(espelho);

  // Sincroniza SÓ o filtro de cluster, e não por `key` no componente: `key`
  // remontaria a tela inteira a cada troca de espelho e jogaria fora ordenação,
  // busca e rolagem. Aqui o resto do estado sobrevive.
  useEffect(() => {
    if (!espelho || !clusterDoEspelho) return;
    setFilters((f) => (f.cluster === clusterDoEspelho ? f : { ...f, cluster: clusterDoEspelho }));
  }, [espelho, clusterDoEspelho]);

  const areaMap = useMemo(() => new Map(areasData.map((area) => [area.id, area.name])), [areasData]);
  const clusterMap = useMemo(() => new Map(clustersData.map((cluster) => [cluster.id, cluster.name])), [clustersData]);
  const filteredTickets = useMemo(
    () => filterAndSortTickets(tickets, filters, mostrarUrgentes, sortColumn, sortDirection),
    [tickets, filters, mostrarUrgentes, sortColumn, sortDirection],
  );
  const stats = useMemo(() => getTicketStats(tickets), [tickets]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const handleAssignAgent = async (ticketId: string, agentId: string | null, agentName: string | null) => {
    try {
      await assignTicket.mutateAsync({ ticketId, agentId, agentName });
      toast({
        title: 'Agente atribuído',
        description: agentId && agentName ? `Chamado atribuído a ${agentName}` : 'Atribuição removida',
      });
    } catch {
      toast({ title: 'Erro ao atribuir agente', description: 'Tente novamente mais tarde.', variant: 'destructive' });
    }
  };

  const resetFilters = () => {
    // Espelhada, "limpar" limpa tudo MENOS o escopo: o espelho não é um filtro
    // que o usuário pôs, é onde a tela está.
    const base = createEquipeChamadosFilters(userClusters.length === 1 ? userClusters[0].id : 'todos');
    setFilters(espelho && clusterDoEspelho ? { ...base, cluster: clusterDoEspelho } : base);
    setMostrarUrgentes(false);
  };

  // O estado vazio NOMEIA o escopo. "Nenhum chamado" e "nenhum chamado em OSG"
  // são mensagens diferentes, e só a segunda prova que o filtro agiu — sem ela
  // uma tela vazia parece defeito, e ninguém distingue "filtrou e não achou" de
  // "quebrou". Hoje é a única confirmação VISÍVEL de que o espelhamento
  // funciona, porque só o cluster TAX tem chamados.
  const nomeDoEscopo = clusterDoEspelho ? clusterMap.get(clusterDoEspelho) ?? null : null;
  const mensagemVazia = espelho
    ? `Nenhum chamado em ${nomeDoEscopo ?? espelho.toUpperCase()}.`
    : tickets.length === 0
      ? (canAssignTickets ? 'Nenhum chamado encontrado.' : 'Você não possui chamados atribuídos no momento.')
      : 'Nenhum chamado encontrado com os filtros selecionados.';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 border-b border-slate-200/60 bg-white flex items-center px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(backTo)} className="text-slate-600 hover:text-teal-600 hover:bg-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" />Voltar
          </Button>
          <div>
            {/* Título fixo, casando com a rota /equipe/chamados. "Gestão de Chamados"
                é o nome da tela de /gestao/chamados (chamados dos clientes) — repetir
                aqui confundia as duas. O papel aparece no subtítulo. */}
            <h1 className="text-xl font-bold text-slate-900">Chamados da Equipe</h1>
            <p className="text-sm text-slate-500">
              {canAssignTickets ? 'Visualize todos os chamados e atribua responsáveis' : 'Visualize e responda os chamados atribuídos a você'}
            </p>
          </div>
        </div>
      </header>
      <main className="p-6">
        <EquipeChamadosStats stats={stats} />
        <EquipeChamadosFilters
          filters={filters}
          onFiltersChange={setFilters}
          mostrarUrgentes={mostrarUrgentes}
          onMostrarUrgentesChange={setMostrarUrgentes}
          areas={areasData}
          clusters={canAssignTickets ? clustersData : userClusters}
          filteredCount={filteredTickets.length}
          totalCount={tickets.length}
          onReset={resetFilters}
          clusterTravado={espelho !== null}
        />
        {/* `resolvendoEspelho` entra no mesmo gate do carregamento: enquanto o
            cluster do espelho não resolveu, a lista ainda está sem recorte, e
            mostrá-la seria exibir conteúdo de todos os clusters já com a cor de
            um só — a divergência que esta tela existe para não ter. */}
        {loading || resolvendoEspelho ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
        ) : filteredTickets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{mensagemVazia}</p>
          </Card>
        ) : (
          <EquipeChamadosTable
            tickets={filteredTickets}
            canAssignTickets={canAssignTickets}
            areaMap={areaMap}
            clusterMap={clusterMap}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onNavigate={(ticketId) => navigate(`/equipe/chamados/${ticketId}`)}
            onAssign={handleAssignAgent}
            scrollRef={scrollRef}
          />
        )}
      </main>
    </div>
  );
}
