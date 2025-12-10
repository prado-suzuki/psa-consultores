import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { format, isToday, isWithinInterval, subDays, startOfMonth, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

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
  profiles?: Profile;
  agent?: Profile;
}

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'status' | 'title' | 'id' | 'department' | 'created_by' | 'agent' | 'updated_at' | 'activity_status' | null;

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

const priorityColors: Record<string, string> = {
  baixa: 'bg-gray-400',
  normal: 'bg-blue-400',
  alta: 'bg-orange-400',
  urgente: 'bg-red-500',
};

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

export default function AdminChamados() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState({
    periodo: 'todas',
    status: 'todos',
    estado: 'todos',
    prioridade: 'todas',
    departamento: 'todos',
    searchId: '',
  });

  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      // Fetch team members and admins who can be assigned tickets
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['team_member', 'admin']);

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        setAgents(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, title, description, status, priority, department, user_id, created_at, updated_at, assigned_to, activity_status')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch profiles for creators
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      // Fetch profiles for agents
      const agentIds = ticketsData?.filter(t => t.assigned_to).map(t => t.assigned_to as string) || [];
      const uniqueAgentIds = [...new Set(agentIds)];
      const { data: agentsData } = uniqueAgentIds.length > 0 
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', uniqueAgentIds)
        : { data: [] };

      const profilesMap = new Map<string, Profile>();
      profilesData?.forEach(p => profilesMap.set(p.id, p));
      
      const agentsMap = new Map<string, Profile>();
      agentsData?.forEach(a => agentsMap.set(a.id, a));
      
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
        profiles: profilesMap.get(ticket.user_id),
        agent: ticket.assigned_to ? agentsMap.get(ticket.assigned_to) : undefined
      })) || [];

      setTickets(enrichedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
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
            return isToday(ticketDate);
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

    // Filtro por estado
    if (filters.estado !== 'todos') {
      filtered = filtered.filter(t => t.status === filters.estado);
    }

    // Filtro por prioridade
    if (filters.prioridade !== 'todas') {
      filtered = filtered.filter(t => t.priority === filters.prioridade);
    }

    // Filtro por departamento
    if (filters.departamento !== 'todos') {
      filtered = filtered.filter(t => t.department === filters.departamento);
    }

    // Filtro por ID
    if (filters.searchId) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(filters.searchId.toLowerCase())
      );
    }

    // Ordenação
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
          case 'agent':
            aVal = `${a.agent?.first_name || ''} ${a.agent?.last_name || ''}`.toLowerCase();
            bVal = `${b.agent?.first_name || ''} ${b.agent?.last_name || ''}`.toLowerCase();
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

      fetchTickets();
    } catch (error) {
      toast({
        title: 'Erro ao atribuir agente',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const toggleTicketSelection = (ticketId: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedTickets.size === filteredAndSortedTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredAndSortedTickets.map(t => t.id)));
    }
  };

  const resetFilters = () => {
    setFilters({
      periodo: 'todas',
      status: 'todos',
      estado: 'todos',
      prioridade: 'todas',
      departamento: 'todos',
      searchId: '',
    });
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Chamados</h1>
            <p className="text-muted-foreground mt-2">
              Visualize e responda todos os chamados dos clientes
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
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.estado} onValueChange={(v) => setFilters({...filters, estado: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os estados</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_andamento">Em Progresso</SelectItem>
                    <SelectItem value="em_espera">Em Espera</SelectItem>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                <Label>ID do Chamado</Label>
                <Input 
                  placeholder="Buscar por ID"
                  value={filters.searchId}
                  onChange={(e) => setFilters({...filters, searchId: e.target.value})}
                />
              </div>

              <Button 
                variant="outline"
                onClick={resetFilters}
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
                Nenhum chamado encontrado com os filtros selecionados.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedTickets.size === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0}
                          onCheckedChange={toggleAllSelection}
                        />
                      </TableHead>
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
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('created_by')}
                      >
                        <div className="flex items-center">
                          Criado por
                          {getSortIcon('created_by')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors min-w-[180px]"
                        onClick={() => handleSort('agent')}
                      >
                        <div className="flex items-center">
                          Agente
                          {getSortIcon('agent')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('updated_at')}
                      >
                        <div className="flex items-center">
                          Last Modified
                          {getSortIcon('updated_at')}
                        </div>
                      </TableHead>
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
                          <Checkbox
                            checked={selectedTickets.has(ticket.id)}
                            onCheckedChange={() => toggleTicketSelection(ticket.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[ticket.status]}>
                            {statusLabels[ticket.status] || ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => navigate(`/admin/chamados/${ticket.id}`)}
                            className="text-left font-medium text-primary hover:underline focus:outline-none"
                          >
                            {ticket.title}
                          </button>
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
                            {ticket.profiles 
                              ? `${ticket.profiles.first_name} ${ticket.profiles.last_name}`
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.assigned_to || 'unassigned'}
                            onValueChange={(value) => assignAgent(ticket.id, value === 'unassigned' ? null : value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Selecionar agente" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Não atribuído</SelectItem>
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.first_name} {agent.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
