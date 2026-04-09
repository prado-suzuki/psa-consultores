import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCanAssignTickets } from '@/hooks/useCanAssignTickets';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown, Paperclip } from 'lucide-react';
import { isWithinInterval, subDays, startOfMonth, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isTodayBrazil } from '@/lib/dateUtils';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to: string | null;
  activity_status: string | null;
  estrutura_area_id: string | null;
  profiles?: Profile;
  attachment_count?: number;
}

interface Area {
  id: string;
  name: string;
}

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'status' | 'title' | 'id' | 'department' | 'created_by' | 'updated_at' | 'prazo' | 'activity_status' | null;

interface PrazoInfo {
  dias?: number;
  horas?: number;
  prazoExpirado?: boolean;
  prazoHoje?: boolean;
  tipo: 'expirado' | 'urgente' | 'atencao' | 'normal' | 'concluido' | 'aguardando_cliente';
}

const calcularPrazoResposta = (
  dataCriacao: string, 
  dataAtualizacao: string,
  status: string, 
  activityStatus: string | null
): PrazoInfo => {
  if (status === 'resolvido' || status === 'fechado') {
    return { tipo: 'concluido' };
  }
  
  if (activityStatus === 'respondido') {
    return { tipo: 'aguardando_cliente' };
  }
  
  const prazoEmDias = 5;
  const hoje = new Date();
  const dataReferencia = new Date(activityStatus === 'aguardando_resposta' ? dataAtualizacao : dataCriacao);
  const prazoFinal = new Date(dataReferencia);
  prazoFinal.setDate(prazoFinal.getDate() + prazoEmDias);
  
  const diffTime = prazoFinal.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  
  return {
    dias: diffDays,
    horas: diffHours,
    prazoExpirado: diffTime < 0,
    prazoHoje: diffDays === 0 && diffTime > 0,
    tipo: diffTime < 0 ? 'expirado' : diffDays <= 1 ? 'urgente' : diffDays <= 2 ? 'atencao' : 'normal'
  };
};

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-500 hover:bg-blue-600',
  em_andamento: 'bg-yellow-500 hover:bg-yellow-600',
  resolvido: 'bg-green-500 hover:bg-green-600',
  fechado: 'bg-gray-500 hover:bg-gray-600',
};

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const activityLabels: Record<string, string> = {
  aguardando_resposta: 'Aguardando resposta',
  respondido: 'Respondido',
  em_analise: 'Em análise',
};

const activityColors: Record<string, string> = {
  aguardando_resposta: 'bg-orange-100 text-orange-800',
  respondido: 'bg-green-100 text-green-800',
  em_analise: 'bg-blue-100 text-blue-800',
};

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

export default function EquipeChamados() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canAssignTickets = useCanAssignTickets();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaMap, setAreaMap] = useState<Map<string, string>>(new Map());
  const [filters, setFilters] = useState({
    periodo: 'todas',
    status: 'todos',
    prioridade: 'todas',
    departamento: 'todos',
    area: 'todos',
    searchId: '',
  });
  const [mostrarUrgentes, setMostrarUrgentes] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
    fetchAreas();
  }, [user, canAssignTickets]);

  const fetchAreas = async () => {
    try {
      const { data } = await supabase
        .from('estrutura_areas')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      const list = data || [];
      setAreas(list);
      const map = new Map<string, string>();
      list.forEach(a => map.set(a.id, a.name));
      setAreaMap(map);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  useEffect(() => {
    if (canAssignTickets) {
      fetchAgents();
    }
  }, [canAssignTickets]);

  const fetchAgents = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['team_member', 'admin']);

      if (rolesData) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .in('id', userIds);

        setAgents(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchTickets = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('tickets')
        .select('id, title, description, status, priority, department, user_id, created_at, updated_at, assigned_to, activity_status, estrutura_area_id')
        .order('created_at', { ascending: false });
      
      // If user can assign (leader), show all tickets. Otherwise, show only assigned tickets.
      if (!canAssignTickets) {
        query = query.eq('assigned_to', user.id);
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;

      // Fetch profiles for creators
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profilesMap = new Map<string, Profile>();
      profilesData?.forEach(p => profilesMap.set(p.id, p));

      // Fetch attachment counts for all tickets
      const ticketIds = ticketsData?.map(t => t.id) || [];
      const { data: attachmentCounts } = await supabase
        .from('ticket_attachments')
        .select('ticket_id')
        .in('ticket_id', ticketIds);

      const attachmentCountMap = new Map<string, number>();
      attachmentCounts?.forEach(a => {
        attachmentCountMap.set(a.ticket_id, (attachmentCountMap.get(a.ticket_id) || 0) + 1);
      });
      
      const enrichedTickets: Ticket[] = ticketsData?.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status || 'aberto',
        priority: ticket.priority || 'normal',
        department: ticket.department || '',
        user_id: ticket.user_id,
        created_at: ticket.created_at || '',
        updated_at: ticket.updated_at || '',
        assigned_to: ticket.assigned_to || null,
        activity_status: ticket.activity_status || 'aguardando_resposta',
        estrutura_area_id: (ticket as any).estrutura_area_id || null,
        profiles: profilesMap.get(ticket.user_id),
        attachment_count: attachmentCountMap.get(ticket.id) || 0
      })) || [];

      setTickets(enrichedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignAgent = async (ticketId: string, agentId: string | null) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: agentId })
        .eq('id', ticketId);

      if (error) throw error;

      const agent = agents.find(a => a.id === agentId);
      toast({
        title: 'Agente atribuído',
        description: agentId 
          ? `Chamado atribuído a ${agent?.first_name} ${agent?.last_name}` 
          : 'Atribuição removida',
      });

      // Notificar cliente e responsável sobre atribuição (fire-and-forget)
      if (agentId) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_assigned',
            ticket_id: ticketId,
            actor_name: `${agent?.first_name} ${agent?.last_name}`,
          }
        }).catch(console.error);
      }

      // Invalidate notification cache
      queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
      
      fetchTickets();
    } catch (error) {
      toast({
        title: 'Erro ao atribuir agente',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };


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

    // Filtro por período
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
          case 'mes':
            return isWithinInterval(ticketDate, { start: startOfMonth(now), end: now });
          default:
            return true;
        }
      });
    }

    // Filtro por status
    if (filters.status !== 'todos') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Filtro por prioridade
    if (filters.prioridade !== 'todas') {
      filtered = filtered.filter(t => t.priority === filters.prioridade);
    }

    // Filtro por departamento
    if (filters.departamento !== 'todos') {
      filtered = filtered.filter(t => t.department === filters.departamento);
    }

    // Filtro por área
    if (filters.area !== 'todos') {
      filtered = filtered.filter(t => t.estrutura_area_id === filters.area);
    }

    // Filtro por ID
    if (filters.searchId) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(filters.searchId.toLowerCase())
      );
    }

    // Filtro de chamados urgentes
    if (mostrarUrgentes) {
      filtered = filtered.filter(t => {
        if (t.status === 'resolvido' || t.status === 'fechado') return false;
        const prazo = calcularPrazoResposta(t.created_at, t.updated_at, t.status, t.activity_status);
        return prazo.tipo === 'expirado' || (prazo.dias !== undefined && prazo.dias <= 2);
      });
    }

    // Ordenação
    if (sortColumn && sortDirection) {
      if (sortColumn === 'prazo') {
        const getPrioridade = (prazo: PrazoInfo) => {
          if (prazo.tipo === 'concluido') return 999;
          if (prazo.tipo === 'aguardando_cliente') return 998;
          if (prazo.tipo === 'expirado') return -(prazo.dias || 0);
          return prazo.dias || 0;
        };

        filtered.sort((a, b) => {
          const prazoA = calcularPrazoResposta(a.created_at, a.updated_at, a.status, a.activity_status);
          const prazoB = calcularPrazoResposta(b.created_at, b.updated_at, b.status, b.activity_status);
          const prioridadeA = getPrioridade(prazoA);
          const prioridadeB = getPrioridade(prazoB);

          return sortDirection === 'asc' 
            ? prioridadeA - prioridadeB 
            : prioridadeB - prioridadeA;
        });
      } else {
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
            case 'id':
              aVal = a.id;
              bVal = b.id;
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
    }

    return filtered;
  }, [tickets, filters, sortColumn, sortDirection, mostrarUrgentes]);

  const resetFilters = () => {
    setFilters({
      periodo: 'todas',
      status: 'todos',
      prioridade: 'todas',
      departamento: 'todos',
      area: 'todos',
      searchId: '',
    });
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/equipe')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à Seleção de Área
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              {canAssignTickets ? 'Gestão de Chamados' : 'Meus Chamados Atribuídos'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {canAssignTickets 
                ? 'Visualize todos os chamados e atribua responsáveis'
                : 'Visualize e responda os chamados atribuídos a você'}
            </p>
          </div>

          {/* Card de Filtros */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                    <SelectItem value="mes">Este mês</SelectItem>
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
                <Label>Prioridade</Label>
                <Select value={filters.prioridade} onValueChange={(v) => setFilters({...filters, prioridade: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={filters.departamento} onValueChange={(v) => setFilters({...filters, departamento: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos Departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos Departamentos</SelectItem>
                    <SelectItem value="contabilidade">Contabilidade/Societário</SelectItem>
                    <SelectItem value="icms_ipi">ICMS/IPI</SelectItem>
                    <SelectItem value="irpj_csll">IRPJ/CSLL</SelectItem>
                    <SelectItem value="pis_cofins">PIS/COFINS</SelectItem>
                    <SelectItem value="produtor_rural">Produtor Rural PF</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={filters.area} onValueChange={(v) => setFilters({...filters, area: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas Áreas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Áreas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>ID do Chamado</Label>
                <Input 
                  placeholder="Buscar por ID"
                  value={filters.searchId}
                  onChange={(e) => setFilters({...filters, searchId: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-2 h-10">
                <Checkbox 
                  id="urgentes"
                  checked={mostrarUrgentes}
                  onCheckedChange={(checked) => setMostrarUrgentes(checked === true)}
                />
                <Label htmlFor="urgentes" className="text-sm cursor-pointer">
                  Apenas urgentes (&lt; 2 dias)
                </Label>
              </div>

              <Button 
                variant="outline"
                onClick={() => {
                  resetFilters();
                  setMostrarUrgentes(false);
                }}
              >
                Limpar Filtros
              </Button>

              <div className="text-sm text-muted-foreground">
                {filteredAndSortedTickets.length} de {tickets.length} chamados
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredAndSortedTickets.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {tickets.length === 0 
                  ? (canAssignTickets ? 'Nenhum chamado encontrado.' : 'Você não possui chamados atribuídos no momento.')
                  : 'Nenhum chamado encontrado com os filtros selecionados.'}
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors min-w-[200px]"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center">
                          Título
                          {getSortIcon('title')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('id')}
                      >
                        <div className="flex items-center">
                          ID
                          {getSortIcon('id')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('department')}
                      >
                        <div className="flex items-center">
                          Departamento
                          {getSortIcon('department')}
                        </div>
                      </TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('created_by')}
                      >
                        <div className="flex items-center">
                          Cliente
                          {getSortIcon('created_by')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('updated_at')}
                      >
                        <div className="flex items-center">
                          Última Atualização
                          {getSortIcon('updated_at')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('prazo')}
                      >
                        <div className="flex items-center">
                          Prazo
                          {getSortIcon('prazo')}
                        </div>
                      </TableHead>
                      {canAssignTickets && (
                        <TableHead>Responsável</TableHead>
                      )}
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('activity_status')}
                      >
                        <div className="flex items-center">
                          Atividade
                          {getSortIcon('activity_status')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedTickets.map((ticket, index) => (
                      <TableRow 
                        key={ticket.id}
                        className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                      >
                        <TableCell>
                          <Badge className={statusColors[ticket.status]}>
                            {statusLabels[ticket.status] || ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/equipe/chamados/${ticket.id}`)}
                              className="text-left font-medium text-primary hover:underline focus:outline-none"
                            >
                              {ticket.title}
                            </button>
                            {ticket.attachment_count && ticket.attachment_count > 0 && (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                <Paperclip className="h-3 w-3" />
                                {ticket.attachment_count}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {ticket.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {departmentLabels[ticket.department] || ticket.department || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {ticket.estrutura_area_id ? areaMap.get(ticket.estrutura_area_id) || '—' : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {ticket.profiles 
                              ? `${ticket.profiles.first_name} ${ticket.profiles.last_name}`
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.updated_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const prazo = calcularPrazoResposta(
                              ticket.created_at, 
                              ticket.updated_at,
                              ticket.status, 
                              ticket.activity_status
                            );
                            
                            if (prazo.tipo === 'concluido') {
                              return (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                  Concluído
                                </Badge>
                              );
                            }
                            
                            if (prazo.tipo === 'aguardando_cliente') {
                              return (
                                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                                  Aguardando Cliente
                                </Badge>
                              );
                            }
                            
                            if (prazo.tipo === 'expirado') {
                              return (
                                <Badge className="bg-red-500 text-white animate-pulse hover:bg-red-500">
                                  ⚠️ ATRASADO {Math.abs(prazo.dias || 0)}d
                                </Badge>
                              );
                            }
                            
                            if (prazo.prazoHoje) {
                              return (
                                <Badge className="bg-orange-500 text-white hover:bg-orange-500">
                                  HOJE ({prazo.horas}h)
                                </Badge>
                              );
                            }
                            
                            if (prazo.tipo === 'urgente') {
                              return (
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                  Amanhã ({prazo.horas}h)
                                </Badge>
                              );
                            }
                            
                            if (prazo.tipo === 'atencao') {
                              return (
                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                  {prazo.dias} dias
                                </Badge>
                              );
                            }
                            
                            return (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                {prazo.dias} dias
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        {canAssignTickets && (
                          <TableCell>
                            <Select
                              value={ticket.assigned_to || 'none'}
                              onValueChange={(v) => assignAgent(ticket.id, v === 'none' ? null : v)}
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
                        )}
                        <TableCell>
                          {ticket.activity_status && (
                            <Badge 
                              variant="outline" 
                              className={activityColors[ticket.activity_status] || 'bg-gray-100 text-gray-800'}
                            >
                              {activityLabels[ticket.activity_status] || ticket.activity_status}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
