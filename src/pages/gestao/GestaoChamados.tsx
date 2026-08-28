import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDomainClusterPorCategoria } from '@/hooks/useDomainClusterPorCategoria';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardChamados } from '@/lib/agenteContextoChamados';
import type { ChaveDeEspelho } from '@/lib/areaTheme';
import { useTicketsList, useTicketAgents } from '@/hooks/useTickets';
import { useAllActiveAreas, useAllActiveClusters } from '@/hooks/useEstruturaAreas';
import { useAssignTicket, useUpdateTicketDeadline, useDeleteTickets } from '@/hooks/useTicketMutations';
import { CreateTicketDialog } from '@/components/gestao/CreateTicketDialog';
import { ClienteSemProjetoChamadosAlert } from '@/components/gestao/ClienteSemProjetoChamadosAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';
import { ArrowUp, ArrowDown, ArrowUpDown, Paperclip, MessageSquare, AlertTriangle, Clock, CheckCircle, Plus, Download, Trash2, BarChart3 } from 'lucide-react';
import { format, isWithinInterval, subDays, addDays, differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { isTodayBrazil, isTomorrowBrazil, isPastBrazil, parseDate } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';
import { chamadoStatusConfig } from '@/lib/chamadoStatusColors';
import { departmentLabels } from '@/lib/chamadosDepartamentos';

const deadlineOptions: Record<string, string> = {
  'none': 'Sem prazo',
  '1': '1 dia',
  '3': '3 dias',
  '5': '5 dias',
  '7': '7 dias',
  '10': '10 dias',
  '15': '15 dias',
};

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'status' | 'title' | 'department' | 'created_by' | 'updated_at' | 'activity_status' | null;

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};


/**
 * Tela de Gestao de Chamados.
 *
 * O miolo (`ChamadosGestaoContent`) vive separado da moldura porque a mesma
 * tela e montada em tres lugares: aqui, na Gerencial da Tax e na da OSG. Preso
 * ao `GestaoLayout`, ele arrastava junto o menu inteiro da area de Gestao — o
 * lider abria a tela dentro da Tax e via a barra lateral do Marketing.
 *
 * Mesmo padrao do `DashboardClientesOsContent`, ja reaproveitado em tres areas.
 */
export interface ChamadosGestaoContentProps {
  /**
   * Escopo do Agente PSA. VAZIO por padrão: esta tela vive em três rotas, e
   * publicar o escopo do Board na Tax faria o agente responder como se a
   * pessoa estivesse no Board — mesmo número, tela errada.
   */
  escopoAgente?: string;
  /**
   * Endereco onde a tela esta montada, para os links internos (detalhe do
   * chamado e dashboard). Sem isto, clicar em "Ver" dentro da Tax jogaria a
   * pessoa de volta para a area de Gestao.
   */
  basePath: string;
  /**
   * A área em que esta tela está montada — `'tax'`, `'osg'`, ou nada.
   *
   * O QUE ISSO CONSERTA. Esta tela vive em três rotas, e cada uma pega a cor da
   * sua área pelo resolvedor. Mas o RECORTE do que aparecia não vinha da rota:
   * vinha da RLS de `tickets`, que filtra pelos clusters DA PESSOA. Para quem tem
   * um cluster só as duas coisas coincidiam — por acidente, não por desenho. Para
   * os cinco admins, que a RLS não recorta, a tela da OSG mostrava os 335
   * chamados do TAX em musgo.
   *
   * Propriedade de correção que vale por coincidência quebra sozinha: basta
   * alguém entrar em duas equipes de clusters diferentes. E os subtítulos JÁ
   * prometiam o recorte — "Chamados dos clientes da sua carteira", "do seu
   * cluster".
   *
   * `undefined` é o caso do Board, e é legítimo: ele é o consolidado, e o
   * subtítulo dele diz "Chamados de todas as áreas".
   *
   * Sem parâmetro de URL aqui, diferente de `EquipeChamados`: a rota já é por
   * área, então o escopo é estático e o invólucro passa o literal.
   */
  escopo?: ChaveDeEspelho;
}

export function ChamadosGestaoContent({
  basePath, escopo, escopoAgente = '',
}: ChamadosGestaoContentProps) {
  const navigate = useNavigate();
  const { clusterId: clusterDoEscopo, isLoading: resolvendoEscopo } =
    useDomainClusterPorCategoria(escopo ?? null);

  const { data: tickets = [], isLoading: loading } = useTicketsList();
  const { data: agents = [] } = useTicketAgents();
  const { data: areasData = [] } = useAllActiveAreas();
  const { data: clustersData = [] } = useAllActiveClusters();

  const assignTicket = useAssignTicket();
  const updateDeadline = useUpdateTicketDeadline();
  const deleteTickets = useDeleteTickets();

  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    areasData.forEach(a => map.set(a.id, a.name));
    return map;
  }, [areasData]);

  const clusterMap = useMemo(() => {
    const map = new Map<string, string>();
    clustersData.forEach(c => map.set(c.id, c.name));
    return map;
  }, [clustersData]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Cliente do último chamado delegado nesta sessão da tela. É o que dá assunto
  // ao aviso de "cliente sem projeto de canal de chamados": sem guardar quem
  // acabou de ser delegado, não há a quem se referir.
  const [ultimoClienteDelegado, setUltimoClienteDelegado] = useState<
    { id: string; nome: string | null } | null
  >(null);
  const [filters, setFilters] = useState({
    periodo: 'todas',
    status: 'todos',
    departamento: 'todos',
    area: 'todos',
    cluster: 'todos',
    searchId: '',
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-1 h-4 w-4" />;
    }
    return <ArrowDown className="ml-1 h-4 w-4" />;
  };

  const filteredAndSortedTickets = useMemo(() => {
    let filtered = [...tickets];

    if (filters.periodo !== 'todas') {
      const now = new Date();
      filtered = filtered.filter(t => {
        const ticketDate = new Date(t.created_at);
        switch (filters.periodo) {
          case 'hoje':
            return isTodayBrazil(ticketDate);
          case '7dias':
            return isWithinInterval(ticketDate, { start: subDays(now, 7), end: now });
          case '30dias':
            return isWithinInterval(ticketDate, { start: subDays(now, 30), end: now });
          default:
            return true;
        }
      });
    }

    if (filters.status !== 'todos') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.departamento !== 'todos') {
      filtered = filtered.filter(t => t.department === filters.departamento);
    }

    if (filters.area !== 'todos') {
      filtered = filtered.filter(t => t.estrutura_area_id === filters.area);
    }

    if (filters.cluster !== 'todos') {
      filtered = filtered.filter(t => t.cluster_id === filters.cluster);
    }

    if (filters.searchId) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(filters.searchId.toLowerCase()) ||
        t.title.toLowerCase().includes(filters.searchId.toLowerCase())
      );
    }

    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortColumn) {
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'department':
            aVal = a.department || '';
            bVal = b.department || '';
            break;
          case 'created_by':
            aVal = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.toLowerCase();
            bVal = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`.toLowerCase();
            break;
          case 'updated_at':
            aVal = new Date(a.updated_at).getTime();
            bVal = new Date(b.updated_at).getTime();
            break;
          case 'activity_status':
            aVal = a.activity_status || '';
            bVal = b.activity_status || '';
            break;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [tickets, filters, sortColumn, sortDirection]);

  const handleAssignAgent = async (ticketId: string, agentId: string | null) => {
    const agent = agents.find(a => a.id === agentId);
    const ticket = tickets.find(t => t.id === ticketId);
    try {
      await assignTicket.mutateAsync({
        ticketId,
        agentId,
        agentName: agent ? `${agent.first_name} ${agent.last_name}` : null,
      });
      // Só delegação gera tarefa: remover a atribuição não gera nada e, por
      // isso, também não tem lacuna a avisar — o estado volta a nulo.
      setUltimoClienteDelegado(
        agentId && ticket?.cliente_id
          ? { id: ticket.cliente_id, nome: ticket.cliente_nome ?? null }
          : null,
      );
      toast({
        title: 'Agente atribuído',
        description: agentId 
          ? `Chamado atribuído a ${agent?.first_name} ${agent?.last_name}` 
          : 'Atribuição removida',
      });
    } catch {
      toast({
        title: 'Erro ao atribuir agente',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const handleSetDeadline = async (ticketId: string, createdAt: string, days: string) => {
    const deadline = days === 'none' ? null : format(addDays(new Date(createdAt), parseInt(days)), 'yyyy-MM-dd');
    try {
      await updateDeadline.mutateAsync({ ticketId, deadline });
      toast({ title: 'Prazo atualizado' });
    } catch {
      toast({ title: 'Erro ao atualizar prazo', variant: 'destructive' });
    }
  };

  const getDeadlineSelectValue = (ticket: { deadline: string | null; created_at: string }): string => {
    if (!ticket.deadline) return 'none';
    const days = differenceInCalendarDays(parseDate(ticket.deadline), new Date(ticket.created_at));
    const validOptions = ['1', '3', '5', '7', '10', '15'];
    return validOptions.includes(String(days)) ? String(days) : 'none';
  };

  const toggleSelectAll = () => {
    if (selectedTickets.length === filteredAndSortedTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredAndSortedTickets.map(t => t.id));
    }
  };

  const toggleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleExport = () => {
    const exportData = filteredAndSortedTickets.map(ticket => ({
      'ID': ticket.id.slice(0, 8),
      'Título': ticket.title,
      'Status': statusLabels[ticket.status] || ticket.status,
      'Departamento': departmentLabels[ticket.department] || ticket.department,
      'Representante': `${ticket.profiles?.first_name || ''} ${ticket.profiles?.last_name || ''}`.trim(),
      'Cliente': ticket.cliente_nome || '—',
      'Responsável': ticket.agent ? `${ticket.agent.first_name} ${ticket.agent.last_name}` : 'Não atribuído',
      'Prazo': ticket.deadline ? format(parseDate(ticket.deadline), 'dd/MM/yyyy') : '',
      'Criado em': format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm'),
      'Atualizado em': format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm'),
      'Fechado em': ticket.closed_at ? format(new Date(ticket.closed_at), 'dd/MM/yyyy HH:mm') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chamados');
    XLSX.writeFile(workbook, `chamados_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: 'Exportação concluída',
      description: `${exportData.length} chamado(s) exportado(s).`,
    });
  };

  const handleDeleteTickets = async () => {
    if (selectedTickets.length === 0) return;

    try {
      await deleteTickets.mutateAsync({ ticketIds: selectedTickets });
      toast({
        title: 'Chamados excluídos',
        description: `${selectedTickets.length} chamado(s) excluído(s) com sucesso.`,
      });
      setSelectedTickets([]);
      setDeleteDialogOpen(false);
    } catch {
      toast({
        title: 'Erro ao excluir chamados',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  /**
   * O universo da tela: os chamados do CLUSTER da área onde ela está montada.
   *
   * Mesmos três níveis da `EquipeChamados`: `tickets` (o que a RLS entregou), este
   * (o escopo da rota) e `filteredAndSortedTickets` (os filtros do usuário). Os
   * cartões ficam neste, não no primeiro — número no topo afirmando escopo que a
   * lista não tem é o defeito que esta prop existe para fechar.
   *
   * Escopo declarado e ainda não resolvido devolve vazio: zero nunca afirma
   * escopo que não existe.
   */
  const ticketsDoEscopo = useMemo(() => {
    if (!escopo) return tickets;
    if (!clusterDoEscopo) return [];
    return tickets.filter(t => t.cluster_id === clusterDoEscopo);
  }, [tickets, escopo, clusterDoEscopo]);

  // Sincroniza SÓ o filtro de cluster — o resto do estado do usuário sobrevive.
  useEffect(() => {
    if (!escopo || !clusterDoEscopo) return;
    setFilters(f => (f.cluster === clusterDoEscopo ? f : { ...f, cluster: clusterDoEscopo }));
  }, [escopo, clusterDoEscopo]);

  // `useMemo` e nao objeto literal: sem isso, `stats` ganha identidade nova a
  // cada render e qualquer memoizacao que dependa dele recalcula sempre --
  // inclusive o snapshot do agente, logo abaixo.
  const stats = useMemo(() => ({
    total: ticketsDoEscopo.length,
    abertos: ticketsDoEscopo.filter(t => t.status === 'aberto').length,
    emAndamento: ticketsDoEscopo.filter(t => t.status === 'em_andamento').length,
    resolvidos: ticketsDoEscopo.filter(t => t.status === 'resolvido' || t.status === 'fechado').length,
  }), [ticketsDoEscopo]);
  const nomeDoEscopo = clusterDoEscopo
    ? clustersData.find(c => c.id === clusterDoEscopo)?.name ?? null
    : null;

  // ── O que o Agente PSA le desta tela ─────────────────────────────────
  // O MESMO `stats` dos cartoes do topo, mais o que a tabela mostra e o
  // cartao nao resume: prazo estourado, chamado sem dono e area.
  const contextoAgente = useMemo(() => (escopoAgente ? contextoBoardChamados({
    escopoLabel: nomeDoEscopo ?? 'todas as áreas do seu acesso',
    stats,
    chamados: ticketsDoEscopo.map(t => ({
      status: t.status,
      priority: t.priority ?? null,
      deadline: t.deadline ?? null,
      assigned_to: t.assigned_to ?? null,
      estrutura_area_id: t.estrutura_area_id ?? null,
      activity_status: t.activity_status ?? null,
    })),
    areaPorId: Object.fromEntries(areaMap),
    hoje: new Date().toISOString().slice(0, 10),
    carregando: loading,
  }) : null), [
    escopoAgente, nomeDoEscopo, stats, ticketsDoEscopo, areaMap, loading,
  ]);
  useRegistrarContextoAgente(escopoAgente, contextoAgente, loading);

  const deleting = deleteTickets.isPending;

  return (
    <>
      {/* Delegou e o cliente não tem projeto de canal de chamados: a tarefa da
          EDU-11 não nasceu, e só este aviso conta isso. */}
      <ClienteSemProjetoChamadosAlert
        clienteId={ultimoClienteDelegado?.id}
        clienteNome={ultimoClienteDelegado?.nome}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total</CardDescription>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Abertos</CardDescription>
              <AlertTriangle className="h-4 w-4 text-info" />
            </div>
            <CardTitle className="text-3xl text-info">{stats.abertos}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Em Andamento</CardDescription>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <CardTitle className="text-3xl text-warning">{stats.emAndamento}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Resolvidos</CardDescription>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <CardTitle className="text-3xl text-success">{stats.resolvidos}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filters.periodo} onValueChange={(v) => setFilters({...filters, periodo: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as datas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as datas</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={filters.departamento} onValueChange={(v) => setFilters({...filters, departamento: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(departmentLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={filters.area} onValueChange={(v) => setFilters({...filters, area: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {areasData.map((area) => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cluster</Label>
              {/* Travado quando a tela tem escopo: o cluster não é filtro que o
                  usuário pôs, é a área onde a tela está montada. Sem a trava a
                  correção dura até o primeiro clique. */}
              <Select value={filters.cluster} disabled={!!escopo}
                onValueChange={(v) => setFilters({...filters, cluster: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clustersData.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="ID ou título..."
                value={filters.searchId}
                onChange={(e) => setFilters({...filters, searchId: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-primary hover:bg-primary text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Chamado
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`${basePath}/dashboard`)}
          className="border-border text-muted-foreground hover:bg-muted"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          className="border-border text-muted-foreground hover:bg-muted"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        {selectedTickets.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="border-destructive/20 text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({selectedTickets.length})
          </Button>
        )}
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chamados</CardTitle>
          <CardDescription>
            {filteredAndSortedTickets.length} chamado(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
            <Table containerRef={scrollRef}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTickets.length === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                    <div className="flex items-center">
                      Título {getSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('department')}>
                    <div className="flex items-center">
                      Departamento {getSortIcon('department')}
                    </div>
                  </TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('created_by')}>
                    <div className="flex items-center">
                      Representante {getSortIcon('created_by')}
                    </div>
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('updated_at')}>
                    <div className="flex items-center">
                      Atualização {getSortIcon('updated_at')}
                    </div>
                  </TableHead>
                  <TableHead>Fechado em</TableHead>
                  <TableHead className="sticky right-0 bg-background z-10 border-l border-border shadow-[-4px_0_10px_rgba(0,0,0,0.04)] w-[80px] min-w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* O vazio NOMEIA o escopo. "Nenhum chamado" e "nenhum chamado em
                    OSG" são mensagens diferentes, e só a segunda mostra que o
                    recorte agiu. Antes não havia mensagem nenhuma: a tabela ficava
                    só com o cabeçalho, e vazio sem explicação parece defeito. */}
                {!loading && !resolvendoEscopo && filteredAndSortedTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="py-12 text-center text-muted-foreground">
                      {escopo
                        ? `Nenhum chamado em ${nomeDoEscopo ?? escopo.toUpperCase()}.`
                        : 'Nenhum chamado encontrado com os filtros selecionados.'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredAndSortedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTickets.includes(ticket.id)}
                        onCheckedChange={() => toggleSelectTicket(ticket.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={chamadoStatusConfig(ticket.status).solid}>
                        {statusLabels[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        {ticket.title}
                        {ticket.attachment_count && ticket.attachment_count > 0 && (
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {departmentLabels[ticket.department] || ticket.department}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.estrutura_area_id ? areaMap.get(ticket.estrutura_area_id) || '—' : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.cluster_id ? clusterMap.get(ticket.cluster_id) || '—' : '—'}
                    </TableCell>
                    <TableCell>
                      {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.cliente_nome || '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={ticket.assigned_to || 'none'}
                        onValueChange={(v) => handleAssignAgent(ticket.id, v === 'none' ? null : v)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Atribuir" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não atribuído</SelectItem>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.first_name} {agent.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Select
                          value={getDeadlineSelectValue(ticket)}
                          onValueChange={(v) => handleSetDeadline(ticket.id, ticket.created_at, v)}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue placeholder="Prazo" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(deadlineOptions).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {ticket.deadline && (() => {
                          const deadlineDate = parseDate(ticket.deadline);
                          const isClosed = ticket.status === 'fechado' || ticket.status === 'resolvido';
                          const isPast = isPastBrazil(deadlineDate);
                          const isToday = isTodayBrazil(deadlineDate);
                          const isTomorrow = isTomorrowBrazil(deadlineDate);
                          const colorClass = isClosed
                            ? 'text-muted-foreground'
                            : isPast
                              ? 'text-destructive font-semibold'
                              : (isToday || isTomorrow)
                                ? 'text-warning font-medium'
                                : 'text-success';
                          return (
                            <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
                              {!isClosed && isPast && <AlertTriangle className="h-3 w-3" />}
                              {format(deadlineDate, "dd/MM/yyyy (EEE)", { locale: ptBR })}
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {ticket.closed_at
                        ? format(new Date(ticket.closed_at), 'dd/MM/yyyy HH:mm')
                        : '—'}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-background z-10 border-l border-border shadow-[-4px_0_10px_rgba(0,0,0,0.04)] w-[80px] min-w-[80px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`${basePath}/${ticket.id}`)}
                        className="border-border text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <FloatingScrollbar targetRef={scrollRef} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {}}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Você está prestes a excluir {selectedTickets.length} chamado(s). Esta ação não pode ser desfeita.
              Todas as mensagens e anexos associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTickets}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive text-white"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Excluindo...
                </span>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
